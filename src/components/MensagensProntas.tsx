"use client";

import { useState } from "react";
import { avisar } from "@/lib/api";
import { contextoZap, ETAPAS, linkWhatsApp, telefoneWhatsApp, type CtxZap, type MensagemPronta } from "@/lib/prontas";
import { mensagemPorId, registrarEnvio, ROTEIROS, type RotaId } from "@/lib/acoes";
import { salvarScript, useEstado } from "@/lib/store";
import type { Lead } from "@/lib/types";

export default function MensagensProntas({ leadInicial, onCadastrar }: { leadInicial: string | null; onCadastrar: () => void }) {
  const { leads, vendedor } = useEstado();
  const [leadId, setLeadId] = useState(leadInicial ?? leads[0]?.id ?? "");
  const [etapa, setEtapa] = useState<string>("rota:conversa");
  const lead = leads.find((l) => l.id === leadId) ?? null;

  if (leads.length === 0) {
    return (
      <div className="card vazio">
        <p className="vazio-titulo">Nenhum lead ainda.</p>
        <button className="btn prim" onClick={onCadastrar}>Ir para Leads</button>
      </div>
    );
  }

  const ctx = lead ? contextoZap(lead, vendedor) : null;
  const telOk = lead ? !!telefoneWhatsApp(lead.telefone) : false;
  const rota = etapa.startsWith("rota:") ? (etapa.slice(5) as RotaId) : null;
  const et = rota ? null : ETAPAS.find((e) => e.id === etapa)!;

  return (
    <>
      <div className="barra-filtros">
        <label className="campo">
          <span>Para quem</span>
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            {!lead && <option value="">Escolha um lead</option>}
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.empresa}{l.cidade ? ` · ${l.cidade}` : ""}</option>
            ))}
          </select>
        </label>
      </div>

      {lead && (
        <>
          {!telOk && <div className="aviso">Sem número com DDD: o WhatsApp vai pedir o contato.</div>}

          <div className="chips">
            {(Object.keys(ROTEIROS) as RotaId[]).map((r) => (
              <button key={r} className={`chip rota ${etapa === `rota:${r}` ? "ativo" : ""}`} onClick={() => setEtapa(`rota:${r}`)}>
                Passo a passo: {ROTEIROS[r].nome.toLowerCase()}
              </button>
            ))}
            {ETAPAS.map((e) => (
              <button key={e.id} className={`chip ${e.id === etapa ? "ativo" : ""}`} onClick={() => setEtapa(e.id)}>
                {e.nome}
              </button>
            ))}
          </div>

          {rota ? (
            <ol className="passo-lista">
              {ROTEIROS[rota].passos.map((p, i) => {
                const { etapa: e, msg } = mensagemPorId(p.msg);
                return (
                  <li key={p.msg}>
                    <div className="passo-lista-cab">
                      <span className="passo-num">{i + 1}</span>
                      <b>{p.nome}</b>
                      <span>{p.dica}</span>
                    </div>
                    <CardMensagem key={`${lead.id}:${p.msg}:${vendedor}`} m={msg} ctx={ctx!} lead={lead} etapaNome={e.nome} />
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="grade-msgs">
              {et!.mensagens.map((m) => (
                <CardMensagem key={`${lead.id}:${m.id}:${vendedor}`} m={m} ctx={ctx!} lead={lead} etapaNome={et!.nome} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function CardMensagem({ m, ctx, lead, etapaNome }: { m: MensagemPronta; ctx: CtxZap; lead: Lead; etapaNome: string }) {
  const [texto, setTexto] = useState(() => m.texto(ctx));
  const original = m.texto(ctx);

  const enviar = () => {
    registrarEnvio(lead, m.id);
    avisar("Mensagem aberta no WhatsApp. Próximo contato agendado.");
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      avisar("Mensagem copiada");
    } catch {
      avisar("Não foi possível copiar");
    }
  };

  const salvar = () => {
    salvarScript({
      id: `zap:${lead.id}:${m.id}:${Date.now()}`,
      titulo: `${etapaNome} · ${m.titulo.replaceAll('"', "")}`,
      texto,
      categoria: m.categoria,
      canal: "whatsapp",
      segmento: lead.segmento,
      servico: lead.servicoInteresse,
      leadId: lead.id,
      leadNome: lead.empresa,
      origem: texto === original ? "biblioteca" : "editado",
      favorito: true,
      criadoEm: new Date().toISOString(),
    });
    avisar("Salva nos favoritos");
  };

  return (
    <div className="card msg">
      <div className="msg-topo">
        <b>{m.titulo}</b>
      </div>
      <textarea className="msg-texto" value={texto} onChange={(e) => setTexto(e.target.value)} rows={Math.min(18, texto.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 40)), 1))} />
      <div className="script-acoes">
        <a className="btn prim peq zap" href={linkWhatsApp(lead.telefone, texto)} target="_blank" rel="noopener noreferrer" onClick={enviar}>
          Enviar no WhatsApp
        </a>
        <button className="btn peq" onClick={copiar}>Copiar</button>
        <button className="btn peq" onClick={salvar}>☆ Salvar</button>
        {texto !== original && (
          <button className="btn peq" onClick={() => setTexto(original)}>Desfazer edição</button>
        )}
      </div>
    </div>
  );
}
