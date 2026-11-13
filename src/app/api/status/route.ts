import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Diz ao app quais integrações estão configuradas no servidor (sem expor as chaves). */
export async function GET() {
  return NextResponse.json({
    ia: Boolean(process.env.ANTHROPIC_API_KEY),
    apify: Boolean(process.env.APIFY_TOKEN),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  });
}
