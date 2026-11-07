"use client";

import { useMemo, useState } from "react";
import { avisar } from "@/lib/api";
import { SEGMENTOS, SERVICOS, STATUS, TIPOS_CONTATO, segmentoPorId, servicoPorId } from "@/lib/catalogo";
import { adicionarContato, excluirContato, excluirLead, novoId, salvarLead, useEstado } from "@/lib/store";
import type { Lead, TipoContato } from "@/lib/types";
import ScriptCard from "./ScriptCard";

const leadVazio = (): Lead => ({
  id: novoId(),
  empresa: "",
  responsavel: "",
  segmento: "odontologia",
  cidade: "",
  telefone: "",
  site: "",
  siteStatus: "nao-encontrado",
  instagram: "",
  seguidores: "",
  infoPublica: "",
  servicoInteresse: "site",
  status: "novo",
  contatos: [],
  criadoEm: new Date().toISOString(),
});

interface Props {
  selecionado: string | null;
  setSelecionado: (id: string | null) => void;
  onGerar: (leadId: string) => void;
  onZap: (leadId: string) => void;
  onBuscar: () => void;
  temIA: boolean;
}

export default function Leads({ selecionado, setSelecionado, onGerar, onZap, onBuscar, temIA }: Props) {
  const { leads, scripts } = useEstado();
  const [busca, setBusca] = useState("");
  const [filtroSeg, setFiltroSeg] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [formulario, setFormulario] = useState<Lead | null>(null);

  const filtrados = useMemo(
    () =>
      leads.filter(
        (l) =>
          (!busca || `${l.empresa} ${l.cidade} ${l.responsavel}`.toLowerCase().includes(busca.toLowerCase())) &&
          (!filtroSeg || l.segmento === filtroSeg) &&
          (!filtroStatus || l.status === filtroStatus),
      ),
    [leads, busca, filtroSeg, filtroStatus],
  );

  const lead = leads.find((l) => l.id === selecionado) ?? null;
  const scriptsDoLead = lead ? scripts.filter((s) => s.leadId === lead.id) : [];

  return (
    <>
      <div className="topo">
        <div>
          <h1>Leads</h1>
          <p>{leads.length} {leads.length === 1 ? "empresa cadastrada" : "empresas cadastradas"}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={onBuscar}>Buscar no Google Maps</button>
          <button className="btn prim" onClick={() => setFormulario(leadVazio())}>+ Novo lead</button>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="card vazio">
          <p style={{ fontSize: 16, color: "var(--text)", margin: "0 0 6px" }}>Nenhum lead cadastrado ainda.</p>
          <p style={{ margin: "0 0 18px" }}>Cadastre a primeira empresa que você vai prospectar. Os dados dela alimentam os scripts da IA.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn prim" onClick={() => setFormulario(leadVazio())}>Cadastrar primeiro lead</button>
            <button className="btn" onClick={onBuscar}>Buscar empresas no Google Maps</button>
          </div>
        </div>
      ) : (
        <div className="leads-layout">
          <div className="card">
            <div className="filtros">
              <input className="sel" placeholder="Buscar empresa, cidade..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              <select className="sel" value={filtroSeg} onChange={(e) => setFiltroSeg(e.target.value)}>
                <option value="">Todos os segmentos</option>
                {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <select className="sel" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="">Todos os status</option>
                {STATUS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="lista-leads">
              {filtrados.length === 0 && <div className="vazio">Nenhum lead com esses filtros.</div>}
              {filtrados.map((l) => (
                <button key={l.id} className={`lead-item ${l.id === selecionado ? "ativo" : ""}`} onClick={() => setSelecionado(l.id)}>
                  <span>
                    <b>{l.empresa}</b>
                    <small>{segmentoPorId(l.segmento).nome}{l.cidade ? ` · ${l.cidade}` : ""}</small>
                  </span>
                  <span className={`tag ${l.status === "perdido" ? "cinza" : ""}`} style={{ alignSelf: "center" }}>
                    {STATUS.find((s) => s.id === l.status)?.nome}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {lead ? (
            <DetalheLead
              lead={lead}
              scriptsCount={scriptsDoLead.length}
              onEditar={() => setFormulario(lead)}
              onGerar={() => onGerar(lead.id)}
              onZap={() => onZap(lead.id)}
              temIA={temIA}
              onExcluir={() => {
                if (confirm(`Excluir ${lead.empresa}? O histórico de contatos será apagado.`)) {
                  excluirLead(lead.id);
                  setSelecionado(null);
                }
              }}
            >
              {scriptsDoLead.length > 0 && (
                <div className="pilha" style={{ marginTop: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 15 }}>Scripts deste lead</h3>
                  {scriptsDoLead.slice(0, 3).map((s) => <ScriptCard key={s.id} script={s} temIA={temIA} />)}
                  {scriptsDoLead.length > 3 && <p className="dica">Os demais estão em Central de Abordagem › Histórico.</p>}
                </div>
              )}
            </DetalheLead>
          ) : (
            <div className="card vazio">Selecione um lead para ver os detalhes e gerar uma abordagem.</div>
          )}
        </div>
      )}

      {formulario && (
        <FormLead
          inicial={formulario}
          onFechar={() => setFormulario(null)}
          onSalvar={(l) => {
            salvarLead(l);
            setSelecionado(l.id);
            setFormulario(null);
            avisar("Lead salvo");
          }}
        />
      )}
    </>
  );
}

function DetalheLead({
  lead,
  onEditar,
  onGerar,
  onZap,
  temIA,
  onExcluir,
  children,
}: {
  lead: Lead;
  scriptsCount: number;
  onEditar: () => void;
  onGerar: () => void;
  onZap: () => void;
  temIA: boolean;
  onExcluir: () => void;
  children?: React.ReactNode;
}) {
  const [tipo, setTipo] = useState<TipoContato>("ligacao");
  const [resumo, setResumo] = useState("");

  const registrar = () => {
    if (!resumo.trim()) return;
    adicionarContato(lead.id, { data: new Date().toISOString(), tipo, resumo: resumo.trim() });
    setResumo("");
  };

  return (
    <div>
      <div className="card pad">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>{lead.empresa}</h2>
            <span className="dica">{segmentoPorId(lead.segmento).nome}{lead.cidade ? ` · ${lead.cidade}` : ""}</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
            <button className="btn prim" onClick={onZap}>Mensagens prontas pro WhatsApp</button>
            {temIA && <button className="btn" onClick={onGerar}>Gerar com IA</button>}
            <button className="btn" onClick={onEditar}>Editar</button>
          </div>
        </div>

        <dl className="dados">
          <dt>Responsável</dt><dd>{lead.responsavel || "—"}</dd>
          <dt>Telefone</dt><dd>{lead.telefone || "—"}</dd>
          <dt>Site</dt>
          <dd>
            {lead.siteStatus === "nao-encontrado" || !lead.site ? (
              <span className="tag laranja">Não localizado</span>
            ) : (
              <>
                {lead.site}{" "}
                {lead.siteStatus === "desatualizado" && <span className="tag laranja">Desatualizado</span>}
              </>
            )}
          </dd>
          <dt>Instagram</dt><dd>{lead.instagram || "Não encontrado"}{lead.seguidores ? ` · ${lead.seguidores} seguidores` : ""}</dd>
          {lead.endereco && (<><dt>Endereço</dt><dd>{lead.endereco}</dd></>)}
          {lead.linkDemo && (<><dt>Site demonstrativo</dt><dd>{lead.linkDemo}</dd></>)}
          <dt>Oferecer</dt><dd>{servicoPorId(lead.servicoInteresse).nome}</dd>
          <dt>Info pública</dt><dd>{lead.infoPublica || "—"}</dd>
          <dt>Status</dt>
          <dd>
            <select
              className="sel"
              style={{ width: "auto", padding: "4px 8px" }}
              value={lead.status}
              onChange={(e) => salvarLead({ ...lead, status: e.target.value as Lead["status"] })}
            >
              {STATUS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </dd>
        </dl>

        <h3 style={{ fontSize: 15, margin: "18px 0 8px" }}>Histórico de contatos</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select className="sel" style={{ width: 130 }} value={tipo} onChange={(e) => setTipo(e.target.value as TipoContato)}>
            {TIPOS_CONTATO.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <input
            className="sel"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="O que foi conversado? Ex.: falou com a recepção, pediu para ligar sexta"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && registrar()}
          />
          <button className="btn" onClick={registrar}>Registrar</button>
        </div>
        {lead.contatos.length === 0 ? (
          <p className="dica">Nenhum contato registrado. A IA usa este histórico para continuar a conversa de onde parou.</p>
        ) : (
          <ul className="timeline">
            {lead.contatos.slice().reverse().map((c) => (
              <li key={c.id}>
                <span>
                  <small>{new Date(c.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {TIPOS_CONTATO.find((t) => t.id === c.tipo)?.nome}</small>
                  {c.resumo}
                </span>
                <button className="btn peq" onClick={() => excluirContato(lead.id, c.id)} aria-label="Remover contato">×</button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button className="btn peq perigo" onClick={onExcluir}>Excluir lead</button>
        </div>
      </div>
      {children}
    </div>
  );
}

function FormLead({ inicial, onSalvar, onFechar }: { inicial: Lead; onSalvar: (l: Lead) => void; onFechar: () => void }) {
  const [l, setL] = useState<Lead>(inicial);
  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => setL((x) => ({ ...x, [k]: v }));

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <form
        className="card pad modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!l.empresa.trim()) return;
          onSalvar({ ...l, siteStatus: l.site.trim() ? l.siteStatus : "nao-encontrado" });
        }}
      >
        <h2 style={{ marginTop: 0 }}>{inicial.empresa ? "Editar lead" : "Novo lead"}</h2>
        <div className="grade g2">
          <label className="campo"><span>Empresa *</span><input required value={l.empresa} onChange={(e) => set("empresa", e.target.value)} /></label>
          <label className="campo"><span>Responsável</span><input value={l.responsavel} onChange={(e) => set("responsavel", e.target.value)} placeholder="Nome de quem decide" /></label>
          <label className="campo">
            <span>Segmento</span>
            <select value={l.segmento} onChange={(e) => set("segmento", e.target.value as Lead["segmento"])}>
              {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label className="campo"><span>Cidade</span><input value={l.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="Ex.: São Luís/MA" /></label>
          <label className="campo"><span>Telefone / WhatsApp</span><input value={l.telefone} onChange={(e) => set("telefone", e.target.value)} /></label>
          <label className="campo">
            <span>Serviço que deseja oferecer</span>
            <select value={l.servicoInteresse} onChange={(e) => set("servicoInteresse", e.target.value as Lead["servicoInteresse"])}>
              {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label className="campo"><span>Site (deixe vazio se não localizado)</span><input value={l.site} onChange={(e) => set("site", e.target.value)} placeholder="www.exemplo.com.br" /></label>
          <label className="campo">
            <span>Situação do site</span>
            <select value={l.site ? l.siteStatus : "nao-encontrado"} disabled={!l.site} onChange={(e) => set("siteStatus", e.target.value as Lead["siteStatus"])}>
              <option value="nao-encontrado">Não localizado</option>
              <option value="desatualizado">Existe, mas está desatualizado</option>
              <option value="ok">Existe e está ok</option>
            </select>
          </label>
          <label className="campo"><span>Instagram</span><input value={l.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@perfil" /></label>
          <label className="campo"><span>Link do site demonstrativo</span><input value={l.linkDemo ?? ""} onChange={(e) => set("linkDemo", e.target.value)} placeholder="Entra nas mensagens prontas" /></label>
          <label className="campo"><span>Seguidores (opcional)</span><input value={l.seguidores} onChange={(e) => set("seguidores", e.target.value)} placeholder="Ex.: 2,3 mil" /></label>
        </div>
        <label className="campo" style={{ marginTop: 14 }}>
          <span>Informações públicas que você viu</span>
          <textarea
            value={l.infoPublica}
            onChange={(e) => set("infoPublica", e.target.value)}
            placeholder="Ex.: 4,8 no Google com 120 avaliações; posta antes e depois toda semana; atende convênios; abriu segunda unidade."
          />
        </label>
        <p className="dica">A IA só usa o que estiver aqui. O que você não preencher vira um campo entre colchetes para completar.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn prim">Salvar lead</button>
        </div>
      </form>
    </div>
  );
}
