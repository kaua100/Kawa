import { usuarioDaRequisicao } from "@/lib/autenticar";
import { respostaErro, supabaseDoUsuario, tokenDaRequisicao, zapi, zapiConfigurada } from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status real da conexão na Z-API. Com { qr: true }, também traz o QR Code quando ainda não está conectado. */
export async function POST(req: Request) {
  if (!(await usuarioDaRequisicao(req))) return Response.json({ erro: "Faça login." }, { status: 401 });
  if (!zapiConfigurada()) return Response.json({ configurado: false, conectado: false });
  const { qr } = (await req.json().catch(() => ({}))) as { qr?: boolean };
  try {
    const st = await zapi<{ connected?: boolean; error?: string; smartphoneConnected?: boolean }>("status");
    const conectado = Boolean(st.connected);
    let numero = "";
    let nome = "";
    let imagem = "";
    if (conectado) {
      try {
        const dev = await zapi<{ phone?: string; name?: string }>("device");
        numero = String(dev.phone ?? "");
        nome = String(dev.name ?? "");
      } catch {
        /* número fica em branco se a Z-API não responder */
      }
    } else if (qr) {
      try {
        const q = await zapi<{ value?: string }>("qr-code/image");
        imagem = typeof q.value === "string" && q.value.startsWith("data:image") ? q.value : "";
      } catch {
        /* o QR pode demorar alguns segundos para ficar disponível */
      }
    }
    await supabaseDoUsuario(tokenDaRequisicao(req)).rpc("zap_marcar", { p_conectado: conectado, p_numero: numero, p_nome: nome });
    return Response.json(
      {
        configurado: true,
        conectado,
        celularOnline: st.smartphoneConnected ?? null,
        detalhe: conectado ? "" : st.error ?? "",
        numero,
        nome,
        qr: imagem,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return respostaErro(e);
  }
}
