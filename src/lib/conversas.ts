"use client";

import { useEffect, useSyncExternalStore } from "react";
import { adicionarContato } from "./store";
import { supabase } from "./supabase";
import type { Lead } from "./types";
import { chaveFone } from "./zap";

export interface MsgZap {
  id: number;
  telefone: string;
  nome: string | null;
  de_mim: boolean;
  texto: string;
  tipo: string;
  message_id: string | null;
  status: string | null;
  lead_id: string | null;
  momento: string;
}

interface Estado {
  carregado: boolean;
  msgs: MsgZap[];
  lidas: Record<string, string>; // chave do telefone -> momento da última mensagem vista
}

const VAZIO: Estado = { carregado: false, msgs: [], lidas: {} };
let estado: Estado = VAZIO;
const ouvintes = new Set<() => void>();
let iniciado = false;

function mudar(p: Partial<Estado>) {
  estado = { ...estado, ...p };
  ouvintes.forEach((f) => f());
}

function lerLidas(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("mindstrat:zap-lidas") || "{}");
  } catch {
    return {};
  }
}

function juntar(m: MsgZap) {
  const i = estado.msgs.findIndex((x) => x.id === m.id || (m.message_id && x.message_id === m.message_id));
  const msgs = i >= 0 ? estado.msgs.map((x, j) => (j === i ? { ...x, ...m } : x)) : [m, ...estado.msgs];
  mudar({ msgs });
}

async function iniciar() {
  if (iniciado) return;
  iniciado = true;
  estado = { ...estado, lidas: lerLidas() };
  const { data } = await supabase.from("zap_mensagens").select("*").order("momento", { ascending: false }).limit(3000);
  mudar({ carregado: true, msgs: (data as MsgZap[]) ?? [] });
  supabase
    .channel("zap-mensagens")
    .on("postgres_changes", { event: "*", schema: "public", table: "zap_mensagens" }, (p) => {
      if (p.eventType === "DELETE") return;
      juntar(p.new as MsgZap);
    })
    .subscribe();
}

/** Mostra na hora uma mensagem que acabou de ser enviada (o banco confirma em seguida pelo tempo real). */
export function mostrarEnviada(m: Omit<MsgZap, "id">) {
  juntar({ ...m, id: -Date.now() });
}

export function useConversas(): Estado {
  useEffect(() => {
    iniciar();
  }, []);
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
    () => VAZIO,
  );
}

export function marcarLida(chave: string, momento: string) {
  if ((estado.lidas[chave] ?? "") >= momento) return;
  const lidas = { ...estado.lidas, [chave]: momento };
  try {
    localStorage.setItem("mindstrat:zap-lidas", JSON.stringify(lidas));
  } catch {
    /* sem armazenamento */
  }
  mudar({ lidas });
}

export interface Conversa {
  chave: string;
  telefone: string;
  nome: string;
  ultima: MsgZap;
  naoLidas: number;
  lead?: Lead;
}

export function montarConversas(msgs: MsgZap[], lidas: Record<string, string>, leads: Lead[]): Conversa[] {
  const porFone = new Map<string, Lead>();
  leads.forEach((l) => {
    const k = chaveFone(l.telefone);
    if (k) porFone.set(k, l);
  });
  const mapa = new Map<string, Conversa>();
  for (const m of msgs) {
    const chave = chaveFone(m.telefone);
    let c = mapa.get(chave);
    if (!c) {
      const lead = (m.lead_id && leads.find((l) => l.id === m.lead_id)) || porFone.get(chave);
      c = { chave, telefone: m.telefone, nome: lead?.empresa || m.nome || "", ultima: m, naoLidas: 0, lead };
      mapa.set(chave, c);
    }
    if (m.momento > c.ultima.momento) c.ultima = m;
    if (!c.nome && m.nome) c.nome = m.nome;
    if (!m.de_mim && m.momento > (lidas[chave] ?? "")) c.naoLidas++;
  }
  return [...mapa.values()].sort((a, b) => (a.ultima.momento < b.ultima.momento ? 1 : -1));
}

/**
 * Quando um lead responde no WhatsApp, registra no histórico dele (uma vez por mensagem).
 * Assim a resposta conta nas métricas e aparece na ficha.
 */
export function useRegistrarRespostas(leads: Lead[]) {
  const { msgs, carregado } = useConversas();
  useEffect(() => {
    if (!carregado || !leads.length) return;
    let feitas: string[] = [];
    try {
      feitas = JSON.parse(localStorage.getItem("mindstrat:zap-respostas") || "[]");
    } catch {
      /* vazio */
    }
    const ja = new Set(feitas);
    const porFone = new Map(leads.map((l) => [chaveFone(l.telefone), l] as const));
    const limite = new Date(Date.now() - 2 * 86400000).toISOString();
    const novas: string[] = [];
    for (const m of msgs) {
      if (m.de_mim || !m.message_id || ja.has(m.message_id) || m.momento < limite) continue;
      const lead = porFone.get(chaveFone(m.telefone));
      if (!lead) continue;
      novas.push(m.message_id);
      if (lead.contatos.some((c) => c.data === m.momento && c.resumo.startsWith("Respondeu"))) continue;
      adicionarContato(lead.id, { data: m.momento, tipo: "whatsapp", resumo: `Respondeu: ${m.texto.slice(0, 120)}` });
    }
    if (novas.length) {
      try {
        localStorage.setItem("mindstrat:zap-respostas", JSON.stringify([...feitas, ...novas].slice(-2000)));
      } catch {
        /* sem armazenamento */
      }
    }
  }, [msgs, carregado, leads]);
}
