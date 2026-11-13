import { usuarioDaRequisicao } from "@/lib/autenticar";
import { ErroGemini, gerarTexto } from "@/lib/gemini";
import { descreverDados, descreverEstilo, descreverMidias, limparHtml, SISTEMA_EDITAR, SISTEMA_GERAR, type DadosSite, type EstiloSite, type MidiaSite } from "@/lib/sitePrompt";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Pedido {
  modo: "gerar" | "editar";
  dados: DadosSite;
  estilo: EstiloSite;
  midias: MidiaSite[];
  html?: string;
  pedido?: string;
}

/** Gera o site do zero ou aplica uma mudança pedida no chat. Sempre devolve o HTML completo. */
export async function POST(req: Request) {
  if (!(await usuarioDaRequisicao(req))) return Response.json({ erro: "Faça login." }, { status: 401 });
  const p = (await req.json().catch(() => null)) as Pedido | null;
  if (!p?.dados?.empresa?.trim()) return Response.json({ erro: "Informe pelo menos o nome da empresa." }, { status: 400 });
  const midias = (p.midias ?? []).filter((m) => /^https:\/\//.test(m.url)).slice(0, 30);

  let sistema: string;
  let texto: string;
  if (p.modo === "editar") {
    if (!p.html?.trim() || !p.pedido?.trim()) return Response.json({ erro: "Escreva o que quer mudar." }, { status: 400 });
    if (p.html.length > 300000) return Response.json({ erro: "O site está grande demais para editar com a IA." }, { status: 400 });
    sistema = SISTEMA_EDITAR;
    texto = `PEDIDO DO USUÁRIO:\n${p.pedido.trim().slice(0, 4000)}\n\nDADOS DA EMPRESA (fonte dos fatos):\n${descreverDados(p.dados)}\n\nESTILO ESCOLHIDO:\n${descreverEstilo(p.estilo)}\n\nMÍDIAS DISPONÍVEIS (use só estas URLs):\n${descreverMidias(midias)}\n\nHTML ATUAL:\n${p.html}`;
  } else {
    sistema = SISTEMA_GERAR;
    texto = `Crie o site desta empresa.\n\nDADOS DA EMPRESA:\n${descreverDados(p.dados)}\n\nESTILO:\n${descreverEstilo(p.estilo)}\n\nMÍDIAS DISPONÍVEIS (use só estas URLs, as melhores em destaque):\n${descreverMidias(midias)}`;
  }

  try {
    const r = await gerarTexto(sistema, texto);
    return Response.json({ html: limparHtml(r.texto), modelo: r.modelo, aviso: r.aviso });
  } catch (e) {
    if (e instanceof ErroGemini) return Response.json({ erro: e.message, codigo: e.codigo }, { status: e.status });
    return Response.json({ erro: e instanceof Error ? e.message : "Erro ao gerar o site." }, { status: 502 });
  }
}
