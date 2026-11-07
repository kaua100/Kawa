import { NextResponse } from "next/server";
import { usuarioDaRequisicao } from "@/lib/autenticar";

export const runtime = "nodejs";

export interface Encontrado {
  nome: string;
  telefone: string;
  site: string;
  endereco: string;
  cidade: string;
  nota: number | null;
  avaliacoes: number | null;
  categoria: string;
  instagram: string;
  mapa: string;
}

type Item = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

function mapear(i: Item): Encontrado {
  const insta = Array.isArray(i.instagrams) ? str(i.instagrams[0]) : "";
  const handle = insta.match(/instagram\.com\/([^/?#]+)/i)?.[1];
  const cidade = str(i.city);
  const estado = str(i.state);
  return {
    nome: str(i.title),
    telefone: str(i.phone) || str(i.phoneUnformatted),
    site: str(i.website),
    endereco: str(i.address) || [str(i.street), cidade].filter(Boolean).join(", "),
    cidade: cidade ? `${cidade}${estado ? `/${siglaUF(estado)}` : ""}` : "",
    nota: typeof i.totalScore === "number" ? i.totalScore : null,
    avaliacoes: typeof i.reviewsCount === "number" ? i.reviewsCount : null,
    categoria: str(i.categoryName),
    instagram: handle ? `@${handle}` : "",
    mapa: str(i.url),
  };
}

const UFS: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapá: "AP", amazonas: "AM", bahia: "BA", ceará: "CE", "distrito federal": "DF",
  "espírito santo": "ES", goiás: "GO", maranhão: "MA", "mato grosso": "MT", "mato grosso do sul": "MS",
  "minas gerais": "MG", pará: "PA", paraíba: "PB", paraná: "PR", pernambuco: "PE", piauí: "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS", rondônia: "RO", roraima: "RR",
  "santa catarina": "SC", "são paulo": "SP", sergipe: "SE", tocantins: "TO",
};
function siglaUF(e: string) {
  if (e.length === 2) return e.toUpperCase();
  return UFS[e.toLowerCase().replace(/^state of /, "")] ?? e;
}

/** Consulta o andamento da busca e, quando termina, devolve as empresas encontradas. */
export async function POST(req: Request) {
  if (!(await usuarioDaRequisicao(req))) {
    return NextResponse.json({ erro: "Sua sessão expirou. Entre de novo." }, { status: 401 });
  }
  const c = (await req.json().catch(() => null)) as { runId?: string; token?: string } | null;
  const token = c?.token?.trim() || process.env.APIFY_TOKEN || "";
  if (!token || !c?.runId || !/^[A-Za-z0-9]+$/.test(c.runId)) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const auth = { Authorization: `Bearer ${token}` };

  const r = await fetch(`https://api.apify.com/v2/actor-runs/${c.runId}`, { headers: auth });
  const run = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json({ erro: run?.error?.message || "Não consegui consultar a busca." }, { status: 502 });

  const status: string = run.data.status;
  if (status === "READY" || status === "RUNNING") return NextResponse.json({ status: "rodando" });
  if (status !== "SUCCEEDED") {
    return NextResponse.json({ status: "falhou", erro: `A busca terminou com status ${status} na Apify.` });
  }

  const d = await fetch(
    `https://api.apify.com/v2/datasets/${run.data.defaultDatasetId}/items?clean=true&format=json`,
    { headers: auth },
  );
  const itens = (await d.json().catch(() => [])) as Item[];
  const encontrados = (Array.isArray(itens) ? itens : []).map(mapear).filter((e) => e.nome);
  return NextResponse.json({ status: "pronto", encontrados });
}
