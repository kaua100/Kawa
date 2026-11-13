import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente da Z-API Omni (https://developer.omni.z-api.io).
 * Credenciais só no servidor:
 *   OMNI_SECRET_KEY  — Secret Key (Authorization: Bearer) de toda chamada à API
 *   OMNI_CHANNEL_ID  — ID do canal WhatsApp Web (Z_API_WHATSAPP)
 *   ZAPI_WEBHOOK_SECRET — token que a Omni envia em cada aviso para o painel
 */
const BASE = "https://api.omni.z-api.io";

export const omniConfigurada = () => Boolean(process.env.OMNI_SECRET_KEY);
export const tokenWebhook = () => process.env.ZAPI_WEBHOOK_SECRET || "";

export class ErroOmni extends Error {
  constructor(msg: string, public status = 502, public subCode = "") {
    super(msg);
  }
}

/** Texto de erro da Omni, sem repassar o objeto (que pode ter dados internos). */
function textoErro(b: Record<string, unknown>, status: number): string {
  const e = b.error as { errors?: { description?: string }[] } | string | number | undefined;
  if (typeof e === "object" && e?.errors?.[0]?.description) return e.errors[0].description;
  if (typeof b.message === "string") return b.message;
  if (typeof e === "string") return e;
  return `erro ${status}`;
}

export async function omni<T = Record<string, unknown>>(caminho: string, metodo: "GET" | "POST" | "PUT" = "GET", corpo?: unknown): Promise<T> {
  if (!omniConfigurada()) throw new ErroOmni("A Secret Key da Omni não está configurada no servidor.", 503);
  let r: Response;
  try {
    r = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${process.env.OMNI_SECRET_KEY}`, "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new ErroOmni("Não consegui falar com a Omni. Tente de novo em instantes.");
  }
  const b = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    const sub = typeof b.subCode === "string" ? b.subCode : "";
    throw new ErroOmni(`Omni: ${textoErro(b, r.status)}`, r.status === 401 ? 502 : r.status, sub);
  }
  return b as T;
}

/** Supabase agindo como o usuário logado (respeita o RLS). */
export function supabaseDoUsuario(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Supabase sem login, usado só pelo webhook (as funções do banco exigem o token). */
export function supabasePublico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
}

export const tokenDaRequisicao = (req: Request) => (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

/** Canal: a variável OMNI_CHANNEL_ID manda; sem ela, usa o canal criado pelo painel. Também confere se o usuário é o dono. */
export async function canalDoUsuario(token: string, userId: string): Promise<string> {
  const { data } = await supabaseDoUsuario(token).from("zap_conexao").select("canal_id,user_id").eq("id", 1).maybeSingle();
  if (data?.user_id && data.user_id !== userId) throw new ErroOmni("Este WhatsApp pertence a outro usuário do painel.", 403);
  return process.env.OMNI_CHANNEL_ID || data?.canal_id || "";
}

export function numeroZap(tel: string): string {
  let d = (tel || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d.length >= 12 && d.length <= 13 ? d : "";
}

export function respostaErro(e: unknown) {
  const status = e instanceof ErroOmni ? e.status : 500;
  const erro = e instanceof Error ? e.message : "Erro inesperado";
  return Response.json({ erro, codigo: e instanceof ErroOmni && e.subCode === "CHANNEL_DISCONNECTED" ? "desconectado" : undefined }, { status: status >= 400 && status < 600 ? status : 502 });
}

/**
 * Registra (uma vez) o webhook padrão do workspace apontando para o painel,
 * com assinatura HMAC ligada. O segredo HMAC só vem nessa resposta: fica guardado no banco.
 */
export async function garantirWebhook(token: string) {
  const sb = supabaseDoUsuario(token);
  const segredo = tokenWebhook();
  if (segredo.length < 24) throw new ErroOmni("Falta a variável ZAPI_WEBHOOK_SECRET no servidor.", 503);
  const { error: e1 } = await sb.rpc("zap_assumir", { p_segredo: segredo });
  if (e1) throw new ErroOmni(e1.message, 409);
  const { data: ja } = await sb.rpc("zap_webhook_registrado");
  if (ja) return;
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  if (!base.startsWith("https://")) throw new ErroOmni("Falta a variável APP_URL com o endereço https do painel.", 503);
  const w = await omni<{ id?: string; secret?: string | null }>("/v1/default-instance-webhooks", "POST", {
    url: `${base}/api/zap/webhook`,
    events: ["MESSAGE_RECEIVED", "CONNECTED", "DISCONNECTED"],
    description: "Mindstrat Prospector",
    signing: true,
    auth: { type: "BEARER", token: segredo },
    payloadFormat: "DEFAULT",
  });
  if (!w.id) throw new ErroOmni("A Omni não confirmou o webhook.");
  const { error: e2 } = await sb.rpc("zap_salvar_webhook", { p_webhook_id: w.id, p_hmac: w.secret ?? null });
  if (e2) throw new ErroOmni(e2.message, 500);
}
