"use client";

import JSZip from "jszip";
import { segmentoPorId } from "./catalogo";
import { telefoneWhatsApp } from "./prontas";
import { supabase } from "./supabase";
import type { Lead } from "./types";

export interface DadosSite {
  empresa: string;
  segmento: string;
  cidade: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  instagram: string;
  site: string;
  mapa: string;
  nota: string;
  descricao: string;
  servicos: string;
}

export interface EstiloSite {
  corPrimaria: string;
  corSecundaria: string;
  corFundo: string;
  estilo: string;
  fonte: string;
  secoes: string[];
}

export interface MidiaSite {
  url: string;
  tipo: "imagem" | "video";
  origem: "maps" | "instagram" | "upload";
  path?: string;
  descricao?: string;
}

export interface MsgChat {
  autor: "eu" | "ia";
  texto: string;
  quando: string;
}

export interface ProjetoSite {
  id: string;
  lead_id: string | null;
  nome: string;
  dados: DadosSite;
  estilo: EstiloSite;
  midias: MidiaSite[];
  chat: MsgChat[];
  html: string;
  atualizado_em: string;
  publicado_url?: string | null;
  publicado_em?: string | null;
}

export const ESTILOS: { nome: string; cores: [string, string, string]; fonte: string }[] = [
  { nome: "Moderno", cores: ["#1f2a44", "#2f7bff", "#ffffff"], fonte: "Sans moderna (ex.: Inter, Manrope)" },
  { nome: "Elegante", cores: ["#1c1917", "#b08d57", "#faf7f2"], fonte: "Serifa nos títulos (ex.: Playfair Display) e sans no texto" },
  { nome: "Minimalista", cores: ["#111111", "#111111", "#ffffff"], fonte: "Sans limpa e espaçada" },
  { nome: "Vibrante", cores: ["#5b21b6", "#f59e0b", "#fffbeb"], fonte: "Sans arredondada e forte nos títulos" },
  { nome: "Escuro premium", cores: ["#0b0d12", "#22c55e", "#0b0d12"], fonte: "Sans geométrica, títulos grandes" },
];

export const SECOES = ["Topo com chamada principal", "Sobre a empresa", "Serviços", "Galeria de fotos", "Avaliação no Google", "Como chegar (mapa)", "Contato e WhatsApp", "Perguntas frequentes"];
export const SECOES_PADRAO = ["Topo com chamada principal", "Sobre a empresa", "Serviços", "Galeria de fotos", "Como chegar (mapa)", "Contato e WhatsApp"];

export const estiloPadrao = (): EstiloSite => ({
  corPrimaria: ESTILOS[0].cores[0],
  corSecundaria: ESTILOS[0].cores[1],
  corFundo: ESTILOS[0].cores[2],
  estilo: ESTILOS[0].nome,
  fonte: ESTILOS[0].fonte,
  secoes: [...SECOES_PADRAO],
});

export const dadosVazios = (): DadosSite => ({ empresa: "", segmento: "", cidade: "", endereco: "", telefone: "", whatsapp: "", instagram: "", site: "", mapa: "", nota: "", descricao: "", servicos: "" });

/** Usa tudo o que o lead já tem (vindo da Apify ou cadastrado à mão). */
export function dadosDoLead(l: Lead): DadosSite {
  const nota = l.nota != null ? `${String(l.nota).replace(".", ",")}${l.avaliacoes ? ` com ${l.avaliacoes} avaliações` : ""}` : "";
  return {
    empresa: l.empresa,
    segmento: segmentoPorId(l.segmento)?.nome ?? "",
    cidade: l.cidade.replace("/", " - "),
    endereco: l.endereco ?? "",
    telefone: l.telefone,
    whatsapp: telefoneWhatsApp(l.telefone),
    instagram: l.instagram,
    site: l.site,
    mapa: l.mapa ?? "",
    nota,
    descricao: [l.infoPublica, l.responsavel ? `Responsável: ${l.responsavel}` : ""].filter(Boolean).join("\n"),
    servicos: "",
  };
}

const COLUNAS = "id,lead_id,nome,dados,estilo,midias,chat,html,atualizado_em,publicado_url,publicado_em";

