"use client";

import { useEffect, useState } from "react";
import { avisar } from "@/lib/api";
import {
  dataCurta,
  hojeISO,
  linkInstagram,
  linkSite,
  linkTelefone,
  mensagemPorId,
  passoAtual,
  proximoEfetivo,
  proximoLembrete,
  reais,
  ROTEIROS,
  sugerirPreco,
  sugestao,
  textoDaMensagem,
  type RotaId,
} from "@/lib/acoes";
import { SEGMENTOS, STATUS, TIPOS_CONTATO, servicoPorId } from "@/lib/catalogo";
import { ETAPAS } from "@/lib/prontas";
import { adicionarContato, alterarLead, excluirContato, excluirLead, salvarLead, useEstado } from "@/lib/store";
import type { Lead, TipoContato } from "@/lib/types";
import { BotaoMaps, BotaoZap, SeloTemperatura } from "./AcoesRapidas";
import FormLead from "./FormLead";
import { IcFechar, IcFone, IcInsta, IcSite, IcVoltar } from "./Icones";

interface Props {
  leadId: string;
  onFechar: () => void;
  onMensagens: (leadId: string) => void;
  onIA?: (leadId: string) => void;
}

/** Ficha do lead: abre por cima de qualquer tela assim que você clica no lead. */
export default function FichaLead({ leadId, onFechar, onMensagens, onIA }: Props) {
  const { leads, vendedor } = useEstado();
  const lead = leads.find((l) => l.id === leadId);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !editando && onFechar();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onFechar, editando]);

  if (!lead) return null;

  return (
    <div className="ficha-fundo" onClick={onFechar}>
      <aside className="ficha" role="dialog" aria-label={`Ficha de ${lead.empresa}`} onClick={(e) => e.stopPropagation()}>
        <header className="ficha-topo">
          <button className="voltar" onClick={onFechar}><IcVoltar /> Voltar</button>
          <div className="ficha-titulo">
            <h2>{lead.empresa}</h2>
            <p>
              <select
                className="nicho-sel"
                value={lead.segmento}
                onChange={(e) => salvarLead({ ...lead, segmento: e.target.value as Lead["segmento"] })}
                aria-label="Nicho da empresa"
              >
                {SEGMENTOS.map((sg) => <option key={sg.id} value={sg.id}>{sg.nome}</option>)}
              </select>
              {lead.cidade ? <span>{lead.cidade}</span> : null}
            </p>
          </div>
          <SeloTemperatura lead={lead} />
        </header>

        <div className="ficha-corpo">
          <div className="ficha-etapa">
            <span className={`etapa-pill st-${lead.status}`} aria-hidden />
            <select
              value={lead.status}
              onChange={(e) => salvarLead({ ...lead, status: e.target.value as Lead["status"] })}
              aria-label="Etapa do lead"
            >
              {STATUS.map((st) => <option key={st.id} value={st.id}>{st.nome}</option>)}
            </select>
          </div>

          <Roteiro key={`${lead.id}:${lead.contatos.length}:${lead.status}:${lead.roteiro}`} lead={lead} vendedor={vendedor} onMensagens={() => onMensagens(lead.id)} />

          <div className="contatos-rapidos">
            <BotaoMaps lead={lead} />
            {linkTelefone(lead) && <a className="btn" href={linkTelefone(lead)}><IcFone /><span>Ligar</span></a>}
            {linkInstagram(lead) && <a className="btn" href={linkInstagram(lead)} target="_blank" rel="noopener noreferrer"><IcInsta /><span>Instagram</span></a>}
            {lead.site && <a className="btn" href={linkSite(lead.site)} target="_blank" rel="noopener noreferrer"><IcSite /><span>Site</span></a>}
          </div>

          <Negocio lead={lead} />

          <details className="dobra">
            <summary>Dados da empresa</summary>
          <dl className="dados">
            <dt>Responsável</dt><dd>{lead.responsavel || "Não informado"}</dd>
            <dt>WhatsApp</dt><dd>{lead.telefone || "Sem telefone"}</dd>
            <dt>Site</dt>
            <dd>
              {lead.siteStatus === "nao-encontrado" || !lead.site ? (
                <span className="tag laranja">Não tem site</span>
              ) : (
                <>
                  <span style={{ overflowWrap: "anywhere" }}>{lead.site}</span>{" "}
                  {lead.siteStatus === "desatualizado" && <span className="tag laranja">Desatualizado</span>}
                </>
              )}
            </dd>
            {lead.endereco && (<><dt>Endereço</dt><dd>{lead.endereco}</dd></>)}
            <dt>Oferecer</dt><dd>{servicoPorId(lead.servicoInteresse).nome}</dd>
            {lead.infoPublica && (<><dt>Observações</dt><dd>{lead.infoPublica}</dd></>)}
            {lead.linkDemo && (<><dt>Site demonstrativo</dt><dd style={{ overflowWrap: "anywhere" }}>{lead.linkDemo}</dd></>)}
          </dl>
          </details>

          <details className="dobra">
            <summary>Histórico ({lead.contatos.length})</summary>
            <Historico lead={lead} />
          </details>

          <div className="ficha-rodape">
            <button className="btn" onClick={() => setEditando(true)}>Editar dados</button>
            {onIA && <button className="btn" onClick={() => onIA(lead.id)}>Gerar com IA</button>}
            <button
              className="btn perigo"
              onClick={() => {
                if (confirm(`Excluir ${lead.empresa}? O histórico de contatos será apagado.`)) {
                  excluirLead(lead.id);
                  onFechar();
                }
              }}
            >
              Excluir lead
            </button>
          </div>
        </div>
      </aside>

      {editando && (
        <FormLead
          inicial={lead}
          onFechar={() => setEditando(false)}
          onSalvar={(l) => {
            salvarLead(l);
            setEditando(false);
            avisar("Lead salvo");
          }}
        />
      )}
    </div>
  );
}

