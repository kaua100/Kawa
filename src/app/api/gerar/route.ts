import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { usuarioDaRequisicao } from "@/lib/autenticar";
import { montarMensagem, SYSTEM_PROMPT } from "@/lib/prompt";
import type { PedidoGeracao } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELO = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

export async function POST(req: Request) {
  if (!(await usuarioDaRequisicao(req))) {
    return NextResponse.json({ erro: "Sua sessão expirou. Entre de novo." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { erro: "Configure a variável ANTHROPIC_API_KEY (arquivo .env.local ou nas variáveis de ambiente da Vercel)." },
      { status: 500 },
    );
  }

  let pedido: PedidoGeracao;
  try {
    pedido = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  if (!pedido?.acao || !pedido.segmento || !pedido.servico || !pedido.objetivo) {
    return NextResponse.json({ erro: "Faltam dados para gerar o script." }, { status: 400 });
  }
  if (pedido.acao !== "gerar" && !pedido.textoBase) {
    return NextResponse.json({ erro: "Faltou o texto base." }, { status: 400 });
  }

  try {
    const client = new Anthropic();
    const resposta = await client.messages.create({
      model: MODELO,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: montarMensagem(pedido) }],
    });
    const texto = resposta.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return NextResponse.json({ texto });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("Erro na Claude API:", msg);
    return NextResponse.json({ erro: `Não foi possível gerar agora: ${msg}` }, { status: 502 });
  }
}
