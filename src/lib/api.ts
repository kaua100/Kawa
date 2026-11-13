"use client";

import { useEffect, useState } from "react";
import { tokenAtual } from "./supabase";
import type { PedidoGeracao } from "./types";

export async function postar<T>(url: string, corpo: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await tokenAtual()}` },
    body: JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(dados.erro || "Algo deu errado. Tente de novo."), { codigo: dados.codigo as string | undefined });
  return dados as T;
}

export async function chamarIA(pedido: PedidoGeracao): Promise<string> {
  const { texto } = await postar<{ texto: string }>("/api/gerar", pedido);
  return texto;
}

export function avisar(msg: string) {
  window.dispatchEvent(new CustomEvent("aviso", { detail: msg }));
}

/* ---------- Integrações configuradas no servidor ---------- */

export interface StatusIntegracoes { ia: boolean; apify: boolean; gemini: boolean; carregado: boolean }
let cache: StatusIntegracoes | null = null;
let promessa: Promise<StatusIntegracoes> | null = null;

export function useIntegracoes(): StatusIntegracoes {
  const [s, setS] = useState<StatusIntegracoes>(cache ?? { ia: false, apify: false, gemini: false, carregado: false });
  useEffect(() => {
    if (cache) return;
    promessa ??= fetch("/api/status")
      .then((r) => r.json())
      .then((d) => (cache = { ia: !!d.ia, apify: !!d.apify, gemini: !!d.gemini, carregado: true }))
      .catch(() => (cache = { ia: false, apify: false, gemini: false, carregado: true }));
    promessa.then(setS);
  }, []);
  return s;
}
