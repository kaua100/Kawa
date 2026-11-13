import { usuarioDaRequisicao } from "@/lib/autenticar";
import { supabaseDoUsuario, tokenDaRequisicao } from "@/lib/omni";

export const runtime = "nodejs";
export const maxDuration = 60;

// Só baixa de CDNs do Google Maps e do Instagram (evita o servidor buscar endereços internos).
const HOSTS = [/\.googleusercontent\.com$/, /\.ggpht\.com$/, /\.cdninstagram\.com$/, /\.fbcdn\.net$/, /^streetviewpixels-pa\.googleapis\.com$/];
const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const MAX = 25 * 1024 * 1024;

/** Copia uma foto/vídeo do Maps ou Instagram para o armazenamento do projeto (os links originais expiram). */
export async function POST(req: Request) {
  const userId = await usuarioDaRequisicao(req);
  if (!userId) return Response.json({ erro: "Faça login." }, { status: 401 });
  const { url, projetoId } = (await req.json().catch(() => ({}))) as { url?: string; projetoId?: string };
  let alvo: URL;
  try {
    alvo = new URL(String(url));
  } catch {
    return Response.json({ erro: "Endereço inválido." }, { status: 400 });
  }
  if (alvo.protocol !== "https:" || !HOSTS.some((h) => h.test(alvo.hostname))) return Response.json({ erro: "Origem de mídia não permitida." }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/.test(String(projetoId))) return Response.json({ erro: "Projeto inválido." }, { status: 400 });

  try {
    const r = await fetch(alvo, { redirect: "follow", signal: AbortSignal.timeout(45000) });
    if (!r.ok) return Response.json({ erro: `A mídia não está mais disponível (erro ${r.status}). Busque de novo.` }, { status: 502 });
    const tipo = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const ext = TIPOS[tipo];
    if (!ext) return Response.json({ erro: "Tipo de arquivo não suportado." }, { status: 400 });
    const tam = Number(r.headers.get("content-length") || 0);
    if (tam > MAX) return Response.json({ erro: "Arquivo maior que 25 MB." }, { status: 400 });
    const corpo = Buffer.from(await r.arrayBuffer());
    if (corpo.length > MAX) return Response.json({ erro: "Arquivo maior que 25 MB." }, { status: 400 });

    const caminho = `${userId}/${projetoId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const sb = supabaseDoUsuario(tokenDaRequisicao(req));
    const { error } = await sb.storage.from("sites").upload(caminho, corpo, { contentType: tipo, upsert: false });
    if (error) return Response.json({ erro: `Não consegui salvar a mídia: ${error.message}` }, { status: 500 });
    const { data } = sb.storage.from("sites").getPublicUrl(caminho);
    return Response.json({ url: data.publicUrl, path: caminho, tipo: tipo.startsWith("video") ? "video" : "imagem" });
  } catch {
    return Response.json({ erro: "Não consegui baixar a mídia." }, { status: 502 });
  }
}
