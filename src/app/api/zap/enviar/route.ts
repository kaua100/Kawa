import { usuarioDaRequisicao } from "@/lib/autenticar";
import { numeroZap, respostaErro, supabaseDoUsuario, tokenDaRequisicao, zapi } from "@/lib/zapi";

export const runtime = "nodejs";

/** Envia texto pelo número conectado e grava no histórico da conversa. */
export async function POST(req: Request) {
  const userId = await usuarioDaRequisicao(req);
  if (!userId) return Response.json({ erro: "Faça login." }, { status: 401 });
  const { telefone, texto, leadId } = (await req.json().catch(() => ({}))) as { telefone?: string; texto?: string; leadId?: string };
  const phone = numeroZap(telefone ?? "");
  const message = (texto ?? "").trim();
  if (!phone) return Response.json({ erro: "Telefone inválido. Confira o número com DDD." }, { status: 400 });
  if (!message) return Response.json({ erro: "Escreva a mensagem." }, { status: 400 });
  if (message.length > 4000) return Response.json({ erro: "Mensagem muito longa." }, { status: 400 });

  try {
    const st = await zapi<{ connected?: boolean }>("status");
    if (!st.connected) return Response.json({ erro: "O WhatsApp está desconectado. Conecte de novo em Configurações.", codigo: "desconectado" }, { status: 409 });

    const r = await zapi<{ messageId?: string; zaapId?: string; id?: string }>("send-text", "POST", { phone, message });
    const messageId = r.messageId || r.id || "";
    if (!messageId) return Response.json({ erro: "A Z-API não confirmou o envio." }, { status: 502 });

    const sb = supabaseDoUsuario(tokenDaRequisicao(req));
    // Se o webhook já registrou essa mensagem, só completa o lead_id.
    const { error } = await sb
      .from("zap_mensagens")
      .upsert(
        { user_id: userId, telefone: phone, de_mim: true, texto: message, tipo: "texto", message_id: messageId, status: "SENT", lead_id: leadId ?? null },
        { onConflict: "user_id,message_id", ignoreDuplicates: false },
      );
    return Response.json({ ok: true, messageId, salvo: !error });
  } catch (e) {
    return respostaErro(e);
  }
}
