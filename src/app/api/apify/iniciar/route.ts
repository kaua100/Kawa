import { NextResponse } from "next/server";
import { usuarioDaRequisicao } from "@/lib/autenticar";

export const runtime = "nodejs";

const ATOR = "compass~crawler-google-places"; // Google Maps Scraper da Apify

interface Corpo {
  busca: string; // ex.: "dentista"
  local: string; // ex.: "São Luís, MA"
  maximo: number;
  contatos: boolean; // buscar Instagram e e-mail no site da empresa (custa mais na Apify)
  token?: string;
}

/** Inicia a busca na Apify e devolve o id da execução. O app consulta o andamento em /api/apify/status. */
export async function POST(req: Request) {
  if (!(await usuarioDaRequisicao(req))) {
    return NextResponse.json({ erro: "Sua sessão expirou. Entre de novo." }, { status: 401 });
  }
  const c = (await req.json().catch(() => null)) as Corpo | null;
  const token = c?.token?.trim() || process.env.APIFY_TOKEN || "";
  if (!token) return NextResponse.json({ erro: "Cole o seu token da Apify para buscar." }, { status: 400 });
  if (!c?.busca?.trim() || !c.local?.trim()) {
    return NextResponse.json({ erro: "Informe o que buscar e a cidade." }, { status: 400 });
  }

  const input = {
    searchStringsArray: [c.busca.trim()],
    locationQuery: c.local.trim(),
    maxCrawledPlacesPerSearch: Math.min(Math.max(Number(c.maximo) || 20, 1), 200),
    language: "pt-BR",
    skipClosedPlaces: true,
    scrapeContacts: Boolean(c.contatos),
  };

  const r = await fetch(`https://api.apify.com/v2/acts/${ATOR}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg: string = dados?.error?.message || `A Apify respondeu com erro ${r.status}`;
    const semCredito = r.status === 402 || r.status === 403 || /limit|usage|credit|exceed|quota|plan/i.test(msg);
    const codigo = r.status === 401 ? "invalido" : semCredito ? "sem-credito" : "erro";
    return NextResponse.json(
      { erro: codigo === "invalido" ? "Token inválido" : codigo === "sem-credito" ? "Sem crédito nesta conta" : msg, codigo },
      { status: codigo === "erro" ? 502 : 400 },
    );
  }
  return NextResponse.json({ runId: dados.data.id, datasetId: dados.data.defaultDatasetId });
}
