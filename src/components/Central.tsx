"use client";

import { useEffect, useMemo, useState } from "react";
import { chamarIA } from "@/lib/api";
import { montarContexto, OBJECOES, scriptDaBiblioteca } from "@/lib/biblioteca";
import {
  CANAIS,
  CATEGORIAS,
  ESTILOS,
  SEGMENTOS,
  SERVICOS,
  categoriaPorId,
  segmentoPorId,
} from "@/lib/catalogo";
import { novoId, salvarScript, useEstado } from "@/lib/store";
import type { Canal, CategoriaId, Estilo, Lead, Script, SegmentoId, ServicoId } from "@/lib/types";
import MensagensProntas from "./MensagensProntas";
import ScriptCard from "./ScriptCard";

export type AbaCentral = "prontas" | "biblioteca" | "objecoes" | "gerador" | "favoritos" | "historico";

interface Props {
  aba: AbaCentral;
  setAba: (a: AbaCentral) => void;
  leadInicial: string | null;
  temIA: boolean;
  onCadastrar: () => void;
}

export default function Central({ aba, setAba, leadInicial, temIA, onCadastrar }: Props) {
  const { scripts } = useEstado();
  const favs = scripts.filter((s) => s.favorito).length;

  return (
    <>
      <div className="abas">
        {(
          [
            ["prontas", "WhatsApp"],
            ...(temIA ? [["gerador", "Gerador com IA"]] : []),
            ["biblioteca", "Ligação"],
            ["objecoes", "Objeções"],
            ["favoritos", `Favoritos (${favs})`],
            ["historico", `Histórico (${scripts.length})`],
          ] as [AbaCentral, string][]
        ).map(([id, nome]) => (
          <button key={id} className={`aba ${aba === id ? "ativo" : ""}`} onClick={() => setAba(id)}>
            {nome}
          </button>
        ))}
      </div>

      {aba === "prontas" && <MensagensProntas leadInicial={leadInicial} onCadastrar={onCadastrar} />}
      {aba === "gerador" && temIA && <Gerador leadInicial={leadInicial} />}
      {aba === "biblioteca" && <Biblioteca leadInicial={leadInicial} />}
      {aba === "objecoes" && <Objecoes leadInicial={leadInicial} />}
      {aba === "favoritos" && <ListaScripts somenteFavoritos />}
      {aba === "historico" && <ListaScripts />}
    </>
  );
}

/* ---------- Seletor de lead + segmento + serviço (usado em Biblioteca e Objeções) ---------- */

function useSelecaoBase(leadInicial: string | null) {
  const { leads } = useEstado();
  const [leadId, setLeadId] = useState<string>(leadInicial ?? "");
  const lead = leads.find((l) => l.id === leadId) ?? null;
  const [segmento, setSegmento] = useState<SegmentoId>(lead?.segmento ?? "odontologia");
  const [servico, setServico] = useState<ServicoId>(lead?.servicoInteresse ?? "site");

  const escolherLead = (id: string) => {
    setLeadId(id);
    const l = leads.find((x) => x.id === id);
    if (l) {
      setSegmento(l.segmento);
      setServico(l.servicoInteresse);
    }
  };
  return { leads, lead, leadId, escolherLead, segmento, setSegmento, servico, setServico };
}

function SeletorLead({ leads, leadId, onChange, rotulo = "Lead (opcional)" }: { leads: Lead[]; leadId: string; onChange: (id: string) => void; rotulo?: string }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <select value={leadId} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sem lead (modelo com campos em branco)</option>
        {leads.map((l) => (
          <option key={l.id} value={l.id}>{l.empresa}{l.cidade ? ` · ${l.cidade}` : ""}</option>
        ))}
      </select>
    </label>
  );
}

/* ---------- Biblioteca ---------- */

