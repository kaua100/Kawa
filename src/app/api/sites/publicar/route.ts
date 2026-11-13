import { usuarioDaRequisicao } from "@/lib/autenticar";
import { supabaseDoUsuario, tokenDaRequisicao } from "@/lib/omni";
import { ErroVercel, nomeDeProjeto, publicarSite, vercelConfigurada, type Arquivo } from "@/lib/vercelDeploy";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Midia {
  url: string;
  tipo: "imagem" | "video";
}

/** Publica o site do projeto na Vercel e guarda o link público no projeto. */
export async function POST(req: Request) {
  const userId = await usuarioDaRequisicao(req);
  if (!userId) return Response.json({ erro: "Faça login." }, { status: 401 });
  if (!vercelConfigurada()) return Response.json({ erro: "Falta a variável VERCEL_TOKEN no servidor.", codigo: "config" }, { status: 503 });
  const { projetoId } = (await req.json().catch(() => ({}))) as { projetoId?: string };
  if (!/^[0-9a-f-]{36}$/.test(String(projetoId))) return Response.json({ erro: "Projeto inválido." }, { status: 400 });

  const sb = supabaseDoUsuario(tokenDaRequisicao(req));
  const { data: p, error } = await sb.from("site_projetos").select("id,nome,dados,midias,html,vercel_projeto").eq("id", projetoId).maybeSingle();
  if (error || !p) return Response.json({ erro: "Projeto não encontrado." }, { status: 404 });
  if (!String(p.html || "").trim()) return Response.json({ erro: "Gere o site antes de publicar." }, { status: 400 });

  // As mídias saem do armazenamento do projeto (Supabase) e vão junto, na pasta assets/.
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sites/`;
  let html = String(p.html);
  const arquivos: Arquivo[] = [];
  let n = 0;
  let total = 0;
  try {
    for (const m of (p.midias as Midia[]) ?? []) {
      if (!m?.url?.startsWith(base) || !html.includes(m.url)) continue;
      const r = await fetch(m.url, { signal: AbortSignal.timeout(45000) });
      if (!r.ok) return Response.json({ erro: "Uma das mídias do site não pôde ser lida. Remova e envie de novo." }, { status: 502 });
      const buf = Buffer.from(await r.arrayBuffer());
      total += buf.length;
      if (total > 90 * 1024 * 1024) return Response.json({ erro: "As mídias passam de 90 MB. Remova alguns vídeos." }, { status: 400 });
      const ext = (m.url.split("?")[0].split(".").pop() || (m.tipo === "video" ? "mp4" : "jpg")).toLowerCase().slice(0, 5);
      const caminho = `assets/${m.tipo === "video" ? "video" : "foto"}-${String(++n).padStart(2, "0")}.${ext}`;
      arquivos.push({ caminho, conteudo: buf });
      html = html.split(m.url).join(caminho);
    }
    arquivos.unshift({ caminho: "index.html", conteudo: Buffer.from(html, "utf8") });

    const empresa = String((p.dados as { empresa?: string })?.empresa || p.nome);
    const r = await publicarSite(nomeDeProjeto(empresa, p.id), arquivos, p.vercel_projeto);
    const agora = new Date().toISOString();
    await sb.from("site_projetos").update({ publicado_url: r.url, publicado_em: agora, vercel_projeto: r.projetoVercel }).eq("id", p.id);
    console.log(`sites/publicar ok ${r.url} arquivos=${arquivos.length}`);
    return Response.json({ url: r.url, publicadoEm: agora });
  } catch (e) {
    console.error(`sites/publicar falhou: ${e instanceof Error ? e.message : "erro"}`);
    if (e instanceof ErroVercel) return Response.json({ erro: e.message }, { status: e.status });
    return Response.json({ erro: "Não consegui publicar agora. Tente de novo." }, { status: 502 });
  }
}
