import { usuarioDaRequisicao } from "@/lib/autenticar";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Pedido {
  fonte: "maps" | "instagram";
  mapa?: string;
  busca?: string; // "Nome da empresa, Cidade" quando não há link do Maps
  instagram?: string;
  token?: string;
  quantidade?: number;
}

interface Midia {
  url: string;
  tipo: "imagem" | "video";
  origem: "maps" | "instagram";
  descricao?: string;
}

type Item = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Roda um ator da Apify e espera os itens (até 4 minutos). Usa a conta Apify do usuário. */
async function rodar(ator: string, input: unknown, token: string): Promise<Item[]> {
  const r = await fetch(`https://api.apify.com/v2/acts/${ator}/run-sync-get-dataset-items?timeout=240&clean=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(280000),
  });
  const b = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = str((b as { error?: { message?: string } })?.error?.message) || `erro ${r.status}`;
    if (r.status === 401) throw new Error("Token da Apify inválido.");
    if (r.status === 402 || /credit|limit|usage|quota/i.test(msg)) throw new Error("A conta da Apify está sem crédito gratuito este mês.");
    if (r.status === 408) throw new Error("A Apify demorou demais. Tente de novo.");
    throw new Error(`Apify: ${msg}`);
  }
  return Array.isArray(b) ? (b as Item[]) : [];
}

export async function POST(req: Request) {
  if (!(await usuarioDaRequisicao(req))) return Response.json({ erro: "Faça login." }, { status: 401 });
  const p = (await req.json().catch(() => null)) as Pedido | null;
  const token = p?.token?.trim() || process.env.APIFY_TOKEN || "";
  if (!token) return Response.json({ erro: "Adicione um token da Apify na tela de busca." }, { status: 400 });
  const qtd = Math.min(Math.max(Number(p?.quantidade) || 12, 1), 30);

  try {
    const midias: Midia[] = [];
    if (p?.fonte === "maps") {
      const mapa = str(p.mapa);
      if (!mapa && !str(p.busca)) return Response.json({ erro: "O lead não tem link do Maps nem endereço." }, { status: 400 });
      const input = /^https:\/\/(www\.)?google\.[a-z.]+\/maps|^https:\/\/maps\.google|^https:\/\/maps\.app\.goo\.gl/.test(mapa)
        ? { startUrls: [{ url: mapa }], maxImages: qtd, maxCrawledPlacesPerSearch: 1, language: "pt-BR" }
        : { searchStringsArray: [str(p.busca)], maxCrawledPlacesPerSearch: 1, maxImages: qtd, language: "pt-BR" };
      const itens = await rodar("compass~crawler-google-places", input, token);
      for (const it of itens.slice(0, 1)) {
        const urls = Array.isArray(it.imageUrls) ? (it.imageUrls as unknown[]).map(str) : [];
        const capa = str(it.imageUrl);
        for (const u of [capa, ...urls]) if (u.startsWith("https://") && !midias.some((m) => m.url === u)) midias.push({ url: u, tipo: "imagem", origem: "maps" });
      }
    } else if (p?.fonte === "instagram") {
      const usuario = str(p.instagram).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").split(/[/?#]/)[0];
      if (!/^[A-Za-z0-9._]{1,30}$/.test(usuario)) return Response.json({ erro: "Instagram do lead inválido." }, { status: 400 });
      const itens = await rodar("apify~instagram-scraper", { directUrls: [`https://www.instagram.com/${usuario}/`], resultsType: "posts", resultsLimit: qtd, addParentData: false }, token);
      for (const it of itens) {
        const legenda = str(it.caption).slice(0, 140);
        const video = str(it.videoUrl);
        if (video.startsWith("https://")) midias.push({ url: video, tipo: "video", origem: "instagram", descricao: legenda });
        const imgs = [str(it.displayUrl), ...(Array.isArray(it.images) ? (it.images as unknown[]).map(str) : [])];
        for (const u of imgs) if (u.startsWith("https://") && !midias.some((m) => m.url === u)) midias.push({ url: u, tipo: "imagem", origem: "instagram", descricao: legenda });
      }
    } else {
      return Response.json({ erro: "Fonte inválida." }, { status: 400 });
    }
    return Response.json({ midias: midias.slice(0, 40) });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Erro ao buscar mídias." }, { status: 502 });
  }
}
