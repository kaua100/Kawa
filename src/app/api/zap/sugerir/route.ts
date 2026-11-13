import Anthropic from "@anthropic-ai/sdk";
import { usuarioDaRequisicao } from "@/lib/autenticar";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELO = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

interface Msg {
  de_mim: boolean;
  texto: string;
}

/** Sugere a próxima resposta da conversa no WhatsApp, no tom do vendedor, para ele revisar antes de enviar. */
export async function POST(req: Request) {
  if (!(await usuarioDaRequisicao(req))) return Response.json({ erro: "Faça login." }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ erro: "A IA não está configurada (ANTHROPIC_API_KEY)." }, { status: 503 });
  const { historico, empresa, nicho, vendedor, etapa, preco } = (await req.json().catch(() => ({}))) as {
    historico?: Msg[];
    empresa?: string;
    nicho?: string;
    vendedor?: string;
    etapa?: string;
    preco?: string;
  };
  const msgs = (historico ?? []).filter((m) => m && typeof m.texto === "string").slice(-20);
  if (!msgs.length) return Response.json({ erro: "A conversa ainda não tem mensagens." }, { status: 400 });

  const conversa = msgs.map((m) => `${m.de_mim ? "Eu" : "Cliente"}: ${m.texto.slice(0, 1200)}`).join("\n");
  const sistema = `Você ajuda ${vendedor || "um vendedor"} da Mindstrat, que cria sites para negócios locais, a responder clientes no WhatsApp.
Escreva só a próxima mensagem do vendedor, em português do Brasil, curta (até 3 frases), natural e sem cara de robô.
Conduza a conversa para o próximo passo (entender a necessidade, mostrar o modelo, passar o valor ou fechar).
Não invente dados, preços ou promessas que não estejam no contexto. Sem saudação repetida se a conversa já começou. Sem emojis em excesso.`;
  const contexto = [
    empresa && `Empresa: ${empresa}`,
    nicho && `Nicho: ${nicho}`,
    etapa && `Etapa no funil: ${etapa}`,
    preco && `Valor sugerido do site: ${preco}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await new Anthropic().messages.create({
      model: MODELO,
      max_tokens: 400,
      system: sistema,
      messages: [{ role: "user", content: `${contexto}\n\nConversa até agora:\n${conversa}\n\nEscreva a próxima mensagem do vendedor.` }],
    });
    const texto = r.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    return Response.json({ texto });
  } catch {
    return Response.json({ erro: "A IA não respondeu agora. Tente de novo." }, { status: 502 });
  }
}
