import "server-only";

/**
 * Gemini pela API do Google AI Studio (https://ai.google.dev).
 * A chave GEMINI_API_KEY fica só no servidor. Use uma chave de projeto SEM faturamento:
 * assim só existe a cota gratuita e nada é cobrado.
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
export const MODELO_PRINCIPAL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
export const MODELO_RESERVA = process.env.GEMINI_MODEL_RESERVA || "gemini-3.5-flash-lite";

export class ErroGemini extends Error {
  constructor(msg: string, public status = 502, public codigo: "limite-dia" | "limite-minuto" | "sobrecarga" | "config" | "erro" = "erro", public tentarEm = 0) {
    super(msg);
  }
}

interface RespostaGemini {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string; details?: { "@type"?: string; violations?: { quotaId?: string }[]; retryDelay?: string }[] };
}

async function chamar(modelo: string, sistema: string, texto: string): Promise<string> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new ErroGemini("Falta a variável GEMINI_API_KEY no servidor.", 503, "config");
  let r: Response;
  try {
    r = await fetch(`${BASE}/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sistema }] },
        contents: [{ role: "user", parts: [{ text: texto }] }],
        generationConfig: { maxOutputTokens: 60000, thinkingConfig: { thinkingLevel: "low" } },
      }),
      signal: AbortSignal.timeout(240000),
    });
  } catch {
    throw new ErroGemini("Não consegui falar com o Gemini. Tente de novo.");
  }
  const b = (await r.json().catch(() => ({}))) as RespostaGemini;
  if (r.status === 429) {
    const det = b.error?.details ?? [];
    const quota = det.flatMap((d) => d.violations ?? []).map((v) => v.quotaId ?? "").join(" ");
    const atraso = Number((det.find((d) => d.retryDelay)?.retryDelay ?? "").replace(/s$/, "")) || 0;
    if (/PerDay/i.test(quota)) throw new ErroGemini("Limite gratuito diário do Gemini atingido para este modelo.", 429, "limite-dia");
    throw new ErroGemini(`Limite gratuito por minuto do Gemini atingido. Tente de novo${atraso ? ` em ${Math.ceil(atraso)} segundos` : " em 1 minuto"}.`, 429, "limite-minuto", atraso);
  }
  if (r.status === 503 || r.status === 500 || b.error?.status === "UNAVAILABLE") {
    throw new ErroGemini("O Gemini está sobrecarregado agora (alta demanda no Google). Tente de novo em alguns minutos.", 503, "sobrecarga");
  }
  if (!r.ok) {
    const msg = b.error?.message || `erro ${r.status}`;
    throw new ErroGemini(r.status === 400 && /API key/i.test(msg) ? "A chave do Gemini é inválida." : `Gemini: ${msg}`, r.status === 404 ? 502 : r.status >= 500 ? 502 : 400, r.status === 400 && /API key/i.test(msg) ? "config" : "erro");
  }
  if (b.promptFeedback?.blockReason) throw new ErroGemini("O Gemini recusou o pedido. Reescreva a instrução.", 400);
  const c = b.candidates?.[0];
  const saida = (c?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  if (!saida.trim()) throw new ErroGemini("O Gemini não devolveu conteúdo. Tente de novo.");
  if (c?.finishReason === "MAX_TOKENS") throw new ErroGemini("O site ficou grande demais para uma resposta. Peça uma mudança menor.");
  return saida;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Usa o modelo principal. Se ele estiver sobrecarregado, tenta de novo uma vez;
 * se continuar (ou se a cota diária dele acabar), usa o modelo reserva e avisa.
 */
export async function gerarTexto(sistema: string, texto: string): Promise<{ texto: string; modelo: string; aviso: string }> {
  let motivo = "";
  try {
    return { texto: await chamar(MODELO_PRINCIPAL, sistema, texto), modelo: MODELO_PRINCIPAL, aviso: "" };
  } catch (e) {
    if (!(e instanceof ErroGemini)) throw e;
    if (e.codigo === "sobrecarga") {
      await espera(4000);
      try {
        return { texto: await chamar(MODELO_PRINCIPAL, sistema, texto), modelo: MODELO_PRINCIPAL, aviso: "" };
      } catch (e2) {
        if (!(e2 instanceof ErroGemini) || (e2.codigo !== "sobrecarga" && e2.codigo !== "limite-dia")) throw e2;
        motivo = e2.codigo === "sobrecarga" ? `O ${MODELO_PRINCIPAL} está sobrecarregado no Google agora.` : `A cota gratuita diária do ${MODELO_PRINCIPAL} acabou.`;
      }
    } else if (e.codigo === "limite-dia") {
      motivo = `A cota gratuita diária do ${MODELO_PRINCIPAL} acabou. Ela volta à meia-noite do Pacífico (5h em Brasília).`;
    } else {
      throw e;
    }
  }
  if (MODELO_RESERVA === MODELO_PRINCIPAL) throw new ErroGemini(motivo || "O Gemini não respondeu.", 503, "sobrecarga");
  try {
    const t = await chamar(MODELO_RESERVA, sistema, texto);
    return { texto: t, modelo: MODELO_RESERVA, aviso: `${motivo} Usei o ${MODELO_RESERVA}, mais leve. Se quiser, gere de novo mais tarde com o modelo principal.` };
  } catch (e3) {
    if (e3 instanceof ErroGemini && e3.codigo === "limite-dia") {
      throw new ErroGemini("As cotas gratuitas diárias do Gemini acabaram. Elas voltam à meia-noite do Pacífico (5h em Brasília).", 429, "limite-dia");
    }
    if (e3 instanceof ErroGemini && e3.codigo === "sobrecarga") {
      throw new ErroGemini("Os dois modelos do Gemini estão sobrecarregados no Google agora. Isso costuma passar em poucos minutos. Tente de novo daqui a pouco.", 503, "sobrecarga");
    }
    throw e3;
  }
}
