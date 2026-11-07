import { createClient } from "@supabase/supabase-js";

/**
 * Usado nas rotas de API: confirma que quem chamou está logado na ferramenta.
 * Assim ninguém de fora usa a sua chave da Claude ou da Apify pelo link público.
 */
export async function usuarioDaRequisicao(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