export async function listarProjetos(): Promise<ProjetoSite[]> {
  const { data, error } = await supabase.from("site_projetos").select(COLUNAS).order("atualizado_em", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data as ProjetoSite[]) ?? [];
}

export async function criarProjeto(nome: string, dados: DadosSite, leadId: string | null): Promise<ProjetoSite> {
  const { data, error } = await supabase
    .from("site_projetos")
    .insert({ nome, dados, estilo: estiloPadrao(), lead_id: leadId })
    .select(COLUNAS)
    .single();
  if (error) throw new Error(error.message);
  return data as ProjetoSite;
}

export async function salvarProjeto(p: ProjetoSite) {
  const { error } = await supabase
    .from("site_projetos")
    .update({ nome: p.nome, dados: p.dados, estilo: p.estilo, midias: p.midias, chat: p.chat.slice(-60), html: p.html, atualizado_em: new Date().toISOString() })
    .eq("id", p.id);
  if (error) throw new Error(error.message);
}

export async function apagarProjeto(p: ProjetoSite) {
  const paths = p.midias.map((m) => m.path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from("sites").remove(paths);
  const { error } = await supabase.from("site_projetos").delete().eq("id", p.id);
  if (error) throw new Error(error.message);
}

const TIPOS_OK = /^(image\/(jpeg|png|webp|gif|avif|svg\+xml)|video\/(mp4|webm|quicktime))$/;

/** Envia uma imagem/vídeo seu para o armazenamento do projeto. */
export async function enviarArquivo(projetoId: string, f: File): Promise<MidiaSite> {
  if (!TIPOS_OK.test(f.type)) throw new Error(`${f.name}: formato não suportado.`);
  if (f.size > 25 * 1024 * 1024) throw new Error(`${f.name}: maior que 25 MB.`);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Faça login de novo.");
  const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const path = `${u.user.id}/${projetoId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("sites").upload(path, f, { contentType: f.type, upsert: false });
  if (error) throw new Error(`${f.name}: ${error.message}`);
  const { data } = supabase.storage.from("sites").getPublicUrl(path);
  return { url: data.publicUrl, tipo: f.type.startsWith("video") ? "video" : "imagem", origem: "upload", path };
}

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "site";

/**
 * Monta o ZIP: index.html, pasta assets/ com as mídias do projeto (baixadas do armazenamento)
 * e um LEIA-ME com o passo a passo para publicar na Vercel. Não publica nada.
 */
export async function baixarZip(p: ProjetoSite) {
  if (!p.html.trim()) throw new Error("Gere o site antes de baixar.");
  const zip = new JSZip();
  let html = p.html;
  const usadas = p.midias.filter((m) => html.includes(m.url));
  let n = 0;
  for (const m of usadas) {
    const r = await fetch(m.url);
    if (!r.ok) throw new Error("Uma das mídias não pôde ser baixada. Tente de novo.");
    const blob = await r.blob();
    const ext = (m.url.split("?")[0].split(".").pop() || (m.tipo === "video" ? "mp4" : "jpg")).toLowerCase().slice(0, 5);
    const nome = `assets/${m.tipo === "video" ? "video" : "foto"}-${String(++n).padStart(2, "0")}.${ext}`;
    zip.file(nome, blob);
    html = html.split(m.url).join(nome);
  }
  zip.file("index.html", html);
  zip.file(
    "LEIA-ME.txt",
    `Site: ${p.dados.empresa || p.nome}

Arquivos
- index.html: a página completa
- assets/: fotos e vídeos usados no site

Como publicar na Vercel (manual)
1. Descompacte este ZIP.
2. Acesse vercel.com e entre na sua conta.
3. Clique em "Add New..." > "Project" e importe a pasta (pelo GitHub ou arrastando os arquivos com a Vercel CLI: "npx vercel" dentro da pasta).
4. Não precisa configurar build: é um site estático (Framework: Other, sem comando de build).
5. Depois de publicar, em Settings > Domains, ligue o domínio da empresa.

Antes de publicar, confira se a empresa autorizou o uso das fotos e vídeos.
`,
  );
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(p.dados.empresa || p.nome)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return usadas.length;
}
