import { createHmac, timingSafeEqual } from "node:crypto";

export const igual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Assinatura da Omni: HMAC-SHA256 de "t\ntopic\npartition\noffset\ncorpo", com tolerância de 5 minutos. */
export function assinaturaValida(h: Headers, corpo: Buffer, segredo: string, agora = Date.now()) {
  const sig = h.get("x-webhook-signature") || "";
  const t = /(?:^|,)\s*t=(\d+)/.exec(sig)?.[1];
  const v1 = /(?:^|,)\s*v1=([0-9a-f]+)/i.exec(sig)?.[1];
  const chave = h.get("x-idempotency-key") || "";
  const partes = chave.split(":");
  if (!t || !v1 || partes.length < 3) return false;
  const offset = partes.pop()!;
  const partition = partes.pop()!;
  const topic = partes.join(":");
  if (Math.abs(agora / 1000 - Number(t)) > 300) return false;
  const canonica = Buffer.concat([Buffer.from(`${t}\n${topic}\n${partition}\n${offset}\n`), corpo]);
  const esperado = createHmac("sha256", segredo).update(canonica).digest("hex");
  return igual(esperado, v1.toLowerCase());
}

