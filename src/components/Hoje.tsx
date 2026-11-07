"use client";

import { useMemo, useState } from "react";
import { FASES, faseDoLead, oQueFazer, adiar, calcularMetricas, filaDeHoje, reais, sugerirPreco, sugestao, type ItemFila } from "@/lib/acoes";
import { STATUS, segmentoPorId } from "@/lib/catalogo";
import { useEstado } from "@/lib/store";
import { Avatar, BotaoMaps, BotaoZap, SeloTemperatura } from "./AcoesRapidas";
import { IcAmanha } from "./Icones";
import { BarraFases } from "./Leads";

const POR_PAGINA = 15;

export default function Hoje({ onAbrir, onBuscar, onFunil, onResultados }: { onAbrir: (id: string) => void; onBuscar: () => void; onFunil: () => void; onResultados: () => void }) {
  const { leads, vendedor } = useEstado();
  const semana = useMemo(() => calcularMetricas(leads, "semana"), [leads]);
  const fila = useMemo(() => filaDeHoje(leads), [leads]);
  const [limite, setLimite] = useState(POR_PAGINA);
  const data = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const nome = vendedor.trim().split(" ")[0];

  const retornos = fila.filter((i) => i.motivo !== "novo");
  const novos = fila.filter((i) => i.motivo === "novo");

  return (
    <>
      <section className="hoje-cab">
        <div className="hoje-esq">
          <p className="hoje-data">{data.charAt(0).toUpperCase() + data.slice(1)}{nome ? `, ${nome}` : ""}</p>
          <h1 className="hoje-titulo">
            <span className="hoje-num">{fila.length}</span>
            <span className="hoje-frase">{fila.length === 1 ? "para chamar hoje" : "para chamar hoje"}</span>
          </h1>
        </div>
        <button className="hoje-semana" onClick={onResultados} aria-label="Ver resultados da semana">
          <span><b>{semana.chamados}</b>chamados</span>
          <span><b>{semana.reunioes}</b>{semana.reunioes === 1 ? "reunião" : "reuniões"}</span>
          <span><b>{semana.fechados}</b>{semana.fechados === 1 ? "fechado" : "fechados"}</span>
          <span className="destaque"><b>{reais(semana.faturado)}</b>na semana</span>
        </button>
      </section>


      {fila.length === 0 ? (
        <div className="card vazio">
          <p className="vazio-titulo">{leads.length ? "Tudo em dia." : "Nenhuma empresa ainda."}</p>
          <button className="btn prim grande" onClick={onBuscar}>Buscar empresas</button>
        </div>
      ) : (
        <ol className="grade-cartoes">
          {fila.slice(0, limite).map((item) => (
            <Linha key={item.lead.id} item={item} onAbrir={onAbrir} />
          ))}
        </ol>
      )}
      {fila.length > limite && (
        <button className="btn mais" onClick={() => setLimite((n) => n + POR_PAGINA)}>
          Mostrar mais {Math.min(POR_PAGINA, fila.length - limite)}
        </button>
      )}
    </>
  );
}

function Linha({ item, onAbrir }: { item: ItemFila; onAbrir: (id: string) => void }) {
  const { lead, motivo } = item;
  const { msg } = sugestao(lead);
  const selo =
    motivo === "novo" ? <span className="tag azul">Novo</span>
    : motivo === "atrasado" ? <span className="tag vermelho">Atrasado</span>
    : <span className="tag amarelo">Retorno</span>;

  return (
    <li
      className={`cartao-lead f-${faseDoLead(lead)}`}
      role="button"
      tabIndex={0}
      onClick={() => onAbrir(lead.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onAbrir(lead.id))}
    >
      <div className="cl-topo">
        <Avatar nome={lead.empresa} />
        <div className="cl-nome">
          <b>{lead.empresa}</b>
          <small>{segmentoPorId(lead.segmento).nome}{lead.cidade ? `, ${lead.cidade.split("/")[0]}` : ""}</small>
        </div>
        <div className="cl-direita">
            <strong className="cl-valor">{reais(lead.valor ?? sugerirPreco(lead).sugerido)}</strong>
            <SeloTemperatura lead={lead} soBarras />
          </div>
      </div>
      <BarraFases lead={lead} />
          <div className="cl-base">
            <div className="cl-status">
        <span className="cl-fase">{FASES[faseDoLead(lead)].nome}</span>
        <span className={`cl-fazer p-${oQueFazer(lead).tipo}`}>{oQueFazer(lead).texto}</span>
            </div>
            <div className="cl-acoes">
        <BotaoZap lead={lead} compacto />
        <BotaoMaps lead={lead} compacto />
        <button
          className="btn icone"
          onClick={(e) => {
            e.stopPropagation();
            adiar(lead, 1);
          }}
          title="Deixar para amanhã"
          aria-label="Deixar para amanhã"
        >
          <IcAmanha />
        </button>
            </div>
          </div>
    </li>
  );
}
