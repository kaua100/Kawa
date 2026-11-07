"use client";

import { avisar } from "@/lib/api";
import { linkMaps, linkZap, qualificar, registrarEnvio, sugestao, temWhatsApp, textoDaMensagem, type DadosQualificacao } from "@/lib/acoes";
import { useEstado } from "@/lib/store";
import type { Lead } from "@/lib/types";
import { IcPino, IcZap } from "./Icones";

/**
 * Botão de WhatsApp em um clique: abre a conversa do lead já com a mensagem
 * certa para a etapa dele e registra o envio no histórico.
 */
export function BotaoZap({ lead, msgId, texto, rotulo, compacto }: { lead: Lead; msgId?: string; texto?: string; rotulo?: string; compacto?: boolean }) {
  const { vendedor } = useEstado();
  const id = msgId ?? sugestao(lead).msg.id;
  const corpo = texto ?? textoDaMensagem(lead, id, vendedor);
  return (
    <a
      className={`btn zap ${compacto ? "icone" : ""}`}
      href={linkZap(lead, corpo)}
      target="_blank"
      rel="noopener noreferrer"
      title={temWhatsApp(lead) ? `Abrir conversa com ${lead.empresa} já com a mensagem` : "Sem telefone válido: o WhatsApp vai pedir para você escolher o contato"}
      onClick={(e) => {
        e.stopPropagation();
        registrarEnvio(lead, id);
        avisar(`Mensagem aberta no WhatsApp. Próximo contato agendado.`);
      }}
    >
      <IcZap />
      {!compacto && <span>{rotulo ?? "WhatsApp"}</span>}
    </a>
  );
}

export function BotaoMaps({ lead, compacto }: { lead: Lead; compacto?: boolean }) {
  return (
    <a
      className={`btn ${compacto ? "icone" : ""}`}
      href={linkMaps(lead)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Ver ${lead.empresa} no Google Maps`}
      onClick={(e) => e.stopPropagation()}
    >
      <IcPino />
      {!compacto && <span>Maps</span>}
    </a>
  );
}

export function SeloTemperatura({ lead, dados, mostrarPontos = true, soBarras }: { lead?: Lead; dados?: DadosQualificacao; mostrarPontos?: boolean; soBarras?: boolean }) {
  const q = qualificar((dados ?? lead)!);
  const nome = q.temperatura === "quente" ? "Quente" : q.temperatura === "morno" ? "Morno" : "Frio";
  const barras = q.temperatura === "quente" ? 3 : q.temperatura === "morno" ? 2 : 1;
  return (
    <span className={`termo t-${q.temperatura}`} title={q.motivos.length ? q.motivos.join("\n") : "Poucos sinais de interesse"}>
      <span className="termo-barras" aria-hidden>
        {[1, 2, 3].map((i) => <i key={i} className={i <= barras ? "on" : ""} />)}
      </span>
      {soBarras ? <span className="sr">{nome}</span> : <>{nome}{mostrarPontos ? ` ${q.pontos}` : ""}</>}
    </span>
  );
}

const CORES = ["#2f7bff", "#19a34a", "#e07b39", "#7c5cc4", "#e2483d", "#0ea5a4", "#c89400", "#db2777"];

/** Círculo com as iniciais da empresa, cor fixa por nome. */
export function Avatar({ nome }: { nome: string }) {
  const limpo = nome.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter((p) => p.length > 2 || /\d/.test(p));
  const ini = ((limpo[0]?.[0] ?? nome[0] ?? "?") + (limpo[1]?.[0] ?? "")).toUpperCase();
  let h = 0;
  for (const ch of nome) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return <span className="avatar" style={{ background: CORES[h % CORES.length] }} aria-hidden>{ini}</span>;
}
