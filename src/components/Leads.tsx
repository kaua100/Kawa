"use client";

import { useMemo, useState } from "react";
import { avisar } from "@/lib/api";
import { dataCurta, FASES, faseDoLead, hojeISO, oQueFazer, proximoEfetivo, qualificar, reais, sugerirPreco, sugestao } from "@/lib/acoes";
import { SEGMENTOS, STATUS, segmentoPorId } from "@/lib/catalogo";
import { salvarLead, useEstado } from "@/lib/store";
import type { Lead, StatusLead } from "@/lib/types";
import { Avatar, BotaoMaps, BotaoZap, SeloTemperatura } from "./AcoesRapidas";
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
          <p className="contador"><b>{leads.length}</b> {leads.length === 1 ? "empresa" : "empresas"}</p>
        </div>
        <div className="topo-acoes">
          <div className="alternar" role="tablist" aria-label="Forma de ver os leads">
            <button role="tab" aria-selected={visao === "lista"} className={visao === "lista" ? "ativo" : ""} onClick={() => setVisao("lista")}>Cards</button>
            <button role="tab" aria-selected={visao === "funil"} className={visao === "funil" ? "ativo" : ""} onClick={() => setVisao("funil")}>Fases</button>
          </div>
          <button className="btn prim" onClick={() => setFormulario(leadVazio())}>Novo lead</button>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="card vazio">
          <p className="vazio-titulo">Nenhuma empresa ainda.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn prim" onClick={onBuscar}>Buscar empresas</button>
            <button className="btn" onClick={() => setFormulario(leadVazio())}>Cadastrar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="filtros-barra">
            <input className="sel" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
            <select className="sel" value={filtroSeg} onChange={(e) => setFiltroSeg(e.target.value)} aria-label="Segmento">
              <option value="">Todos os nichos</option>
              {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            {visao === "lista" && (
              <select className="sel" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Etapa">
                <option value="">Todas as etapas</option>
                {STATUS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            )}
            <select className="sel" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar">
              <option value="quentes">Mais quentes</option>
              <option value="valor">Maior valor</option>
              <option value="proximo">Próximo contato</option>
              <option value="recentes">Mais recentes</option>
            </select>
            <label className="check">
              <input type="checkbox" checked={soSemSite} onChange={(e) => setSoSemSite(e.target.checked)} />
              Sem site
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
    <ul className="grade-cartoes">
      {leads.map((l) => (
        <li
          key={l.id}
          className={`cartao-lead f-${faseDoLead(l)}`}
          role="button"
          tabIndex={0}
          onClick={() => onAbrir(l.id)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onAbrir(l.id))}
        >
          <div className="cl-topo">
            <Avatar nome={l.empresa} />
            <div className="cl-nome">
              <b>{l.empresa}</b>
              <small>{segmentoPorId(l.segmento).nome}{l.cidade ? `, ${l.cidade.split("/")[0]}` : ""}</small>
            </div>
            <div className="cl-direita">
            <strong className="cl-valor">{reais(l.valor ?? sugerirPreco(l).sugerido)}</strong>
            <SeloTemperatura lead={l} soBarras />
          </div>
          </div>
          <BarraFases lead={l} />
          <div className="cl-base">
            <div className="cl-status">
            <span className="cl-fase">{FASES[faseDoLead(l)].nome}</span>
            <span className={`cl-fazer p-${oQueFazer(l).tipo}`}>{oQueFazer(l).texto}</span>
            </div>
            <div className="cl-acoes">
            <BotaoZap lead={l} compacto />
            <BotaoMaps lead={l} compacto />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Funil({ leads, onAbrir }: { leads: Lead[]; onAbrir: (id: string) => void }) {
  const ativos = leads.filter((l) => l.status !== "perdido");
  const perdidos = leads.length - ativos.length;
  return (
    <>
      <div className="quadro">
        {FASES.map((f, i) => {
          const col = ativos.filter((l) => faseDoLead(l) === i);
          return (
            <section key={f.id} className={`fase f-${i}`}>
              <header>
                <span className="fase-num">{i === FASES.length - 1 ? "✓" : i}</span>
                <h2>{f.nome}</h2>
                <span className="fase-qtd">{col.length}</span>
              </header>
              <div className="fase-cards">
                {col.map((l) => <CartaoFase key={l.id} lead={l} onAbrir={onAbrir} />)}
              </div>
            </section>
          );
        })}
      </div>
      {perdidos > 0 && <p className="dica" style={{ marginTop: 10 }}>{perdidos} {perdidos === 1 ? "perdido" : "perdidos"} fora do quadro</p>}
    </>
  );
}

function CartaoFase({ lead, onAbrir }: { lead: Lead; onAbrir: (id: string) => void }) {
  const fazer = oQueFazer(lead);
  const prox = sugestao(lead).msg;
  return (
    <article
      className={`cartao-fase f-${faseDoLead(lead)}`}
      onClick={() => onAbrir(lead.id)}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onAbrir(lead.id)}
    >
      <div className="cf-topo">
        <b>{lead.empresa}</b>
        <span>{reais(lead.valor ?? sugerirPreco(lead).sugerido)}</span>
      </div>
      <BarraFases lead={lead} />
      <p className={`cf-fazer p-${fazer.tipo}`}>{fazer.texto}</p>
      {fazer.tipo !== "perdido" && (
        <div className="cf-acoes">
          <span className={`cf-prox p-${fazer.tipo}`}>{fazer.tipo === "lembrete" ? "Lembrete" : prox.titulo.replaceAll('"', "")}</span>
          <BotaoZap lead={lead} compacto />
          <BotaoMaps lead={lead} compacto />
        </div>
      )}
    </article>
  );
}

export function BarraFases({ lead }: { lead: Lead }) {
  const atual = faseDoLead(lead);
  return (
    <div className="barra-fases" aria-label={`Fase ${atual} de ${FASES.length - 1}: ${FASES[atual].nome}`}>
      {FASES.slice(1).map((f, i) => (
        <i key={f.id} className={i + 1 <= atual ? "on" : ""} title={f.nome} />
      ))}
    </div>
  );
}
