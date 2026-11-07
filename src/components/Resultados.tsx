"use client";

import { useMemo, useState } from "react";
import { calcularMetricas, reais, type Periodo } from "@/lib/acoes";
import { segmentoPorId } from "@/lib/catalogo";
import { useEstado } from "@/lib/store";

const PERIODOS: { id: Periodo; nome: string }[] = [
  { id: "semana", nome: "Esta semana" },
  { id: "mes", nome: "Este mês" },
  { id: "tudo", nome: "Desde o início" },
];

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "0%");

export default function Resultados() {
  const { leads } = useEstado();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const m = useMemo(() => calcularMetricas(leads, periodo), [leads, periodo]);
  const maxDia = Math.max(1, ...m.porDia.map((d) => d.mensagens));

  const etapas = [
    { nome: "Empresas chamadas", valor: m.chamados, extra: `${m.mensagens} ${m.mensagens === 1 ? "mensagem ou ligação" : "mensagens e ligações"}` },
    { nome: "Responderam com interesse", valor: m.responderam, extra: `${pct(m.responderam, m.chamados)} das chamadas` },
    { nome: "Reuniões marcadas", valor: m.reunioes, extra: `${pct(m.reunioes, m.chamados)} das chamadas` },
    { nome: "Propostas enviadas", valor: m.propostas, extra: `${pct(m.propostas, m.reunioes || m.chamados)} ${m.reunioes ? "das reuniões" : "das chamadas"}` },
    { nome: "Clientes fechados", valor: m.fechados, extra: `${pct(m.fechados, m.chamados)} das chamadas` },
  ];
  const topo = Math.max(1, etapas[0].valor);

  return (
    <>
      <div className="topo">
        <div>
          <h1>Resultados</h1>
          <p>Quanto você prospectou, quantas conversas viraram reunião e quanto entrou.</p>
        </div>
        <div className="alternar" role="tablist" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.id} role="tab" aria-selected={periodo === p.id} className={periodo === p.id ? "ativo" : ""} onClick={() => setPeriodo(p.id)}>
              {p.nome}
            </button>
          ))}
        </div>
      </div>

      <section className="faturado">
        <div>
          <span className="faturado-rot">Faturado</span>
          <strong className="faturado-valor">{reais(m.faturado)}</strong>
          <span className="dica">{m.fechados ? `${m.fechados} ${m.fechados === 1 ? "site fechado" : "sites fechados"}, ticket médio de ${reais(m.ticketMedio)}` : "Quando fechar um cliente, coloque o valor na ficha dele."}</span>
        </div>
        <div className="faturado-lado">
          <span className="faturado-rot">Em negociação agora</span>
          <strong>{reais(m.emNegociacao)}</strong>
          <span className="dica">Leads interessados, com reunião ou proposta. Usa o valor da proposta ou o preço sugerido.</span>
        </div>
      </section>

      <section className="card pad">
        <h2 className="secao-titulo">Do primeiro contato ao fechamento</h2>
        <ol className="conversao">
          {etapas.map((e, i) => (
            <li key={e.nome} className={`conv-${i}`}>
              <div className="conv-barra" style={{ width: `${Math.max(4, (e.valor / topo) * 100)}%` }} />
              <div className="conv-texto">
                <strong>{e.valor}</strong>
                <span>{e.nome}</span>
                <small>{e.extra}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="resultados-grade">
        <section className="card pad">
          <h2 className="secao-titulo">Contatos por dia, últimos 14 dias</h2>
          <div className="barras" role="img" aria-label="Gráfico de contatos por dia">
            {m.porDia.map((d) => (
              <div key={d.dia} className="barra-col" title={`${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}: ${d.mensagens}`}>
                <span className="barra-num">{d.mensagens || ""}</span>
                <div className="barra" style={{ height: `${(d.mensagens / maxDia) * 100}%` }} />
                <small>{d.dia.slice(8, 10)}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="card pad">
          <h2 className="secao-titulo">Por nicho</h2>
          {m.porNicho.length === 0 ? (
            <p className="dica">Os nichos aparecem aqui assim que você começar a chamar empresas.</p>
          ) : (
            <table className="tabela">
              <thead><tr><th>Nicho</th><th>Chamados</th><th>Fechados</th><th>Faturado</th></tr></thead>
              <tbody>
                {m.porNicho.map((x) => (
                  <tr key={x.segmento}>
                    <td>{segmentoPorId(x.segmento).nome}</td>
                    <td>{x.chamados}</td>
                    <td>{x.fechados}</td>
                    <td>{reais(x.faturado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
