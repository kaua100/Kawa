"use client";

import { useMemo, useState } from "react";
import { avisar } from "@/lib/api";
import { dataCurta, hojeISO, proximoEfetivo, qualificar, reais, sugerirPreco } from "@/lib/acoes";
import { SEGMENTOS, STATUS, segmentoPorId } from "@/lib/catalogo";
import { salvarLead, useEstado } from "@/lib/store";
import type { Lead, StatusLead } from "@/lib/types";
import { BotaoMaps, BotaoZap, SeloTemperatura } from "./AcoesRapidas";
import FormLead, { leadVazio } from "./FormLead";

type Visao = "lista" | "funil";

interface Props {
  onAbrir: (leadId: string) => void;
  onBuscar: () => void;
  visaoInicial?: Visao;
}

export default function Leads({ onAbrir, onBuscar, visaoInicial = "lista" }: Props) {
  const { leads } = useEstado();
  const [visao, setVisao] = useState<Visao>(visaoInicial);
  const [busca, setBusca] = useState("");
  const [filtroSeg, setFiltroSeg] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [soSemSite, setSoSemSite] = useState(false);
  const [ordem, setOrdem] = useState<"quentes" | "recentes" | "proximo" | "valor">("quentes");
  const [formulario, setFormulario] = useState<Lead | null>(null);

  const filtrados = useMemo(
    () =>
      leads.filter(
        (l) =>
          (!busca || `${l.empresa} ${l.cidade} ${l.responsavel}`.toLowerCase().includes(busca.toLowerCase())) &&
          (!filtroSeg || l.segmento === filtroSeg) &&
          (visao === "funil" || !filtroStatus || l.status === filtroStatus) &&
          (!soSemSite || !l.site),
      ).sort((a, b) => {
        if (ordem === "recentes") return b.criadoEm.localeCompare(a.criadoEm);
        if (ordem === "proximo") return (proximoEfetivo(a) ?? "9999").localeCompare(proximoEfetivo(b) ?? "9999");
        if (ordem === "valor") return (b.valor ?? sugerirPreco(b).sugerido) - (a.valor ?? sugerirPreco(a).sugerido);
        return qualificar(b).pontos - qualificar(a).pontos;
      }),
    [leads, busca, filtroSeg, filtroStatus, soSemSite, visao, ordem],
  );

  return (
    <>
      <div className="topo">
        <div>
          <h1>Leads</h1>
          <p>{leads.length} {leads.length === 1 ? "empresa" : "empresas"} na sua carteira</p>
        </div>
        <div className="topo-acoes">
          <div className="alternar" role="tablist" aria-label="Forma de ver os leads">
            <button role="tab" aria-selected={visao === "lista"} className={visao === "lista" ? "ativo" : ""} onClick={() => setVisao("lista")}>Lista</button>
            <button role="tab" aria-selected={visao === "funil"} className={visao === "funil" ? "ativo" : ""} onClick={() => setVisao("funil")}>Funil</button>
          </div>
          <button className="btn" onClick={onBuscar}>Buscar no Maps</button>
          <button className="btn prim" onClick={() => setFormulario(leadVazio())}>Novo lead</button>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="card vazio">
          <p className="vazio-titulo">Sua carteira está vazia.</p>
          <p>Busque empresas da sua cidade no Google Maps ou cadastre uma que você já conhece.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn prim" onClick={onBuscar}>Buscar empresas no Maps</button>
            <button className="btn" onClick={() => setFormulario(leadVazio())}>Cadastrar manualmente</button>
          </div>
        </div>
      ) : (
        <>
          <div className="filtros-barra">
            <input className="sel" placeholder="Buscar empresa, cidade ou responsável" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
            <select className="sel" value={filtroSeg} onChange={(e) => setFiltroSeg(e.target.value)} aria-label="Segmento">
              <option value="">Todos os segmentos</option>
              {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            {visao === "lista" && (
              <select className="sel" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Etapa">
                <option value="">Todas as etapas</option>
                {STATUS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            )}
            <select className="sel" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar">
              <option value="quentes">Mais quentes primeiro</option>
              <option value="valor">Maior valor primeiro</option>
              <option value="proximo">Próximo contato</option>
              <option value="recentes">Mais recentes</option>
            </select>
            <label className="check">
              <input type="checkbox" checked={soSemSite} onChange={(e) => setSoSemSite(e.target.checked)} />
              Só quem não tem site
            </label>
          </div>
          {visao === "lista" ? <Lista leads={filtrados} onAbrir={onAbrir} /> : <Funil leads={filtrados} onAbrir={onAbrir} />}
        </>
      )}

      {formulario && (
        <FormLead
          inicial={formulario}
          onFechar={() => setFormulario(null)}
          onSalvar={(l) => {
            salvarLead(l);
            setFormulario(null);
            avisar("Lead salvo");
            onAbrir(l.id);
          }}
        />
      )}
    </>
  );
}

