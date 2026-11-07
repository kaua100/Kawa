"use client";

import { useState } from "react";
import { avisar, chamarIA, useIntegracoes } from "@/lib/api";
import { CANAIS, canalNome, categoriaPorId, segmentoPorId, servicoPorId } from "@/lib/catalogo";
import { adicionarContato, excluirScript, novoId, salvarScript, useEstado } from "@/lib/store";
import type { AcaoIA, Canal, Estilo, Script, TipoContato } from "@/lib/types";

const NOME_ACAO: Record<AcaoIA, string> = {
  gerar: "Gerado pela IA",
  "nova-versao": "Nova versão",
  "adaptar-canal": "Adaptado de canal",
  "mais-curta": "Versão mais curta",
  "mais-persuasiva": "Versão mais persuasiva",
};

const CANAL_PARA_CONTATO: Record<Canal, TipoContato> = {
  ligacao: "ligacao",
  whatsapp: "whatsapp",
  instagram: "instagram",
  email: "email",
  presencial: "reuniao",
};

interface Props {
  script: Script;
  estilo?: Estilo;
  /** script da biblioteca ainda não salvo no histórico */
  efemero?: boolean;
  permitirExcluir?: boolean;
  nivel?: number;
  temIA?: boolean;
}

export default function ScriptCard({ script, estilo = "consultivo", efemero, permitirExcluir, nivel = 0, temIA }: Props) {
  const integ = useIntegracoes();
  const ia = temIA ?? integ.ia;
  const { scripts, leads, vendedor } = useEstado();
  const salvo = scripts.find((s) => s.id === script.id);
  const atual = salvo ?? script;
  const lead = atual.leadId ? leads.find((l) => l.id === atual.leadId) : undefined;

  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(atual.texto);
  const [carregando, setCarregando] = useState<AcaoIA | null>(null);
  const [erro, setErro] = useState("");
  const [canalDestino, setCanalDestino] = useState<Canal | "">("");
  const [derivados, setDerivados] = useState<string[]>([]);

  const garantirSalvo = (extra?: Partial<Script>) => {
    const s = { ...atual, ...extra };
    salvarScript(s);
    return s;
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(atual.texto);
      avisar("Script copiado");
    } catch {
      avisar("Não foi possível copiar. Selecione o texto e use Ctrl+C.");
    }
  };

  const salvarEdicao = () => {
    garantirSalvo({ texto: rascunho, origem: atual.origem === "biblioteca" ? "editado" : atual.origem });
    setEditando(false);
    avisar("Alterações salvas no histórico");
  };

  const favoritar = () => {
    garantirSalvo({ favorito: !atual.favorito });
    avisar(atual.favorito ? "Removido dos favoritos" : "Salvo nos favoritos");
  };

  const registrarUso = () => {
    if (!lead) return;
    garantirSalvo();
    adicionarContato(lead.id, {
      data: new Date().toISOString(),
      tipo: CANAL_PARA_CONTATO[atual.canal],
      resumo: `Usou o script "${atual.titulo}" (${canalNome(atual.canal)})`,
    });
    avisar(`Contato registrado no histórico de ${lead.empresa}`);
  };

  const executar = async (acao: AcaoIA, destino?: Canal) => {
    setErro("");
    setCarregando(acao);
    try {
      const base = efemero ? garantirSalvo() : atual;
      const texto = await chamarIA({
        acao,
        lead: lead ?? null,
        segmento: atual.segmento ?? lead?.segmento ?? "loja-local",
        servico: atual.servico ?? lead?.servicoInteresse ?? "site",
        objetivo: atual.categoria,
        canal: atual.canal,
        canalDestino: destino,
        estilo,
        textoBase: base.texto,
        nomeVendedor: vendedor,
      });
      const canalNovo = destino ?? atual.canal;
      const novo: Script = {
        ...atual,
        id: novoId(),
        texto,
        canal: canalNovo,
        titulo:
          acao === "adaptar-canal"
            ? `${categoriaPorId(atual.categoria).nome} · ${canalNome(canalNovo)}`
            : atual.titulo,
        origem: "ia",
        favorito: false,
        criadoEm: new Date().toISOString(),
        versaoDe: base.id,
        acao,
      };
      salvarScript(novo);
      setDerivados((d) => [novo.id, ...d]);
      setCanalDestino("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar");
    } finally {
      setCarregando(null);
    }
  };

  const ocupado = carregando !== null;

  return (
    <div className="card script">
      <div className="script-topo">
        <div>
          <h3>{atual.titulo}</h3>
          <div className="script-meta">
            <span className="tag">{canalNome(atual.canal)}</span>
            {atual.segmento && <span className="tag cinza">{segmentoPorId(atual.segmento).nome}</span>}
            {atual.servico && <span className="tag cinza">{servicoPorId(atual.servico).nome}</span>}
            {atual.leadNome && <span className="tag cinza">Lead: {atual.leadNome}</span>}
            {atual.acao && <span className="tag laranja">{NOME_ACAO[atual.acao]}</span>}
            {atual.origem === "editado" && <span className="tag laranja">Editado</span>}
          </div>
        </div>
        {!efemero && (
          <small className="dica">{new Date(atual.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</small>
        )}
      </div>

      {editando ? (
        <textarea className="script-edit" value={rascunho} onChange={(e) => setRascunho(e.target.value)} autoFocus />
      ) : (
        <div className="script-texto">{atual.texto}</div>
      )}

      <div className="script-acoes">
        {editando ? (
          <>
            <button className="btn prim peq" onClick={salvarEdicao}>Salvar edição</button>
            <button className="btn peq" onClick={() => { setRascunho(atual.texto); setEditando(false); }}>Cancelar</button>
          </>
        ) : (
          <>
            <button className="btn prim peq" onClick={copiar}>Copiar</button>
            <button className="btn peq" onClick={() => { setRascunho(atual.texto); setEditando(true); }}>Editar</button>
            <button className={`btn peq ${atual.favorito ? "fav" : ""}`} onClick={favoritar}>
              {atual.favorito ? "★ Favorito" : "☆ Favoritar"}
            </button>
            {lead && (
              <button className="btn peq" onClick={registrarUso} title="Registra este contato no histórico do lead">
                Registrar contato
              </button>
            )}
            {ia && <>
            <span className="sep" />
            <button className="btn peq" disabled={ocupado} onClick={() => executar("nova-versao")}>
              {carregando === "nova-versao" ? "Gerando..." : "Nova versão"}
            </button>
            <button className="btn peq" disabled={ocupado} onClick={() => executar("mais-curta")}>
              {carregando === "mais-curta" ? "Gerando..." : "Mais curta"}
            </button>
            <button className="btn peq" disabled={ocupado} onClick={() => executar("mais-persuasiva")}>
              {carregando === "mais-persuasiva" ? "Gerando..." : "Mais persuasiva"}
            </button>
            <select
              className="sel"
              style={{ width: "auto", padding: "5px 8px", fontSize: 12.5 }}
              value={canalDestino}
              disabled={ocupado}
              onChange={(e) => {
                const v = e.target.value as Canal;
                setCanalDestino(v);
                if (v) executar("adaptar-canal", v);
              }}
            >
              <option value="">{carregando === "adaptar-canal" ? "Adaptando..." : "Adaptar para outro canal"}</option>
              {CANAIS.filter((c) => c.id !== atual.canal).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            </>}
            {permitirExcluir && salvo && (
              <button
                className="btn peq perigo"
                style={{ marginLeft: "auto" }}
                onClick={() => { if (confirm("Excluir este script do histórico?")) excluirScript(atual.id); }}
              >
                Excluir
              </button>
            )}
          </>
        )}
      </div>
      {erro && <div className="erro" style={{ padding: "0 18px 12px" }}>{erro}</div>}

      {derivados.length > 0 && nivel < 3 && (
        <div className="derivados">
          <p>Versões geradas a partir deste script (já estão no histórico)</p>
          {derivados.map((id) => {
            const s = scripts.find((x) => x.id === id);
            return s ? <ScriptCard key={id} script={s} estilo={estilo} nivel={nivel + 1} /> : null;
          })}
        </div>
      )}
    </div>
  );
}
