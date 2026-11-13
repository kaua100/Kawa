import { usuarioDaRequisicao } from "@/lib/autenticar";
import { canalDoUsuario, omni, respostaErro, supabaseDoUsuario, tokenDaRequisicao } from "@/lib/omni";

export const runtime = "nodejs";

/**
 * Cria o canal WhatsApp Web na Omni (POST /v1/channels), uma única vez.
 * Se já existe canal (variável ou criado antes), não cria outro: cada canal é cobrado.
 */
export async function POST(req: Request) {
  const userId = await usuarioDaRequisicao(req);
  if (!userId) return Response.json({ erro: "Faça login." }, { status: 401 });
  const token = tokenDaRequisicao(req);
  try {
    const existente = await canalDoUsuario(token, userId);
    if (existente) return Response.json({ id: existente, criado: false });

    const r = await omni<{ id?: string }>("/v1/channels", "POST", { name: "Conecta Prospector", type: "Z_API_WHATSAPP" });
    if (!r.id) return Response.json({ erro: "A Omni não devolveu o ID do canal." }, { status: 502 });
    const { error } = await supabaseDoUsuario(token).rpc("zap_salvar_canal", { p_canal: r.id });
    return Response.json({ id: r.id, criado: true, salvo: !error });
  } catch (e) {
    return respostaErro(e);
  }
}
