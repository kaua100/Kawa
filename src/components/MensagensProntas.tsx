"use client";

import { useState } from "react";
import { avisar } from "@/lib/api";
import { segmentoPorId } from "@/lib/catalogo";
import { contextoZap, ETAPAS, linkWhatsApp, telefoneWhatsApp, type CtxZap, type MensagemPronta } from "@/lib/prontas";
import { adicionarContato, salvarScript, useEstado } from "@/lib/store";
import type { Lead } from "@/lib/types";

export default function MensagensProntas({ leadInicial, onCadastrar }: { leadInicial: string | null; onCadastrar: () => void }) {
  const { leads, vendedor } = useEstado();
  const [leadId, setLeadId] = useState(leadInicial ?? leads[0]?.id ?? "");
  const [etapa, setEtapa] = useState(ETAPAS[0].id);
  const lead = leads.find((l) => l.id === leadId) ?? null;

  if (leads.length === 0) {
    return (
      <div className="card vazio">
        <p style={{ margin: "0 0 6px", color: "var(--text)" }}>Cadastre um lead para ver as mensagens prontas.</p>
        <p style={{ margin: "0 0 16px" }}>As mensagens saem preenchidas com o nome, a empresa, a cidade e o segmento de cada lead.</p>
        <button className="btn prim" onClick={onCadastrar}>Ir para Leads</button>
      </div>
    );
  }

  const ctx = lead ? contextoZap(lead, vendedor) : null;
  const telOk = lead ? !!telefoneWhatsApp(lead.telefone) : false;
  const et = ETAPAS.find((e) => e.id === etapa)!;

  return (
    <>
      <div className="barra-filtros">
        <label className="campo">
          <span>Para quem vai a mensagem</span>
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
          <p className="dica" style={{ marginTop: -6 }}>
            {segmentoPorId(lead.segmento).nome} · {lead.responsavel ? `fala com ${lead.responsavel.split(" ")[0]}` : "sem nome do responsável (a mensagem começa com \"Oi, tudo bem?\")"} · {telOk ? `WhatsApp ${lead.telefone}` : "sem telefone válido"}
          </p>
          {!telOk && (
            <div className="aviso">
              Este lead não tem telefone válido. O botão vai abrir o WhatsApp para você escolher o contato. Para ir direto, cadastre o número com DDD.
            </div>
          )}
          {!vendedor && <div className="aviso">Preencha seu nome no menu lateral para ele entrar nas mensagens.</div>}

          <div className="chips">
            {ETAPAS.map((e) => (
              <button key={e.id} className={`chip ${e.id === etapa ? "ativo" : ""}`} onClick={() => setEtapa(e.id)}>
                {e.nome}
              </button>
            ))}
          </div>

          <div className="grade-msgs">
            {et.mensagens.map((m) => (
              <CardMensagem key={`${lead.id}:${m.id}:${vendedor}`} m={m} ctx={ctx!} lead={lead} etapaNome={et.nome} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function CardMensagem({ m, ctx, lead, etapaNome }: { m: MensagemPronta; ctx: CtxZap; lead: Lead; etapaNome: string }) {
  const [texto, setTexto] = useState(() => m.texto(ctx));
  const original = m.texto(ctx);

  const enviar = () => {
    adicionarContato(lead.id, {
      data: new Date().toISOString(),
      tipo: "whatsapp",
      resumo: `Enviou no WhatsApp: ${etapaNome} · ${m.titulo.replaceAll('"', "")}`,
    });
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
        {m.quando && <small>{m.quando}</small>}
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
