"use client";

import { useEffect, useState } from "react";
import { avisar } from "@/lib/api";
import {
  dataCurta,
  hojeISO,
  linkInstagram,
  linkSite,
  linkTelefone,
  proximoEfetivo,
  reais,
  sugerirPreco,
  sugestao,
  temWhatsApp,
  textoDaMensagem,
} from "@/lib/acoes";
import { STATUS, TIPOS_CONTATO, segmentoPorId, servicoPorId } from "@/lib/catalogo";
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
              {segmentoPorId(lead.segmento).nome}
              {lead.cidade ? ` em ${lead.cidade}` : ""}
            </p>
          </div>
          <SeloTemperatura lead={lead} />
        </header>

        <div className="ficha-corpo">
          <div className="etapas" role="radiogroup" aria-label="Etapa do lead">
            {STATUS.map((s) => (
              <button
                key={s.id}
                role="radio"
                aria-checked={lead.status === s.id}
                className={`etapa ${lead.status === s.id ? "ativo" : ""} st-${s.id}`}
                onClick={() => salvarLead({ ...lead, status: s.id })}
              >
                {s.nome}
              </button>
            ))}
          </div>

          <ProximaMensagem key={`${lead.id}:${lead.contatos.length}:${lead.status}`} lead={lead} vendedor={vendedor} onMensagens={() => onMensagens(lead.id)} />

          <div className="contatos-rapidos">
            <BotaoMaps lead={lead} />
            {linkTelefone(lead) && <a className="btn" href={linkTelefone(lead)}><IcFone /><span>Ligar</span></a>}
            {linkInstagram(lead) && <a className="btn" href={linkInstagram(lead)} target="_blank" rel="noopener noreferrer"><IcInsta /><span>Instagram</span></a>}
            {lead.site && <a className="btn" href={linkSite(lead.site)} target="_blank" rel="noopener noreferrer"><IcSite /><span>Site</span></a>}
          </div>

          <Negocio lead={lead} />

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

          <Historico lead={lead} />

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

function ProximaMensagem({ lead, vendedor, onMensagens }: { lead: Lead; vendedor: string; onMensagens: () => void }) {
  const sugerida = sugestao(lead).msg.id;
  const [msgId, setMsgId] = useState(sugerida);
  const [texto, setTexto] = useState(() => textoDaMensagem(lead, sugerida, vendedor));
  const prox = proximoEfetivo(lead);

  const trocar = (id: string) => {
    setMsgId(id);
    setTexto(textoDaMensagem(lead, id, vendedor));
  };

  return (
    <section className="proxima">
      <div className="proxima-cab">
        <label className="campo" style={{ flex: 1 }}>
          <span>Mensagem para enviar agora</span>
          <select value={msgId} onChange={(e) => trocar(e.target.value)}>
            {ETAPAS.map((et) => (
              <optgroup key={et.id} label={et.nome}>
                {et.mensagens.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.titulo.replaceAll('"', "")}{m.id === sugerida ? " (sugerida)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      <textarea
        className="msg-texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={Math.min(12, texto.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 46)), 1))}
        aria-label="Texto da mensagem"
      />
      <div className="proxima-acoes">
        <BotaoZap lead={lead} msgId={msgId} texto={texto} rotulo="Enviar no WhatsApp" />
        <button
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              avisar("Mensagem copiada");
            } catch {
              avisar("Não foi possível copiar");
            }
          }}
        >
          Copiar
        </button>
        <button className="btn" onClick={onMensagens}>Ver todas</button>
      </div>
      {!temWhatsApp(lead) && <p className="dica" style={{ margin: "8px 0 0" }}>Sem telefone com DDD: o WhatsApp vai abrir para você escolher o contato.</p>}
      <div className="agenda">
        <span>Chamar de novo em</span>
        <input
          type="date"
          value={prox ?? ""}
          min={hojeISO()}
          onChange={(e) => alterarLead(lead.id, (l) => ({ ...l, proximoContato: e.target.value || undefined }))}
          aria-label="Data do próximo contato"
        />
        {prox && prox <= hojeISO() && <span className="tag amarelo">{prox < hojeISO() ? `Era para ${dataCurta(prox)}` : "Hoje"}</span>}
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
      <h3 className="ficha-sub">Histórico</h3>
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
        <small>
          Faixa de {reais(preco.min)} a {reais(preco.max)} para {servicoPorId(lead.servicoInteresse).nome}
          {preco.fatores.length ? `. Ajustado por: ${preco.fatores.join(", ")}.` : "."}
        </small>
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