function Roteiro({ lead, vendedor, onMensagens }: { lead: Lead; vendedor: string; onMensagens: () => void }) {
  const rota: RotaId = lead.roteiro ?? "conversa";
  const atual = passoAtual(lead, rota);
  const passos = ROTEIROS[rota].passos;
  const sugerida = sugestao(lead).msg.id;
  const noRoteiro = passos.findIndex((p) => p.msg === sugerida);
  const [indice, setIndice] = useState(noRoteiro >= 0 ? noRoteiro : atual.indice);
  const [extra, setExtra] = useState<string | null>(noRoteiro >= 0 ? null : sugerida);
  const msgId = extra ?? passos[indice].msg;
  const [texto, setTexto] = useState(() => textoDaMensagem(lead, msgId, vendedor));
  const prox = proximoEfetivo(lead);

  const mostrar = (i: number | null, outro: string | null = null) => {
    if (i !== null) setIndice(i);
    setExtra(outro);
    setTexto(textoDaMensagem(lead, outro ?? passos[i ?? indice].msg, vendedor));
  };
  const titulo = extra ? mensagemPorId(extra).msg.titulo.replaceAll('"', "") : `${indice + 1}. ${passos[indice].nome}`;

  return (
    <section className="roteiro">
      <div className="roteiro-cab">
        <h3>Conversa</h3>
        <div className="alternar peq" role="tablist" aria-label="Caminho da conversa">
          {(Object.keys(ROTEIROS) as RotaId[]).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={rota === r}
              className={rota === r ? "ativo" : ""}
              onClick={() => alterarLead(lead.id, (l) => ({ ...l, roteiro: r }))}
            >
              {ROTEIROS[r].nome}
            </button>
          ))}
        </div>
      </div>

      <ol className="passos">
        {passos.map((p, i) => {
          const feito = atual.enviados.has(p.msg);
          return (
            <li key={p.msg}>
              <button
                className={`passo ${feito ? "feito" : ""} ${!extra && i === indice ? "agora" : ""}`}
                onClick={() => mostrar(i)}
                aria-current={!extra && i === indice ? "step" : undefined}
              >
                <span className="passo-num">{feito ? "✓" : i + 1}</span>
                <span className="passo-nome">{p.nome}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="passo-card">
        <div className="passo-topo">
          <b>{titulo}</b>
        </div>
        <textarea
          className="msg-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={Math.min(10, texto.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 44)), 1))}
          aria-label="Texto da mensagem"
        />
        <div className="proxima-acoes">
          <BotaoZap lead={lead} msgId={msgId} texto={texto} rotulo="Enviar no WhatsApp" />
          <button
            className="btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(texto);
                avisar("Copiado");
              } catch {
                avisar("Não foi possível copiar");
              }
            }}
          >
            Copiar
          </button>
        </div>
        <div className="passo-saidas">
          <button className="btn peq" onClick={() => mostrar(null, proximoLembrete(lead))}>Não respondeu</button>
          <select
            className="sel peq"
            value=""
            onChange={(e) => e.target.value && mostrar(null, e.target.value)}
            aria-label="Responder uma objeção"
          >
            <option value="">Respondeu com objeção...</option>
            {ETAPAS.find((e) => e.id === "objecoes")!.mensagens.map((m) => (
              <option key={m.id} value={m.id}>{m.titulo}</option>
            ))}
          </select>
          <button className="btn peq" onClick={onMensagens}>Todas</button>
        </div>
      </div>

      <div className="agenda">
        <span>Chamar de novo</span>
        <input
          type="date"
          value={prox ?? ""}
          min={hojeISO()}
          onChange={(e) => alterarLead(lead.id, (l) => ({ ...l, proximoContato: e.target.value || undefined }))}
          aria-label="Data do próximo contato"
        />
        {prox && prox <= hojeISO() && <span className="tag amarelo">{prox < hojeISO() ? `Era ${dataCurta(prox)}` : "Hoje"}</span>}
      </div>
    </section>
  );
}

