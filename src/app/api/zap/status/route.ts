import { usuarioDaRequisicao } from "@/lib/autenticar";
import { canalDoUsuario, omni, omniConfigurada, respostaErro, supabaseDoUsuario, tokenDaRequisicao } from "@/lib/omni";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Canal {
  phoneNumberConnected?: string | null;
  paymentStatus?: string;
  whatsappConnected?: boolean;
}

/** Status real do canal na Omni. O campo `connected` vem de /zapi/qr-code/image, como manda a documentação. */
export async function POST(req: Request) {
  const userId = await usuarioDaRequisicao(req);
  if (!userId) return Response.json({ erro: "Faça login." }, { status: 401 });
  const publicKey = process.env.NEXT_PUBLIC_OMNI_PUBLIC_KEY || "";
  if (!omniConfigurada()) return Response.json({ configurado: false, conectado: false, publicKey });
  const token = tokenDaRequisicao(req);
  try {
    const canal = await canalDoUsuario(token, userId);
    if (!canal) return Response.json({ configurado: true, canal: "", conectado: false, publicKey });

    const qr = await omni<{ connected?: boolean }>(`/v1/channels/${encodeURIComponent(canal)}/zapi/qr-code/image`);
    const conectado = qr.connected === true;

    // Número e assinatura: a consulta do canal pode exigir o nível ENTERPRISE (422). Sem ela, usa o número salvo pelo webhook.
    let info: Canal = {};
    try {
      info = await omni<Canal>(`/v1/channels/${encodeURIComponent(canal)}`);
    } catch {
      /* sem ENTERPRISE: segue sem esses dados */
    }
    const sb = supabaseDoUsuario(token);
    const numeroApi = (info.phoneNumberConnected || "").replace(/\D/g, "");
    await sb.rpc("zap_marcar", { p_conectado: conectado, p_numero: numeroApi, p_nome: "" });
    const { data } = await sb.from("zap_conexao").select("numero").eq("id", 1).maybeSingle();

    return Response.json(
      {
        configurado: true,
        canal,
        canalNaVariavel: Boolean(process.env.OMNI_CHANNEL_ID),
        conectado,
        numero: numeroApi || data?.numero || "",
        pagamento: info.paymentStatus ?? "",
        publicKey,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return respostaErro(e);
  }
}
