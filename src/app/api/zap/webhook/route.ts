import { timingSafeEqual } from "node:crypto";
import { supabasePublico } from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function segredoValido(recebido: string) {
  const certo = process.env.ZAPI_WEBHOOK_SECRET || "";
  const a = Buffer.from(recebido);
  const b = Buffer.from(certo);
  return certo.length >= 24 && a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Webhook da Z-API: mensagens recebidas e enviadas, status (entregue, lida) e conexão.
 * Só aceita chamadas com o segredo configurado. Responde rápido com 200, como a Z-API espera.
 */
export async function POST(req: Request) {
  const s = new URL(req.url).searchParams.get("s") || "";
  if (!segredoValido(s)) return Response.json({ ok: false }, { status: 401 });

  const evento = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!evento || typeof evento !== "object" || typeof evento.type !== "string") return Response.json({ ok: true, ignorado: true });

  const { data, error } = await supabasePublico().rpc("zap_evento", { p_segredo: s, p_evento: evento });
  if (error) {
    console.error("webhook zap: falha ao gravar evento", evento.type, error.code);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true, resultado: data });
}

export function GET() {
  return Response.json({ ok: true });
}
