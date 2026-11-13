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
  constructor(msg: string, public status = 502, public codigo: "limite-dia" | "limite-minuto" | "config" | "erro" = "erro", public tentarEm = 0) {
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

/** Usa o modelo principal; se a cota diária dele acabar, tenta o modelo leve e avisa. */
export async function gerarTexto(sistema: string, texto: string): Promise<{ texto: string; modelo: string; aviso: string }> {
  try {
    return { texto: await chamar(MODELO_PRINCIPAL, sistema, texto), modelo: MODELO_PRINCIPAL, aviso: "" };
  } catch (e) {
    if (e instanceof ErroGemini && e.codigo === "limite-dia" && MODELO_RESERVA !== MODELO_PRINCIPAL) {
      try {
        const t = await chamar(MODELO_RESERVA, sistema, texto);
        return { texto: t, modelo: MODELO_RESERVA, aviso: `A cota gratuita diária do ${MODELO_PRINCIPAL} acabou. Usei o ${MODELO_RESERVA}, mais leve. A cota volta à meia-noite do Pacífico (5h em Brasília).` };
      } catch (e2) {
        if (e2 instanceof ErroGemini && e2.codigo === "limite-dia") {
          throw new ErroGemini("As cotas gratuitas diárias do Gemini acabaram. Elas voltam à meia-noite do Pacífico (5h em Brasília).", 429, "limite-dia");
        }
        throw e2;
      }
    }
    throw e;
  }
}