function Proximo({ lead }: { lead: Lead }) {
  const p = proximoEfetivo(lead);
  if (!p) return null;
  const h = hojeISO();
  if (p < h) return <span className="tag vermelho">Atrasado</span>;
  if (p === h) return <span className="tag amarelo">Hoje</span>;
  return <span className="tag cinza">{dataCurta(p)}</span>;
}

function Lista({ leads, onAbrir }: { leads: Lead[]; onAbrir: (id: string) => void }) {
  if (leads.length === 0) return <div className="card vazio">Nenhum lead com esses filtros.</div>;
  return (
    <div className="card lista">
      {leads.map((l) => (
        <div
          key={l.id}
          className="linha"
          role="button"
          tabIndex={0}
          onClick={() => onAbrir(l.id)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onAbrir(l.id))}
        >
          <div className="linha-info">
            <b>{l.empresa}</b>
            <small>
              {segmentoPorId(l.segmento).nome}
              {l.cidade ? ` em ${l.cidade}` : ""}
              {!l.site ? ", sem site" : ""}
            </small>
          </div>
          <div className="linha-meta">
            <SeloTemperatura lead={l} mostrarPontos={false} />
            <span className={`etapa-pill st-${l.status}`}>{STATUS.find((s) => s.id === l.status)?.nome}</span>
            <Proximo lead={l} />
          </div>
          <div className="linha-valor">
            <strong>{reais(l.valor ?? sugerirPreco(l).sugerido)}</strong>
            <small>{l.valor ? (l.status === "fechado" ? "fechado" : "proposta") : "sugerido"}</small>
          </div>
          <div className="linha-acoes">
            <BotaoZap lead={l} compacto />
            <BotaoMaps lead={l} compacto />
          </div>
        </div>
      ))}
    </div>
  );
}

function Funil({ leads, onAbrir }: { leads: Lead[]; onAbrir: (id: string) => void }) {
  const [sobre, setSobre] = useState<StatusLead | null>(null);
  const { leads: todos } = useEstado();
  const mover = (id: string, status: StatusLead) => {
    const l = todos.find((x) => x.id === id);
    if (l && l.status !== status) salvarLead({ ...l, status });
  };

  return (
    <div className="funil">
      {STATUS.map((s) => {
        const col = leads.filter((l) => l.status === s.id);
        return (
          <section
            key={s.id}
            className={`coluna st-${s.id} ${sobre === s.id ? "sobre" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setSobre(s.id); }}
            onDragLeave={() => setSobre(null)}
            onDrop={(e) => {
              e.preventDefault();
              setSobre(null);
              mover(e.dataTransfer.getData("text/plain"), s.id);
            }}
          >
            <header>
              <h2>{s.nome}</h2>
              <span>{col.length}</span>
            </header>
            <div className="coluna-cards">
              {col.map((l) => (
                <article
                  key={l.id}
                  className="cartao"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
                  onClick={() => onAbrir(l.id)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onAbrir(l.id)}
                >
                  <div className="cartao-topo">
                    <b>{l.empresa}</b>
                    <SeloTemperatura lead={l} mostrarPontos={false} />
                  </div>
                  <small>{l.cidade || segmentoPorId(l.segmento).nome}, {reais(l.valor ?? sugerirPreco(l).sugerido)}</small>
                  <div className="cartao-pe">
                    <Proximo lead={l} />
                    <span className="cartao-acoes">
                      <BotaoZap lead={l} compacto />
                      <BotaoMaps lead={l} compacto />
                    </span>
                  </div>
                  <select
                    className="sel mover"
                    value={l.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => mover(l.id, e.target.value as StatusLead)}
                    aria-label={`Mover ${l.empresa} para outra etapa`}
                  >
                    {STATUS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </select>
                </article>
              ))}
              {col.length === 0 && <p className="coluna-vazia">Arraste um lead para cá</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
