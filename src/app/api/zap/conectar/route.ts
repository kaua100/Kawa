import { usuarioDaRequisicao } from "@/lib/autenticar";
import { respostaErro, supabaseDoUsuario, tokenDaRequisicao, zapi, zapiConfigurada } from "@/lib/zapi";

export const runtime = "nodejs";

/**
 * Prepara a conexão: este usuário passa a ser o dono do número
 * e a Z-API recebe o endereço do webhook (mensagens recebidas, enviadas, status e conexão).
 * O QR Code vem em seguida pela rota de status.
 */
export async function POST(req: Request) {
  if (!(await usuarioDaRequisicao(req))) return Response.json({ erro: "Faça login." }, { status: 401 });
  if (!zapiConfigurada()) return Response.json({ erro: "A Z-API ainda não está configurada no servidor." }, { status: 503 });
  try {
    const segredo = process.env.ZAPI_WEBHOOK_SECRET!;
    const { error } = await supabaseDoUsuario(tokenDaRequisicao(req)).rpc("zap_assumir", { p_segredo: segredo });
    if (error) return Response.json({ erro: error.message }, { status: 409 });

    const base = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
    await zapi("update-every-webhooks", "PUT", { value: `${base}/api/zap/webhook?s=${encodeURIComponent(segredo)}`, notifySentByMe: true });
    return Response.json({ ok: true });
  } catch (e) {
    return respostaErro(e);
  }
}
