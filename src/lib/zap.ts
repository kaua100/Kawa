"use client";

import { useEffect, useState } from "react";
import { postar } from "./api";
import { telefoneWhatsApp } from "./prontas";
import { supabase } from "./supabase";

/** Situação do WhatsApp conectado, sempre vinda da Z-API (nada simulado). */
export interface EstadoZap {
  carregado: boolean;
  configurado: boolean;
  conectado: boolean;
  celularOnline: boolean | null;
  numero: string;
  nome: string;
  detalhe: string;
  qr: string;
  erro: string;
}

let estado: EstadoZap = { carregado: false, configurado: false, conectado: false, celularOnline: null, numero: "", nome: "", detalhe: "", qr: "", erro: "" };
const ouvintes = new Set<(e: EstadoZap) => void>();
let pedindo: Promise<EstadoZap> | null = null;
let realtimeLigado = false;

function mudar(p: Partial<EstadoZap>) {
  estado = { ...estado, ...p };
  ouvintes.forEach((f) => f(estado));
}

export async function atualizarZap(comQr = false): Promise<EstadoZap> {
  if (pedindo && !comQr) return pedindo;
  const p = postar<Partial<EstadoZap>>("/api/zap/status", { qr: comQr })
    .then((d) => {
      mudar({ carregado: true, configurado: !!d.configurado, conectado: !!d.conectado, celularOnline: d.celularOnline ?? null, numero: d.numero ?? "", nome: d.nome ?? "", detalhe: d.detalhe ?? "", qr: d.qr ?? "", erro: "" });
      return estado;
    })
    .catch((e: Error) => {
      mudar({ carregado: true, erro: e.message });
      return estado;
    })
    .finally(() => {
      if (pedindo === p) pedindo = null;
    });
  if (!comQr) pedindo = p;
  return p;
}

function ligarRealtime() {
  if (realtimeLigado) return;
  realtimeLigado = true;
  // Quando a Z-API avisa conexão ou desconexão pelo webhook, o painel confere o status na hora.
  supabase
    .channel("zap-conexao")
    .on("postgres_changes", { event: "*", schema: "public", table: "zap_conexao" }, () => atualizarZap())
    .subscribe();
}

/** vigiar: confere o status na Z-API a cada minuto (usado uma vez, no app). */
export function useZap(vigiar = false): EstadoZap {
  const [s, setS] = useState(estado);
  useEffect(() => {
    ouvintes.add(setS);
    setS(estado);
    if (!estado.carregado) atualizarZap();
    ligarRealtime();
    const t = vigiar ? setInterval(() => atualizarZap(), 60_000) : undefined;
    return () => {
      ouvintes.delete(setS);
      if (t) clearInterval(t);
    };
  }, [vigiar]);
  return s;
}

export const zapPronto = () => estado.configurado && estado.conectado;

export async function enviarPeloZap(telefone: string, texto: string, leadId?: string) {
  try {
    const r = await postar<{ ok: boolean; messageId: string }>("/api/zap/enviar", { telefone, texto, leadId });
    const { mostrarEnviada } = await import("./conversas");
    mostrarEnviada({ telefone: telefoneWhatsApp(telefone) || telefone.replace(/\D/g, ""), nome: null, de_mim: true, texto, tipo: "texto", message_id: r.messageId, status: "SENT", lead_id: leadId ?? null, momento: new Date().toISOString() });
    return r;
  } catch (e) {
    if ((e as { codigo?: string }).codigo === "desconectado") mudar({ conectado: false });
    throw e;
  }
}

/** Chave para casar números com e sem o 9 extra: DDD + últimos 8 dígitos. */
export function chaveFone(tel: string) {
  let d = (tel || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return d.length >= 10 ? d.slice(0, 2) + d.slice(-8) : d;
}

export function formatarFone(tel: string) {
  const d = (tel || "").replace(/\D/g, "");
  const n = d.startsWith("55") ? d.slice(2) : d;
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return tel;
}
