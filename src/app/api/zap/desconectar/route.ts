import { usuarioDaRequisicao } from "@/lib/autenticar";
import { respostaErro, supabaseDoUsuario, tokenDaRequisicao, zapi } from "@/lib/zapi";

export const runtime = "nodejs";

/** Desconecta o celular da Z-API. Para voltar, é preciso ler o QR Code de novo. */
export async function POST(req: Request) {
  if (!(await usuarioDaRequisicao(req))) return Response.json({ erro: "Faça login." }, { status: 401 });
  try {
    await zapi("disconnect");
    await supabaseDoUsuario(tokenDaRequisicao(req)).rpc("zap_marcar", { p_conectado: false, p_numero: "", p_nome: "" });
    return Response.json({ ok: true });
  } catch (e) {
    return respostaErro(e);
  }
}
