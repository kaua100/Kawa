import { usuarioDaRequisicao } from "@/lib/autenticar";
import { respostaErro, zapi } from "@/lib/zapi";

export const runtime = "nodejs";

/** Reinicia a instância na Z-API (útil quando a sessão trava). */
export async function POST(req: Request) {
  if (!(await usuarioDaRequisicao(req))) return Response.json({ erro: "Faça login." }, { status: 401 });
  try {
    await zapi("restart");
    return Response.json({ ok: true });
  } catch (e) {
    return respostaErro(e);
  }
}
