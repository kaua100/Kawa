import { contextoZap, ETAPAS, linkWhatsApp, telefoneWhatsApp, type Etapa, type MensagemPronta } from "./prontas";
import { POTENCIAL } from "./catalogo";
import { adicionarContato, alterarLead } from "./store";
import type { Lead } from "./types";

/* ---------- Datas ---------- */

export const hojeISO = () => dataISO(new Date());
export function dataISO(d: Date) {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function somarDias(dias: number, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return dataISO(d);
}
export function diasEntre(a: string, b: string) {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
}
export function dataCurta(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/* ---------- Mensagens ---------- */

const TODAS = ETAPAS.flatMap((e) => e.mensagens.map((m) => ({ etapa: e, msg: m })));
export const mensagemPorId = (id: string) => TODAS.find((x) => x.msg.id === id) ?? TODAS[0];
export const todasMensagens = TODAS;

/* ---------- Roteiro passo a passo ---------- */

export type RotaId = "conversa" | "direto";

export interface Passo {
  msg: string;
  nome: string;
  dica: string;
}

export const ROTEIROS: Record<RotaId, { nome: string; passos: Passo[] }> = {
  conversa: {
    nome: "Conversando",
    passos: [
      { msg: "inicio-ola", nome: "Oi", dica: "Só cumprimente e espere responder." },
      { msg: "gancho-site", nome: "Puxe o assunto", dica: "Pergunte. Ainda não ofereça nada." },
      { msg: "gancho-clientes", nome: "Entenda o negócio", dica: "Deixe a pessoa falar." },
      { msg: "gancho-ideia", nome: "Mostre a ideia", dica: "Agora sim, ofereça." },
      { msg: "demo-envio", nome: "Envie o modelo", dica: "Mostre como ficaria." },
      { msg: "reuniao-convite", nome: "Marque a conversa", dica: "15 minutos, vídeo ou presencial." },
      { msg: "proposta-envio", nome: "Envie a proposta", dica: "Anexe o PDF." },
      { msg: "fechamento", nome: "Feche", dica: "Peça o material e a entrada." },
    ],
  },
  direto: {
    nome: "Direto",
    passos: [
      { msg: "primeira-direta", nome: "Apresente", dica: "Já diga o que você faz." },
      { msg: "resposta-explicar", nome: "Explique", dica: "O que o site faz por eles." },
      { msg: "demo-envio", nome: "Envie o modelo", dica: "Mostre como ficaria." },
      { msg: "proposta-envio", nome: "Envie a proposta", dica: "Anexe o PDF." },
      { msg: "fechamento", nome: "Feche", dica: "Peça o material e a entrada." },
    ],
  },
};

export const FOLLOWUPS = ["follow-2dias", "follow-semana", "follow-ultima"];

const enviadosDe = (lead: Lead) => new Set(lead.contatos.map((c) => c.msgId).filter(Boolean) as string[]);

/** Em que passo do roteiro o lead está: o primeiro que ainda não foi enviado. */
export function passoAtual(lead: Lead, rota: RotaId = lead.roteiro ?? "conversa") {
  const enviados = enviadosDe(lead);
  const passos = ROTEIROS[rota].passos;
  const i = passos.findIndex((p) => !enviados.has(p.msg));
  return { rota, indice: i === -1 ? passos.length - 1 : i, concluido: i === -1, enviados };
}

/** Lembrete para quem não respondeu: o próximo follow-up ainda não enviado. */
export function proximoLembrete(lead: Lead) {
  const enviados = enviadosDe(lead);
  return FOLLOWUPS.find((id) => !enviados.has(id)) ?? "recuperacao";
}

function diasDesdeUltimoEnvio(lead: Lead) {
  const ultimos = lead.contatos.filter((c) => c.msgId).map((c) => c.data);
  if (!ultimos.length) return null;
  const ultimo = ultimos.sort().at(-1)!;
  return diasEntre(ultimo.slice(0, 10), hojeISO());
}

/** Escolhe a mensagem que faz sentido agora, pelo roteiro, pela etapa e pelo que já foi enviado. */
export function sugestao(lead: Lead): { etapa: Etapa; msg: MensagemPronta } {
  const enviados = enviadosDe(lead);
  const primeiroNaoEnviado = (ids: string[], senao: string) => ids.find((id) => !enviados.has(id)) ?? senao;
  let id: string;
  switch (lead.status) {
    case "fechado":
      id = primeiroNaoEnviado(["fechamento", "pos-entrega", "pos-30dias", "pos-indicacao"], "pos-indicacao");
      break;
    case "perdido":
      id = "recuperacao";
      break;
    case "reuniao":
      id = primeiroNaoEnviado(["reuniao-confirmar", "proposta-envio"], "proposta-cobrar");
      break;
    case "proposta":
      id = primeiroNaoEnviado(["proposta-envio", "proposta-cobrar"], "proposta-cobrar");
      break;
    default: {
      const dias = diasDesdeUltimoEnvio(lead);
      // Mandou e a pessoa sumiu por 2 dias ou mais: lembrete. Senão, o próximo passo do roteiro.
      if (lead.status === "contatado" && dias !== null && dias >= 2) id = proximoLembrete(lead);
      else id = ROTEIROS[lead.roteiro ?? "conversa"].passos[passoAtual(lead).indice].msg;
    }
  }
  return mensagemPorId(id);
}

/** Quantos dias esperar até o próximo contato depois de cada mensagem. */
const ESPERA: Record<string, number | null> = {
  "inicio-ola": 1,
  "inicio-apresentando": 1,
  "inicio-elogio": 1,
  "gancho-site": 1,
  "gancho-clientes": 1,
  "gancho-ideia": 2,
  "primeira-direta": 2,
  "follow-2dias": 5,
  "follow-semana": 7,
  "follow-ultima": null,
  "resposta-explicar": 2,
  "resposta-preco": 2,
  "resposta-como-funciona": 2,
  "demo-envio": 2,
  "demo-cobrar": 3,
  "proposta-envio": 3,
  "proposta-cobrar": 4,
  fechamento: 3,
  "reuniao-convite": 2,
  "reuniao-confirmar": null,
  "pos-entrega": 30,
  "pos-30dias": 30,
  "pos-indicacao": null,
  recuperacao: 30,
};

export function textoDaMensagem(lead: Lead, msgId: string, vendedor: string) {
  return mensagemPorId(msgId).msg.texto(contextoZap(lead, vendedor));
}

/** Registra o envio no histórico e agenda o próximo contato. Chamado ao clicar no botão do WhatsApp. */
export function registrarEnvio(lead: Lead, msgId: string) {
  const { etapa, msg } = mensagemPorId(msgId);
  const espera = msgId in ESPERA ? ESPERA[msgId] : 3;
  adicionarContato(
    lead.id,
    {
      data: new Date().toISOString(),
      tipo: "whatsapp",
      resumo: `Enviou no WhatsApp: ${etapa.nome}, ${msg.titulo.replaceAll('"', "")}`,
      msgId,
    },
    { proximoContato: espera === null ? undefined : somarDias(espera) },
  );
}

export const linkZap = (lead: Lead, texto: string) => linkWhatsApp(lead.telefone, texto);
export const temWhatsApp = (lead: Lead) => Boolean(telefoneWhatsApp(lead.telefone));

export function linkMaps(lead: Lead) {
  if (lead.mapa) return lead.mapa;
  const q = [lead.empresa, lead.endereco, lead.cidade].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function linkTelefone(lead: Lead) {
  const d = lead.telefone.replace(/\D/g, "");
  return d ? `tel:+${d.length <= 11 ? `55${d}` : d}` : "";
}

export function linkInstagram(lead: Lead) {
  const h = lead.instagram.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  return h ? `https://instagram.com/${h}` : "";
}

export function linkSite(url: string) {
  if (!url) return "";
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

/* ---------- Fila do dia ---------- */

export type Motivo = "novo" | "retorno" | "atrasado";

/** Data em que o lead deve ser chamado de novo (ou null se não há nada agendado). */
export function proximoEfetivo(lead: Lead): string | null {
  if (lead.proximoContato) return lead.proximoContato;
  if (lead.status === "perdido" || lead.status === "fechado") return null;
  if (lead.contatos.length === 0) return lead.status === "novo" ? hojeISO() : null;
  const ultimo = lead.contatos.reduce((a, c) => (c.data > a ? c.data : a), "");
  return somarDias(3, new Date(ultimo));
}

export interface ItemFila {
  lead: Lead;
  motivo: Motivo;
  atraso: number;
}

export function filaDeHoje(leads: Lead[]): ItemFila[] {
  const hoje = hojeISO();
  const itens: ItemFila[] = [];
  for (const lead of leads) {
    const prox = proximoEfetivo(lead);
    if (!prox || prox > hoje) continue;
    const atraso = diasEntre(prox, hoje);
    const motivo: Motivo = lead.contatos.length === 0 ? "novo" : atraso > 0 ? "atrasado" : "retorno";
    itens.push({ lead, motivo, atraso });
  }
  const peso = { atrasado: 0, retorno: 1, novo: 2 };
  return itens.sort(
    (a, b) =>
      peso[a.motivo] - peso[b.motivo] ||
      b.atraso - a.atraso ||
      qualificar(b.lead).pontos - qualificar(a.lead).pontos ||
      a.lead.empresa.localeCompare(b.lead.empresa),
  );
}

export function adiar(lead: Lead, dias = 1) {
  alterarLead(lead.id, (l) => ({ ...l, proximoContato: somarDias(dias) }));
}

/* ---------- Temperatura (qualificação) ---------- */

export interface DadosQualificacao {
  site: string;
  siteStatus?: Lead["siteStatus"];
  nota?: number | null;
  avaliacoes?: number | null;
  telefone: string;
  instagram: string;
  segmento: Lead["segmento"];
  infoPublica?: string;
}

export type Temperatura = "quente" | "morno" | "frio";

export interface Qualificacao {
  pontos: number;
  temperatura: Temperatura;
  motivos: string[];
}

export function ehCelular(tel: string) {
  const n = telefoneWhatsApp(tel);
  return n.length === 13 && n[4] === "9";
}

/** Tira nota e avaliações do texto "Nota 4,8 no Google com 57 avaliações" de leads antigos. */
function lerGoogle(d: DadosQualificacao) {
  let nota = d.nota ?? null;
  let avaliacoes = d.avaliacoes ?? null;
  if ((nota === null || avaliacoes === null) && d.infoPublica) {
    const m = d.infoPublica.match(/Nota (\d[.,]\d)[^0-9]*?(?:com (\d+) avalia)?/i);
    if (m) {
      nota ??= Number(m[1].replace(",", "."));
      if (m[2]) avaliacoes ??= Number(m[2]);
    }
  }
  return { nota, avaliacoes };
}

/**
 * Quanto vale a pena chamar essa empresa agora, de 0 a 100.
 * Pesa: não ter site, ser bem avaliada e movimentada no Google, ter celular para WhatsApp,
 * ter Instagram ativo e estar num nicho que costuma investir em site.
 */
export function qualificar(d: DadosQualificacao): Qualificacao {
  const motivos: string[] = [];
  let p = 0;
  const status = d.site ? d.siteStatus ?? "ok" : "nao-encontrado";
  if (status === "nao-encontrado") { p += 30; motivos.push("Não tem site"); }
  else if (status === "desatualizado") { p += 18; motivos.push("Site desatualizado"); }

  const { nota, avaliacoes } = lerGoogle(d);
  if (nota !== null) {
    if (nota >= 4.5) { p += 15; motivos.push(`Nota ${String(nota).replace(".", ",")} no Google`); }
    else if (nota >= 4) { p += 10; motivos.push(`Nota ${String(nota).replace(".", ",")} no Google`); }
  } else p += 4;
  if (avaliacoes !== null) {
    if (avaliacoes >= 100) { p += 15; motivos.push(`${avaliacoes} avaliações, negócio movimentado`); }
    else if (avaliacoes >= 30) { p += 10; motivos.push(`${avaliacoes} avaliações`); }
    else if (avaliacoes >= 10) p += 5;
  }

  if (ehCelular(d.telefone)) { p += 12; motivos.push("Celular para WhatsApp"); }
  else if (telefoneWhatsApp(d.telefone)) p += 5;

  if (d.instagram) { p += 8; motivos.push("Tem Instagram"); }

  const pot = POTENCIAL[d.segmento] ?? 2;
  p += pot === 3 ? 20 : pot === 2 ? 12 : 5;
  if (pot === 3) motivos.push("Nicho que costuma investir em site");

  const pontos = Math.min(100, p);
  return { pontos, temperatura: pontos >= 70 ? "quente" : pontos >= 45 ? "morno" : "frio", motivos };
}

export const qualificarLead = (l: Lead) => qualificar(l);

/* ---------- Sugestão de preço ---------- */

/** Faixa de preço de partida por serviço (R$), pensando em freelancer ou agência pequena. */
export const PRECO_BASE: Record<Lead["servicoInteresse"], { min: number; max: number; mensal?: boolean; nota: string }> = {
  "landing-page": { min: 900, max: 1800, nota: "landing page de uma página" },
  site: { min: 1500, max: 3500, nota: "site institucional de 4 a 6 páginas" },
  "loja-virtual": { min: 3000, max: 7000, nota: "loja virtual com pagamento online" },
  sistema: { min: 2500, max: 6000, nota: "agenda online com painel" },
  "trafego-pago": { min: 800, max: 2000, mensal: true, nota: "gestão mensal, sem a verba de anúncios" },
};

const CIDADES_GRANDES = [
  "são paulo", "rio de janeiro", "belo horizonte", "brasília", "curitiba", "porto alegre", "salvador", "recife",
  "fortaleza", "goiânia", "campinas", "florianópolis", "vitória", "manaus", "belém", "santos", "são bernardo",
  "santo andré", "são caetano", "osasco", "guarulhos", "barueri", "niterói", "ribeirão preto", "sorocaba",
  "são josé dos campos", "joinville", "uberlândia", "londrina", "maringá", "natal", "joão pessoa", "maceió",
  "são luís", "teresina", "campo grande", "cuiabá", "aracaju",
];

export interface Preco {
  sugerido: number;
  min: number;
  max: number;
  mensal: boolean;
  fatores: string[];
}

const arredondar = (v: number) => Math.round(v / 50) * 50;

/**
 * Quanto cobrar por esse lead. Parte da faixa do serviço e ajusta pelo nicho (ticket do negócio),
 * pela cidade e pelo tamanho do negócio no Google. É uma referência para começar a conversa.
 */
export function sugerirPreco(lead: Lead): Preco {
  const base = PRECO_BASE[lead.servicoInteresse];
  const fatores: string[] = [];
  let f = 1;
  const pot = POTENCIAL[lead.segmento] ?? 2;
  if (pot === 3) { f *= 1.2; fatores.push("nicho de ticket alto (+20%)"); }
  if (pot === 1) { f *= 0.85; fatores.push("nicho de ticket menor (-15%)"); }

  const cidade = lead.cidade.toLowerCase();
  if (CIDADES_GRANDES.some((c) => cidade.includes(c))) { f *= 1.15; fatores.push("cidade grande (+15%)"); }

  const { avaliacoes, nota } = lerGoogle(lead);
  if (avaliacoes !== null && avaliacoes >= 150) { f *= 1.2; fatores.push("negócio grande no Google (+20%)"); }
  else if (avaliacoes !== null && avaliacoes >= 50) { f *= 1.1; fatores.push("negócio movimentado (+10%)"); }
  else if (avaliacoes !== null && avaliacoes < 10) { f *= 0.9; fatores.push("negócio pequeno ou novo (-10%)"); }
  if (nota !== null && nota >= 4.7 && (avaliacoes ?? 0) >= 30) { f *= 1.05; fatores.push("reputação forte (+5%)"); }

  const meio = (base.min + base.max) / 2;
  return {
    sugerido: arredondar(meio * f),
    min: arredondar(base.min * f),
    max: arredondar(base.max * f),
    mensal: Boolean(base.mensal),
    fatores,
  };
}

export const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/* ---------- Métricas ---------- */

export type Periodo = "semana" | "mes" | "tudo";

export function inicioPeriodo(p: Periodo): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "semana") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  else if (p === "mes") d.setDate(1);
  else return "";
  return d.toISOString();
}

export interface Metricas {
  mensagens: number;
  chamados: number;
  responderam: number;
  reunioes: number;
  propostas: number;
  fechados: number;
  faturado: number;
  ticketMedio: number;
  emNegociacao: number;
  porNicho: { segmento: Lead["segmento"]; chamados: number; fechados: number; faturado: number }[];
  porDia: { dia: string; mensagens: number }[];
}

export function calcularMetricas(leads: Lead[], periodo: Periodo): Metricas {
  const ini = inicioPeriodo(periodo);
  const noPeriodo = (iso?: string) => Boolean(iso) && (!ini || iso! >= ini);
  let mensagens = 0;
  const chamadosSet = new Set<string>();
  const dias = new Map<string, number>();
  const nicho = new Map<Lead["segmento"], { chamados: number; fechados: number; faturado: number }>();
  const n = (s: Lead["segmento"]) => nicho.get(s) ?? nicho.set(s, { chamados: 0, fechados: 0, faturado: 0 }).get(s)!;

  let responderam = 0, reunioes = 0, propostas = 0, fechados = 0, faturado = 0, emNegociacao = 0;

  for (const l of leads) {
    const envios = l.contatos.filter((c) => noPeriodo(c.data) && (c.tipo === "whatsapp" || c.tipo === "ligacao" || c.tipo === "instagram" || c.tipo === "email"));
    mensagens += envios.length;
    for (const c of envios) {
      const dia = c.data.slice(0, 10);
      dias.set(dia, (dias.get(dia) ?? 0) + 1);
    }
    if (envios.length) { chamadosSet.add(l.id); n(l.segmento).chamados++; }
    const m = l.marcos ?? {};
    if (noPeriodo(m.interessado)) responderam++;
    if (noPeriodo(m.reuniao)) reunioes++;
    if (noPeriodo(m.proposta)) propostas++;
    if (l.status === "fechado" && noPeriodo(m.fechado)) {
      fechados++;
      faturado += l.valor ?? 0;
      n(l.segmento).fechados++;
      n(l.segmento).faturado += l.valor ?? 0;
    }
    if (l.status === "interessado" || l.status === "reuniao" || l.status === "proposta") {
      emNegociacao += l.valor ?? sugerirPreco(l).sugerido;
    }
  }

  const porDia: Metricas["porDia"] = [];
  for (let i = 13; i >= 0; i--) {
    const dia = somarDias(-i);
    porDia.push({ dia, mensagens: dias.get(dia) ?? 0 });
  }

  return {
    mensagens,
    chamados: chamadosSet.size,
    responderam,
    reunioes,
    propostas,
    fechados,
    faturado,
    ticketMedio: fechados ? Math.round(faturado / fechados) : 0,
    emNegociacao,
    porNicho: [...nicho.entries()].map(([segmento, v]) => ({ segmento, ...v })).filter((x) => x.chamados || x.fechados).sort((a, b) => b.fechados - a.fechados || b.chamados - a.chamados),
    porDia,
  };
}