function Biblioteca({ leadInicial }: { leadInicial: string | null }) {
  const { vendedor } = useEstado();
  const b = useSelecaoBase(leadInicial);
  const [categoria, setCategoria] = useState<CategoriaId>("primeira-ligacao");
  const cat = categoriaPorId(categoria);
  const seg = segmentoPorId(b.segmento);

  const ctx = montarContexto(b.segmento, b.servico, b.lead, vendedor);
  const script: Script = {
    id: `bib:${categoria}:${b.segmento}:${b.servico}:${b.lead?.id ?? "modelo"}`,
    titulo: `${cat.nome} · ${seg.nome}`,
    texto: scriptDaBiblioteca(categoria, ctx),
    categoria,
    canal: cat.canal,
    segmento: b.segmento,
    servico: b.servico,
    leadId: b.lead?.id,
    leadNome: b.lead?.empresa,
    origem: "biblioteca",
    favorito: false,
    criadoEm: new Date().toISOString(),
  };

  return (
    <div className="biblio">
      <div className="card cat-lista">
        {CATEGORIAS.map((c) => (
          <button key={c.id} className={`cat-btn ${c.id === categoria ? "ativo" : ""}`} onClick={() => setCategoria(c.id)}>
            {c.nome}
          </button>
        ))}
      </div>
      <div>
        <div className="barra-filtros">
          <SeletorLead leads={b.leads} leadId={b.leadId} onChange={b.escolherLead} />
          <label className="campo">
            <span>Segmento</span>
            <select value={b.segmento} onChange={(e) => b.setSegmento(e.target.value as SegmentoId)}>
              {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label className="campo">
            <span>Serviço</span>
            <select value={b.servico} onChange={(e) => b.setServico(e.target.value as ServicoId)}>
              {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
        </div>
        <p className="dica" style={{ marginTop: -6 }}>{cat.descricao}</p>
        {seg.cuidado && <div className="aviso"><b>Atenção para {seg.plural}:</b> {seg.cuidado}</div>}
        {!vendedor && <div className="aviso">Preencha seu nome no menu lateral para ele entrar nos scripts.</div>}
        <ScriptCard key={script.id} script={script} efemero />
        <ArgumentosSegmento segmento={b.segmento} />
      </div>
    </div>
  );
}

function ArgumentosSegmento({ segmento }: { segmento: SegmentoId }) {
  const s = segmentoPorId(segmento);
  return (
    <div className="card pad" style={{ marginTop: 16 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Argumentos para {s.plural}</h3>
      <p className="dica" style={{ margin: "0 0 10px" }}>{s.clientes.charAt(0).toUpperCase() + s.clientes.slice(1)} {s.comoBuscam}.</p>
      <div className="grade g2">
        <div>
          <b style={{ fontSize: 13 }}>Situações comuns</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 14 }}>{s.dores.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
        <div>
          <b style={{ fontSize: 13 }}>O que dizer</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 14 }}>{s.argumentos.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      </div>
      <p style={{ fontSize: 14, margin: "12px 0 0" }}><b>Pergunta de abertura:</b> {s.gancho.replaceAll("{cidade}", "[cidade]")}</p>
    </div>
  );
}

/* ---------- Objeções ---------- */

function Objecoes({ leadInicial }: { leadInicial: string | null }) {
  const { vendedor } = useEstado();
  const b = useSelecaoBase(leadInicial);
  const ctx = montarContexto(b.segmento, b.servico, b.lead, vendedor);
  const [aberta, setAberta] = useState<string>(OBJECOES[0].id);

  return (
    <div className="biblio">
      <div className="card cat-lista">
        {OBJECOES.map((o) => (
          <button key={o.id} className={`cat-btn ${o.id === aberta ? "ativo" : ""}`} onClick={() => setAberta(o.id)}>
            “{o.objecao}”
          </button>
        ))}
      </div>
      <div>
        <div className="barra-filtros">
          <SeletorLead leads={b.leads} leadId={b.leadId} onChange={b.escolherLead} />
          <label className="campo">
            <span>Segmento</span>
            <select value={b.segmento} onChange={(e) => b.setSegmento(e.target.value as SegmentoId)}>
              {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label className="campo">
            <span>Serviço</span>
            <select value={b.servico} onChange={(e) => b.setServico(e.target.value as ServicoId)}>
              {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
        </div>
        <p className="dica" style={{ marginTop: -6 }}>
          Concorde com o sentimento, pergunte antes de responder e deixe a decisão com o cliente. Os trechos entre colchetes mudam conforme a resposta dele.
        </p>
        {OBJECOES.filter((o) => o.id === aberta).map((o) => {
          const s: Script = {
            id: `obj:${o.id}:${b.segmento}:${b.servico}:${b.lead?.id ?? "modelo"}`,
            titulo: `Objeção: “${o.objecao}”`,
            texto: o.resposta(ctx),
            categoria: "objecoes",
            canal: "ligacao",
            segmento: b.segmento,
            servico: b.servico,
            leadId: b.lead?.id,
            leadNome: b.lead?.empresa,
            origem: "biblioteca",
            favorito: false,
            criadoEm: new Date().toISOString(),
          };
          return <ScriptCard key={s.id} script={s} efemero />;
        })}
      </div>
    </div>
  );
}

/* ---------- Gerador com IA ---------- */

function Gerador({ leadInicial }: { leadInicial: string | null }) {
  const { leads, vendedor } = useEstado();
  const [leadId, setLeadId] = useState<string>(leadInicial ?? "");
  const lead = leads.find((l) => l.id === leadId) ?? null;
  const [segmento, setSegmento] = useState<SegmentoId>(lead?.segmento ?? "odontologia");
  const [servico, setServico] = useState<ServicoId>(lead?.servicoInteresse ?? "site");
  const [objetivo, setObjetivo] = useState<CategoriaId>(lead && lead.contatos.length ? "follow-up" : "primeira-ligacao");
  const [canal, setCanal] = useState<Canal>(categoriaPorId(objetivo).canal);
  const [estilo, setEstilo] = useState<Estilo>(lead?.segmento === "advocacia" ? "formal" : "consultivo");
  const [observacoes, setObservacoes] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultados, setResultados] = useState<string[]>([]);
  const { scripts } = useEstado();

  useEffect(() => {
    if (leadInicial) escolherLead(leadInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadInicial]);

  function escolherLead(id: string) {
    setLeadId(id);
    const l = leads.find((x) => x.id === id);
    if (l) {
      setSegmento(l.segmento);
      setServico(l.servicoInteresse);
      if (l.segmento === "advocacia") setEstilo("formal");
      if (l.contatos.length) {
        setObjetivo("follow-up");
        setCanal("whatsapp");
      }
    }
  }

  const gerar = async () => {
    setErro("");
    setCarregando(true);
    try {
      const texto = await chamarIA({
        acao: "gerar",
        lead,
        segmento,
        servico,
        objetivo,
        canal,
        estilo,
        observacoes,
        nomeVendedor: vendedor,
      });
      const s: Script = {
        id: novoId(),
        titulo: `${categoriaPorId(objetivo).nome}${lead ? ` · ${lead.empresa}` : ` · ${segmentoPorId(segmento).nome}`}`,
        texto,
        categoria: objetivo,
        canal,
        segmento,
        servico,
        leadId: lead?.id,
        leadNome: lead?.empresa,
        origem: "ia",
        favorito: false,
        criadoEm: new Date().toISOString(),
        acao: "gerar",
      };
      salvarScript(s);
      setResultados((r) => [s.id, ...r]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar");
    } finally {
      setCarregando(false);
    }
  };

  const contatosLead = lead?.contatos.length ?? 0;

  return (
    <div className="gerador">
      <form
        className="card pad grade"
        onSubmit={(e) => {
          e.preventDefault();
          gerar();
        }}
      >
        <SeletorLead leads={leads} leadId={leadId} onChange={escolherLead} rotulo="Empresa" />
        {lead && (
          <p className="dica" style={{ margin: "-6px 0 0" }}>
            Site: {lead.site && lead.siteStatus !== "nao-encontrado" ? lead.site : "não localizado"} · Instagram: {lead.instagram || "não encontrado"} · {contatosLead} {contatosLead === 1 ? "contato" : "contatos"} no histórico
          </p>
        )}
        <label className="campo">
          <span>Segmento</span>
          <select value={segmento} onChange={(e) => setSegmento(e.target.value as SegmentoId)}>
            {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Objetivo da abordagem</span>
          <select
            value={objetivo}
            onChange={(e) => {
              const v = e.target.value as CategoriaId;
              setObjetivo(v);
              setCanal(categoriaPorId(v).canal);
            }}
          >
            {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Canal de contato</span>
          <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>
            {CANAIS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Serviço que deseja vender</span>
          <select value={servico} onChange={(e) => setServico(e.target.value as ServicoId)}>
            {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Estilo de comunicação</span>
          <select value={estilo} onChange={(e) => setEstilo(e.target.value as Estilo)}>
            {ESTILOS.map((s) => <option key={s.id} value={s.id}>{s.nome} · {s.descricao}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Observações (opcional)</span>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex.: já mandei o site demonstrativo; o dono se chama Rafael e prefere áudio; tenho condição de 3x sem juros"
          />
        </label>
        <button type="submit" className="btn prim" disabled={carregando} style={{ justifyContent: "center", padding: "10px" }}>
          {carregando ? "Gerando roteiro..." : "Gerar roteiro personalizado"}
        </button>
        {erro && <div className="erro">{erro}</div>}
        {!vendedor && <p className="dica" style={{ margin: 0 }}>Dica: preencha seu nome no menu lateral.</p>}
      </form>

      <div className="pilha">
        {carregando && (
          <div className="card carregando"><span className="spinner" /> Escrevendo o roteiro com os dados do lead...</div>
        )}
        {resultados.length === 0 && !carregando && (
          <div className="card vazio">
            <p style={{ margin: "0 0 6px", color: "var(--text)" }}>Escolha a empresa e o objetivo ao lado.</p>
            <p style={{ margin: 0 }}>A IA usa o nome, a cidade, o site, o Instagram, o que você anotou e o histórico de contatos. O que não estiver cadastrado aparece entre colchetes para você completar.</p>
          </div>
        )}
        {resultados.map((id) => {
          const s = scripts.find((x) => x.id === id);
          return s ? <ScriptCard key={id} script={s} estilo={estilo} /> : null;
        })}
      </div>
    </div>
  );
}

/* ---------- Favoritos e Histórico ---------- */

function ListaScripts({ somenteFavoritos }: { somenteFavoritos?: boolean }) {
  const { scripts, leads } = useEstado();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [leadId, setLeadId] = useState("");
  const [origem, setOrigem] = useState("");

  const lista = useMemo(
    () =>
      scripts
        .filter((s) => !somenteFavoritos || s.favorito)
        .filter((s) => !categoria || s.categoria === categoria)
        .filter((s) => !leadId || s.leadId === leadId)
        .filter((s) => !origem || s.origem === origem)
        .filter((s) => !busca || `${s.titulo} ${s.texto}`.toLowerCase().includes(busca.toLowerCase()))
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    [scripts, somenteFavoritos, categoria, leadId, origem, busca],
  );

  return (
    <>
      <div className="barra-filtros">
        <label className="campo"><span>Buscar</span><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Palavra no título ou no texto" /></label>
        <label className="campo">
          <span>Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Lead</span>
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">Todos</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.empresa}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Origem</span>
          <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
            <option value="">Todas</option>
            <option value="ia">Gerado pela IA</option>
            <option value="biblioteca">Biblioteca</option>
            <option value="editado">Editado</option>
          </select>
        </label>
      </div>
      {lista.length === 0 ? (
        <div className="card vazio">
          {somenteFavoritos
            ? "Nenhum favorito ainda. Use o botão ☆ Favoritar em qualquer script."
            : "Nenhum script no histórico. Os scripts gerados, editados ou favoritados aparecem aqui."}
        </div>
      ) : (
        <div className="pilha">
          {lista.map((s) => <ScriptCard key={s.id} script={s} permitirExcluir />)}
        </div>
      )}
    </>
  );
}
