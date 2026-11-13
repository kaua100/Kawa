import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente da Z-API (https://developer.z-api.io).
 * As credenciais ficam só no servidor, em variáveis de ambiente:
 *   ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN (token de segurança da conta, opcional)
 *   ZAPI_WEBHOOK_SECRET (segredo aleatório para validar o webhook)
 */
const BASE = "https://api.z-api.io";

export const zapiConfigurada = () => Boolean(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN && process.env.ZAPI_WEBHOOK_SECRET);

export class ErroZapi extends Error {
  constructor(msg: string, public status = 502) {
    super(msg);
  }
}

export async function zapi<T = Record<string, unknown>>(caminho: string, metodo: "GET" | "POST" | "PUT" = "GET", corpo?: unknown): Promise<T> {
  if (!zapiConfigurada()) throw new ErroZapi("A Z-API ainda não está configurada no servidor.", 503);
  const url = `${BASE}/instances/${encodeURIComponent(process.env.ZAPI_INSTANCE_ID!)}/token/${encodeURIComponent(process.env.ZAPI_TOKEN!)}/${caminho}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.ZAPI_CLIENT_TOKEN) headers["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
  let r: Response;
  try {
    r = await fetch(url, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo), cache: "no-store", signal: AbortSignal.timeout(20000) });
  } catch {
    throw new ErroZapi("Não consegui falar com a Z-API. Tente de novo em instantes.");
  }
  const dados = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok || (typeof dados.error === "string" && !("connected" in dados))) {
    const det = typeof dados.error === "string" ? dados.error : typeof dados.message === "string" ? dados.message : `erro ${r.status}`;
    // Nunca devolve URL nem token na mensagem.
    throw new ErroZapi(`Z-API: ${det}`, r.status === 401 || r.status === 403 ? 502 : r.ok ? 502 : r.status >= 500 ? 502 : 400);
  }
  return dados as T;
}

/** Supabase agindo como o usuário logado (respeita o RLS). */
export function supabaseDoUsuario(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Supabase sem login, usado só pelo webhook (a função do banco exige o segredo). */
export function supabasePublico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
}

export function tokenDaRequisicao(req: Request) {
  return (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
}

/** Número só com dígitos, com 55 na frente. */
export function numeroZap(tel: string): string {
  let d = (tel || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d.length >= 12 && d.length <= 13 ? d : "";
}

export function respostaErro(e: unknown) {
  const status = e instanceof ErroZapi ? e.status : 500;
  const erro = e instanceof Error ? e.message : "Erro inesperado";
  return Response.json({ erro }, { status });
}
