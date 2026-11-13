import { usuarioDaRequisicao } from "@/lib/autenticar";
import { canalDoUsuario, garantirWebhook, omni, respostaErro, supabaseDoUsuario, tokenDaRequisicao } from "@/lib/omni";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * QR Code do canal WhatsApp Web, pedido pela janela oficial da Omni (SDK @omnizapi/connect).
 * Só o dono logado recebe o QR do próprio canal. Na primeira vez, também registra o webhook.
 */
export async function GET(req: Request) {
  const userId = await usuarioDaRequisicao(req);
  if (!userId) return Response.json({ message: "Faça login de novo no painel." }, { status: 401 });
  const token = tokenDaRequisicao(req);
  try {
    const canal = await canalDoUsuario(token, userId);
    if (!canal) return Response.json({ message: "Crie o canal antes de conectar." }, { status: 409 });
    await garantirWebhook(token);
    const r = await omni<{ qrcode?: string; connected?: boolean }>(`/v1/channels/${encodeURIComponent(canal)}/zapi/qr-code/image`);
    if (r.connected === true) {
      await supabaseDoUsuario(token).rpc("zap_marcar", { p_conectado: true, p_numero: "", p_nome: "" });
    }
    return Response.json({ qrcode: r.qrcode ?? null, connected: r.connected === true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const r = respostaErro(e);
    const corpo = (await r.json()) as { erro?: string };
    return Response.json({ message: corpo.erro ?? null }, { status: r.status });
  }
}
