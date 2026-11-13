import "server-only";
import { createHash } from "node:crypto";

/**
 * Publica sites estáticos pela API oficial da Vercel (https://vercel.com/docs/rest-api).
 *   VERCEL_TOKEN   — token de acesso (Account Settings > Tokens), só no servidor
 *   VERCEL_TEAM_ID — time onde os projetos dos sites ficam
 * No plano Hobby não há cobrança: passou do limite, a Vercel pausa em vez de cobrar.
 */
const API = "https://api.vercel.com";

export class ErroVercel extends Error {
  constructor(msg: string, public status = 502) {
    super(msg);
  }
}

export const vercelConfigurada = () => Boolean(process.env.VERCEL_TOKEN);

const q = () => (process.env.VERCEL_TEAM_ID ? `teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "");
const comTime = (caminho: string, extra = "") => {
  const params = [q(), extra].filter(Boolean).join("&");
  return `${API}${caminho}${params ? `?${params}` : ""}`;
};

function erroDaVercel(status: number, b: { error?: { code?: string; message?: string } }): ErroVercel {
  const code = b.error?.code ?? "";
  const msg = b.error?.message ?? `erro ${status}`;
  if (status === 401 || status === 403) return new ErroVercel("O token da Vercel é inválido ou não tem acesso a este time. Gere outro em Account Settings > Tokens.", 502);
  if (status === 429 || /rate_limited|too_many/i.test(code)) return new ErroVercel("Limite de publicações da Vercel no plano gratuito atingido (100 por dia). Tente amanhã.", 429);
  if (/limit|plan/i.test(code) && /project/i.test(msg)) return new ErroVercel("A conta da Vercel chegou ao limite de projetos do plano gratuito (200). Apague sites antigos na Vercel.", 409);
  return new ErroVercel(`Vercel: ${msg}`, 502);
}

export interface Arquivo {
  caminho: string;
  conteudo: Buffer;
}

async function enviarArquivo(token: string, a: Arquivo): Promise<{ file: string; sha: string; size: number }> {
  const sha = createHash("sha1").update(a.conteudo).digest("hex");
  const r = await fetch(comTime("/v2/files"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(a.conteudo.length),
      "x-vercel-digest": sha,
    },
    body: new Uint8Array(a.conteudo),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw erroDaVercel(r.status, await r.json().catch(() => ({})));
  return { file: a.caminho, sha, size: a.conteudo.length };
}

interface Deploy {
  id: string;
  url?: string;
  alias?: string[];
  readyState?: string;
  projectId?: string;
  errorMessage?: string;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Envia os arquivos, cria o deploy de produção e espera ficar pronto. Devolve o link público. */
export async function publicarSite(nomeProjeto: string, arquivos: Arquivo[], projetoExistente?: string | null) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new ErroVercel("Falta a variável VERCEL_TOKEN no servidor.", 503);

  const files = [];
  for (const a of arquivos) files.push(await enviarArquivo(token, a));

  const corpo: Record<string, unknown> = {
    name: nomeProjeto,
    target: "production",
    files,
    projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null, devCommand: null },
  };
  if (projetoExistente) corpo.project = projetoExistente;

  const r = await fetch(comTime("/v13/deployments", "skipAutoDetectionConfirmation=1"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(60000),
  });
  const b = (await r.json().catch(() => ({}))) as Deploy & { error?: { code?: string; message?: string } };
  if (!r.ok) throw erroDaVercel(r.status, b);

  // Acompanha o deploy até ficar pronto (site estático costuma levar menos de 1 minuto).
  let d: Deploy = b;
  const limite = Date.now() + 180000;
  while (d.readyState !== "READY") {
    if (d.readyState === "ERROR" || d.readyState === "CANCELED") throw new ErroVercel(`A Vercel não conseguiu publicar: ${d.errorMessage || d.readyState}`);
    if (Date.now() > limite) throw new ErroVercel("A Vercel está demorando para publicar. Veja de novo em alguns minutos.", 504);
    await espera(3000);
    const g = await fetch(comTime(`/v13/deployments/${encodeURIComponent(b.id)}`), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const gb = (await g.json().catch(() => ({}))) as Deploy & { error?: { code?: string; message?: string } };
    if (!g.ok) throw erroDaVercel(g.status, gb);
    d = gb;
  }

  // O domínio de produção (nome.vercel.app) é público no plano gratuito; a URL do deploy pode ficar protegida.
  const aliases = (d.alias ?? []).filter((a) => a.endsWith(".vercel.app"));
  const principal = aliases.sort((a, b2) => a.length - b2.length)[0] || d.url || "";
  if (!principal) throw new ErroVercel("A Vercel publicou, mas não devolveu o endereço.");
  return { url: `https://${principal.replace(/^https?:\/\//, "")}`, projetoVercel: d.projectId || b.projectId || nomeProjeto, deployId: b.id };
}

/** Nome válido para projeto da Vercel: minúsculas, números e hífen, até 100 caracteres. */
export function nomeDeProjeto(empresa: string, id: string) {
  const base = empresa.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "site";
  return `${base}-${id.replace(/-/g, "").slice(0, 6)}`;
}
