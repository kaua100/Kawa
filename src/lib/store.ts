"use client";

import { useSyncExternalStore } from "react";
import { detectarSegmento } from "./catalogo";
import { supabase } from "./supabase";
import type { Contato, Lead, Script } from "./types";

/**
 * Estado do app em memória + gravação no Supabase.
 * A tela atualiza na hora e a gravação acontece em seguida.
 * Cada usuário só enxerga os próprios dados (regras de RLS no banco).
 */

interface Estado {
  leads: Lead[];
  scripts: Script[];
  vendedor: string;
  apifyToken: string;
  carregando: boolean;
  userId: string | null;
}

const VAZIO: Estado = { leads: [], scripts: [], vendedor: "", apifyToken: "", carregando: true, userId: null };

let estado: Estado = VAZIO;
const ouvintes = new Set<() => void>();

function mudar(novo: Partial<Estado>) {
  estado = { ...estado, ...novo };
  ouvintes.forEach((f) => f());
}

export function useEstado(): Estado {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
    () => VAZIO,
  );
}

function erroAoSalvar(e: { message: string } | null) {
  if (!e) return;
  console.error(e);
  window.dispatchEvent(new CustomEvent("aviso", { detail: `Não foi possível salvar: ${e.message}` }));
}

export const novoId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)) as string;

/* ---------- Sessão ---------- */

export async function carregarDados(userId: string) {
  mudar({ ...VAZIO, carregando: true, userId });
  const [l, s, c] = await Promise.all([
    supabase.from("leads").select("dados").order("atualizado_em", { ascending: false }),
    supabase.from("scripts").select("dados").order("atualizado_em", { ascending: false }),
    supabase.from("config").select("vendedor, apify_token").maybeSingle(),
  ]);
  erroAoSalvar(l.error ?? s.error ?? c.error);
  const carregados = (l.data ?? []).map((r) => r.dados as Lead);
  // Corrige leads importados com o nicho errado (busca feita com outro nicho selecionado).
  const corrigidos: Lead[] = [];
  const leads = carregados.map((ld) => {
    if (ld.origemLead !== "apify") return ld;
    const cat = ld.infoPublica.match(/categoria no Google: ([^;]+)/)?.[1];
    const certo = detectarSegmento(cat, ld.empresa);
    if (certo && certo !== ld.segmento) {
      const novo = { ...ld, segmento: certo };
      corrigidos.push(novo);
      return novo;
    }
    return ld;
  });
  if (corrigidos.length) {
    const agora = new Date().toISOString();
    supabase.from("leads").upsert(corrigidos.map((x) => ({ id: x.id, dados: x, atualizado_em: agora }))).then(({ error }) => erroAoSalvar(error));
  }
  mudar({
    leads,
    scripts: (s.data ?? []).map((r) => r.dados as Script),
    vendedor: c.data?.vendedor ?? "",
    apifyToken: c.data?.apify_token ?? "",
    carregando: false,
  });
}

export function limparDados() {
  mudar({ ...VAZIO, carregando: false });
}

/* ---------- Leads ---------- */

async function gravarLead(lead: Lead) {
  const { error } = await supabase
    .from("leads")
    .upsert({ id: lead.id, dados: lead, atualizado_em: new Date().toISOString() });
  erroAoSalvar(error);
}

/** Guarda a data em que o lead entrou em cada etapa, para as métricas. */
function carimbar(lead: Lead): Lead {
  const antes = estado.leads.find((l) => l.id === lead.id);
  const marcos = { ...(lead.marcos ?? {}) };
  if (!marcos[lead.status] && (!antes || antes.status !== lead.status || !antes.marcos?.[lead.status])) {
    marcos[lead.status] = new Date().toISOString();
  }
  if (lead.contatos.length && !marcos.contatado) marcos.contatado = lead.contatos[0].data;
  return { ...lead, marcos };
}

export function salvarLead(entrada: Lead) {
  const lead = carimbar(entrada);
  const existe = estado.leads.some((l) => l.id === lead.id);
  mudar({ leads: existe ? estado.leads.map((l) => (l.id === lead.id ? lead : l)) : [lead, ...estado.leads] });
  gravarLead(lead);
}

