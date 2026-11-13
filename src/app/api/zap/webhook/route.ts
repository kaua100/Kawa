import { gunzipSync } from "node:zlib";
import { assinaturaValida, igual } from "@/lib/omni-assinatura";
import { supabasePublico, tokenWebhook } from "@/lib/omni";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook padrão do workspace na Omni: mensagens recebidas e eventos de conexão.
 * Valida o token Bearer e a assinatura HMAC antes de gravar qualquer coisa.
 */
export async function POST(req: Request) {
  const token = tokenWebhook();
  const recebido = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (token.length < 24 || !igual(recebido, token)) return Response.json({ ok: false }, { status: 401 });

  let corpo = Buffer.from(await req.arrayBuffer());
  if ((req.headers.get("content-encoding") || "").toLowerCase() === "gzip") {
    try {
      corpo = gunzipSync(corpo);
    } catch {
      /* já veio descompactado */
    }
  }

  const sb = supabasePublico();
  const { data: hmac, error: eh } = await sb.rpc("zap_hmac", { p_segredo: token });
  if (eh) return Response.json({ ok: false }, { status: 401 });
  if (hmac && !assinaturaValida(req.headers, corpo, String(hmac))) return Response.json({ ok: false }, { status: 401 });

  let evento: unknown;
  try {
    evento = JSON.parse(corpo.toString("utf8"));
  } catch {
    return Response.json({ ok: true, ignorado: true });
  }
  if (!evento || typeof evento !== "object") return Response.json({ ok: true, ignorado: true });

  const { data, error } = await sb.rpc("zap_evento", { p_segredo: token, p_evento: evento });
  if (error) {
    console.error("webhook omni: falha ao gravar", error.code);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true, resultado: data });
}

export function GET() {
  return Response.json({ ok: true });
}