function Historico({ lead }: { lead: Lead }) {
  const [tipo, setTipo] = useState<TipoContato>("ligacao");
  const [resumo, setResumo] = useState("");
  const registrar = () => {
    if (!resumo.trim()) return;
    adicionarContato(lead.id, { data: new Date().toISOString(), tipo, resumo: resumo.trim() });
    setResumo("");
  };

  return (
    <section>
      <div className="registrar">
        <select className="sel" value={tipo} onChange={(e) => setTipo(e.target.value as TipoContato)} aria-label="Tipo de contato">
          {TIPOS_CONTATO.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input
          className="sel"
          placeholder="O que foi conversado?"
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && registrar()}
        />
        <button className="btn" onClick={registrar}>Anotar</button>
      </div>
      {lead.contatos.length === 0 ? (
        <p className="dica">Ainda não houve contato com esta empresa.</p>
      ) : (
        <ul className="timeline">
          {lead.contatos.slice().reverse().map((c) => (
            <li key={c.id}>
              <span>
                <small>
                  {new Date(c.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}, {TIPOS_CONTATO.find((t) => t.id === c.tipo)?.nome}
                </small>
                {c.resumo}
              </span>
              <button className="btn icone peq" onClick={() => excluirContato(lead.id, c.id)} aria-label="Apagar anotação"><IcFechar /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Negocio({ lead }: { lead: Lead }) {
  const preco = sugerirPreco(lead);
  const fechado = lead.status === "fechado";
  return (
    <section className="negocio">
      <div className="preco">
        <span className="preco-rot">Quanto cobrar</span>
        <strong>{reais(preco.sugerido)}{preco.mensal ? "/mês" : ""}</strong>
        <span className={`pot pot-${preco.potencial}`} title={preco.fatores.join("\n")}>
          Potencial {preco.potencial === "medio" ? "médio" : preco.potencial}
        </span>
      </div>
      <div className="negocio-campos">
        {(lead.status === "reuniao" || lead.reuniaoData) && (
          <label className="campo">
            <span>Reunião</span>
            <input
              type="datetime-local"
              value={lead.reuniaoData ?? ""}
              onChange={(e) =>
                alterarLead(lead.id, (l) => ({
                  ...l,
                  reuniaoData: e.target.value || undefined,
                  proximoContato: e.target.value ? e.target.value.slice(0, 10) : l.proximoContato,
                }))
              }
            />
          </label>
        )}
        {(fechado || lead.status === "proposta" || lead.valor) && (
          <label className="campo">
            <span>{fechado ? "Valor fechado (R$)" : "Valor da proposta (R$)"}</span>
            <input
              type="number"
              min={0}
              step={50}
              inputMode="numeric"
              placeholder={String(preco.sugerido)}
              value={lead.valor ?? ""}
              onChange={(e) => alterarLead(lead.id, (l) => ({ ...l, valor: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </label>
        )}
        {fechado && !lead.valor && (
          <button className="btn peq" onClick={() => alterarLead(lead.id, (l) => ({ ...l, valor: preco.sugerido }))}>
            Usar {reais(preco.sugerido)}
          </button>
        )}
      </div>
    </section>
  );
}