export async function salvarVariosLeads(entrada: Lead[]) {
  const novos = entrada.map(carimbar);
  mudar({ leads: [...novos, ...estado.leads] });
  const agora = new Date().toISOString();
  const { error } = await supabase.from("leads").upsert(novos.map((l) => ({ id: l.id, dados: l, atualizado_em: agora })));
  erroAoSalvar(error);
}

export function excluirLead(id: string) {
  mudar({ leads: estado.leads.filter((l) => l.id !== id) });
  supabase.from("leads").delete().eq("id", id).then(({ error }) => erroAoSalvar(error));
}

export function alterarLead(leadId: string, f: (l: Lead) => Lead) {
  const l = estado.leads.find((x) => x.id === leadId);
  if (l) salvarLead(f(l));
}

export function adicionarContato(leadId: string, contato: Omit<Contato, "id">, extra?: Partial<Lead>) {
  alterarLead(leadId, (l) => ({
    ...l,
    ...extra,
    status: l.status === "novo" ? "contatado" : l.status,
    contatos: [...l.contatos, { ...contato, id: novoId() }],
  }));
}

export function excluirContato(leadId: string, contatoId: string) {
  alterarLead(leadId, (l) => ({ ...l, contatos: l.contatos.filter((c) => c.id !== contatoId) }));
}

/* ---------- Scripts ---------- */

export function salvarScript(script: Script) {
  const existe = estado.scripts.some((s) => s.id === script.id);
  mudar({ scripts: existe ? estado.scripts.map((s) => (s.id === script.id ? script : s)) : [script, ...estado.scripts] });
  supabase
    .from("scripts")
    .upsert({ id: script.id, dados: script, atualizado_em: new Date().toISOString() })
    .then(({ error }) => erroAoSalvar(error));
}

export function excluirScript(id: string) {
  mudar({ scripts: estado.scripts.filter((s) => s.id !== id) });
  supabase.from("scripts").delete().eq("id", id).then(({ error }) => erroAoSalvar(error));
}

/* ---------- Configurações ---------- */

let timerConfig: ReturnType<typeof setTimeout> | undefined;
function gravarConfig() {
  clearTimeout(timerConfig);
  timerConfig = setTimeout(async () => {
    const { error } = await supabase.from("config").upsert({
      user_id: estado.userId,
      vendedor: estado.vendedor,
      apify_token: estado.apifyToken,
      atualizado_em: new Date().toISOString(),
    });
    erroAoSalvar(error);
  }, 600);
}

export function definirVendedor(nome: string) {
  mudar({ vendedor: nome });
  gravarConfig();
}

export function definirApifyToken(token: string) {
  mudar({ apifyToken: token.trim() });
  gravarConfig();
}

/* ---------- Backup ---------- */

export function exportarDados(): string {
  return JSON.stringify({ leads: estado.leads, scripts: estado.scripts, vendedor: estado.vendedor }, null, 2);
}

export async function importarDados(json: string) {
  const dados = JSON.parse(json);
  if (!Array.isArray(dados.leads) || !Array.isArray(dados.scripts)) throw new Error("Arquivo inválido");
  const idsLeads = new Set(estado.leads.map((l) => l.id));
  const idsScripts = new Set(estado.scripts.map((s) => s.id));
  const agora = new Date().toISOString();
  const leads = (dados.leads as Lead[]).filter((l) => !idsLeads.has(l.id));
  const scripts = (dados.scripts as Script[]).filter((s) => !idsScripts.has(s.id));
  mudar({ leads: [...leads, ...estado.leads], scripts: [...scripts, ...estado.scripts] });
  if (leads.length) erroAoSalvar((await supabase.from("leads").upsert(leads.map((l) => ({ id: l.id, dados: l, atualizado_em: agora })))).error);
  if (scripts.length) erroAoSalvar((await supabase.from("scripts").upsert(scripts.map((s) => ({ id: s.id, dados: s, atualizado_em: agora })))).error);
}
