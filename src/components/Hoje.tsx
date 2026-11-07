"use client";

import { useMemo, useState } from "react";
import { adiar, calcularMetricas, filaDeHoje, reais, sugerirPreco, sugestao, type ItemFila } from "@/lib/acoes";
import { STATUS, segmentoPorId } from "@/lib/catalogo";
import { useEstado } from "@/lib/store";
import { BotaoMaps, BotaoZap, SeloTemperatura } from "./AcoesRapidas";

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
        <p className="hoje-data">{data.charAt(0).toUpperCase() + data.slice(1)}{nome ? `, ${nome}` : ""}</p>
        <h1 className="hoje-titulo">
          <span className="hoje-num">{fila.length}</span>
          <span className="hoje-frase">{fila.length === 1 ? "empresa para chamar hoje" : "empresas para chamar hoje"}</span>
        </h1>
        {fila.length > 0 && (
          <p className="hoje-resumo">
            {retornos.length > 0 && `${retornos.length} ${retornos.length === 1 ? "retorno" : "retornos"} combinados`}
            {retornos.length > 0 && novos.length > 0 && " e "}
            {novos.length > 0 && `${novos.length} ${novos.length === 1 ? "primeiro contato" : "primeiros contatos"}`}.
            {" "}Cada botão verde abre o WhatsApp já com a mensagem certa.
          </p>
        )}
      </section>

      <button className="semana" onClick={onResultados} aria-label="Ver resultados completos">
        <span><b>{semana.chamados}</b> chamados</span>
        <span><b>{semana.reunioes}</b> {semana.reunioes === 1 ? "reunião" : "reuniões"}</span>
        <span><b>{semana.fechados}</b> {semana.fechados === 1 ? "fechado" : "fechados"}</span>
        <span><b>{reais(semana.faturado)}</b> faturado</span>
        <small>nesta semana</small>
      </button>

      <button className="funil-faixa" onClick={onFunil} aria-label="Ver funil completo">
        {STATUS.map((s) => {
          const n = leads.filter((l) => l.status === s.id).length;
          return (
            <span key={s.id} className={`faixa-item st-${s.id}`} style={{ flexGrow: Math.max(n, 0.6) }}>
              <b>{n}</b>
              <small>{s.nome}</small>
            </span>
          );
        })}
      </button>

      {fila.length === 0 ? (
        <div className="card vazio">
          <p className="vazio-titulo">{leads.length ? "Ninguém para chamar hoje." : "Comece pela sua lista de empresas."}</p>
          <p>{leads.length ? "Os retornos aparecem aqui no dia combinado. Enquanto isso, que tal buscar empresas novas?" : "Busque empresas da sua cidade no Google Maps e importe as que não têm site."}</p>
          <button className="btn prim" onClick={onBuscar}>Buscar empresas no Maps</button>
        </div>
      ) : (
        <ol className="fila">
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
  const { lead, motivo, atraso } = item;
  const { etapa, msg } = sugestao(lead);
  const selo =
    motivo === "novo" ? <span className="tag azul">Primeiro contato</span>
    : motivo === "atrasado" ? <span className="tag vermelho">{atraso === 1 ? "1 dia de atraso" : `${atraso} dias de atraso`}</span>
    : <span className="tag amarelo">Retorno de hoje</span>;

  return (
    <li
      className="fila-item"
      role="button"
      tabIndex={0}
      onClick={() => onAbrir(lead.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onAbrir(lead.id))}
    >
      <div className="fila-info">
        <div className="fila-nome">
          <b>{lead.empresa}</b>
          {selo}
          <SeloTemperatura lead={lead} mostrarPontos={false} />
        </div>
        <small>
          {segmentoPorId(lead.segmento).nome}
          {lead.cidade ? ` em ${lead.cidade}` : ""}
        </small>
        <p className="fila-msg">
          Vai enviar: {etapa.nome.toLowerCase()}, {msg.titulo.replaceAll('"', "").toLowerCase()}. Vale cerca de {reais(lead.valor ?? sugerirPreco(lead).sugerido)}.
        </p>
      </div>
      <div className="fila-acoes">
        <BotaoZap lead={lead} />
        <BotaoMaps lead={lead} compacto />
        <button
          className="btn"
          onClick={(e) => {
            e.stopPropagation();
            adiar(lead, 1);
          }}
          title="Tirar da lista de hoje e mostrar amanhã"
        >
          Amanhã
        </button>
      </div>
    </li>
  );
}
