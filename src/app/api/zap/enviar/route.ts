import { usuarioDaRequisicao } from "@/lib/autenticar";
import { canalDoUsuario, numeroZap, omni, respostaErro, supabaseDoUsuario, tokenDaRequisicao } from "@/lib/omni";

export const runtime = "nodejs";

/** Envia texto pelo canal WhatsApp Web da Omni e grava no histórico da conversa. */
export async function POST(req: Request) {
  const userId = await usuarioDaRequisicao(req);
  if (!userId) return Response.json({ erro: "Faça login." }, { status: 401 });
  const { telefone, texto, leadId } = (await req.json().catch(() => ({}))) as { telefone?: string; texto?: string; leadId?: string };
  const phone = numeroZap(telefone ?? "");
  const message = (texto ?? "").trim();
  if (!phone) return Response.json({ erro: "Telefone inválido. Confira o número com DDD." }, { status: 400 });
  if (!message) return Response.json({ erro: "Escreva a mensagem." }, { status: 400 });
  if (message.length > 4000) return Response.json({ erro: "Mensagem muito longa." }, { status: 400 });

  const token = tokenDaRequisicao(req);
  try {
    const canal = await canalDoUsuario(token, userId);
    if (!canal) return Response.json({ erro: "Conecte o WhatsApp em Configurações.", codigo: "desconectado" }, { status: 409 });

    const r = await omni<{ messageId?: string }>(`/v1/channels/${encodeURIComponent(canal)}/messages`, "POST", {
      recipient: { identifier: phone },
      content: { type: "TEXT", body: { message } },
    });
    if (!r.messageId) return Response.json({ erro: "A Omni não confirmou o envio." }, { status: 502 });

    const { error } = await supabaseDoUsuario(token)
      .from("zap_mensagens")
      .upsert(
        { user_id: userId, telefone: phone, de_mim: true, texto: message, tipo: "texto", message_id: r.messageId, status: "SENT", lead_id: leadId ?? null },
        { onConflict: "user_id,message_id" },
      );
    return Response.json({ ok: true, messageId: r.messageId, salvo: !error });
  } catch (e) {
    return respostaErro(e);
  }
}
