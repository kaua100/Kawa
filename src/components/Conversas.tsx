"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { avisar, postar, useIntegracoes } from "@/lib/api";
import { reais, sugerirPreco } from "@/lib/acoes";
import { segmentoPorId, STATUS } from "@/lib/catalogo";
import { marcarLida, montarConversas, useConversas, type Conversa, type MsgZap } from "@/lib/conversas";
import { adicionarContato, useEstado } from "@/lib/store";
import { telefoneWhatsApp } from "@/lib/prontas";
import { chaveFone, enviarPeloZap, formatarFone, useZap } from "@/lib/zap";
import { Avatar } from "./AcoesRapidas";
import { IcEnviar, IcVoltar } from "./Icones";

const hora = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date().toDateString() === d.toDateString();
  return hoje ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

const ticks = (s: string | null) => (s === "READ" || s === "PLAYED" ? "✓✓" : s === "RECEIVED" ? "✓✓" : s === "SENT" ? "✓" : "");

export default function Conversas({ abrirChave, onAbrirLead, onConectar }: { abrirChave?: string; onAbrirLead: (id: string) => void; onConectar: () => void }) {
  const { msgs, lidas, carregado } = useConversas();
  const { leads } = useEstado();
  const zap = useZap();
  const [sel, setSel] = useState<string | null>(abrirChave ?? null);
  const [filtro, setFiltro] = useState("");

  const conversas = useMemo(() => montarConversas(msgs, lidas, leads), [msgs, lidas, leads]);
  const visiveis = conversas.filter((c) => !filtro || `${c.nome} ${c.telefone}`.toLowerCase().includes(filtro.toLowerCase()));
  // Conversa nova com um lead que ainda não tem mensagens.
  const atual: Conversa | undefined =
    conversas.find((c) => c.chave === sel) ??
    (() => {
      const lead = sel ? leads.find((l) => chaveFone(l.telefone) === sel) : undefined;
      const tel = lead ? telefoneWhatsApp(lead.telefone) : "";
      if (!lead || !tel) return undefined;
      const vazia: MsgZap = { id: -1, telefone: tel, nome: lead.empresa, de_mim: true, texto: "", tipo: "texto", message_id: null, status: null, lead_id: lead.id, momento: "" };
      return { chave: sel!, telefone: tel, nome: lead.empresa, ultima: vazia, naoLidas: 0, lead };
    })();

  useEffect(() => {
    if (abrirChave) setSel(abrirChave);
  }, [abrirChave]);

  return (
    <div className={`conversas ${atual ? "com-conversa" : ""}`}>
      {zap.carregado && !(zap.configurado && zap.conectado) && (
        <div className="aviso-zap">
          <span>{zap.configurado ? "WhatsApp desconectado. As mensagens novas não chegam até conectar de novo." : "Conecte seu WhatsApp para conversar por aqui."}</span>
          <button className="btn peq" onClick={onConectar}>Conectar</button>
        </div>
      )}
      <div className="conversas-grade">
        <aside className="conversas-lista card">
          <input className="sel" placeholder="Buscar conversa" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Buscar conversa" />
          {!carregado ? (
            <div className="conversas-vazio"><span className="spinner" /></div>
          ) : visiveis.length === 0 ? (
            <p className="conversas-vazio">{conversas.length ? "Nada encontrado." : "Nenhuma conversa ainda. As mensagens enviadas e recebidas aparecem aqui."}</p>
          ) : (
            <ul>
              {visiveis.map((c) => (
                <li key={c.chave}>
                  <button className={`conversa-item ${c.chave === sel ? "ativa" : ""}`} onClick={() => setSel(c.chave)}>
                    <Avatar nome={c.nome || c.telefone} />
                    <span className="ci-texto">
                      <b>{c.nome || formatarFone(c.telefone)}</b>
                      <small>{c.ultima.de_mim ? "Você: " : ""}{c.ultima.texto}</small>
                    </span>
                    <span className="ci-lado">
                      <small>{hora(c.ultima.momento)}</small>
                      {c.naoLidas > 0 && <i className="ci-qtd">{c.naoLidas}</i>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        {atual ? (
          <Conversa key={atual.chave} c={atual} msgs={msgs} onVoltar={() => setSel(null)} onAbrirLead={onAbrirLead} podeEnviar={zap.conectado} />
        ) : (
          <div className="conversa-vazia card"><p>Escolha uma conversa.</p></div>
        )}
      </div>
    </div>
  );
}

function Conversa({ c, msgs, onVoltar, onAbrirLead, podeEnviar }: { c: Conversa; msgs: MsgZap[]; onVoltar: () => void; onAbrirLead: (id: string) => void; podeEnviar: boolean }) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pensando, setPensando] = useState(false);
  const integ = useIntegracoes();
  const { vendedor } = useEstado();
  const fim = useRef<HTMLDivElement>(null);
  const lista = useMemo(
    () => msgs.filter((m) => m.telefone === c.telefone || (m.telefone.slice(-8) === c.telefone.slice(-8) && m.telefone.slice(2, 4) === c.telefone.slice(2, 4))).sort((a, b) => (a.momento < b.momento ? -1 : 1)),
    [msgs, c.telefone],
  );

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
    const ultima = lista.at(-1);
    if (ultima) marcarLida(c.chave, ultima.momento);
  }, [lista, c.chave]);

  async function sugerir() {
    setPensando(true);
    try {
      const l = c.lead;
      const r = await postar<{ texto: string }>("/api/zap/sugerir", {
        historico: lista.filter((m) => m.texto).map((m) => ({ de_mim: m.de_mim, texto: m.texto })),
        empresa: l?.empresa ?? c.nome,
        nicho: l ? segmentoPorId(l.segmento).nome : undefined,
        etapa: l ? STATUS.find((s) => s.id === l.status)?.nome : undefined,
        preco: l ? reais(l.valor ?? sugerirPreco(l).sugerido) : undefined,
        vendedor,
      });
      setTexto(r.texto);
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setPensando(false);
    }
  }

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    try {
      await enviarPeloZap(c.telefone, t, c.lead?.id);
      setTexto("");
      if (c.lead) adicionarContato(c.lead.id, { data: new Date().toISOString(), tipo: "whatsapp", resumo: t.slice(0, 120) });
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="conversa card">
      <header className="conversa-cab">
        <button className="btn icone so-mobile" onClick={onVoltar} aria-label="Voltar para a lista"><IcVoltar /></button>
        <Avatar nome={c.nome || c.telefone} />
        <div className="conversa-quem">
          <b>{c.nome || formatarFone(c.telefone)}</b>
          <small>{formatarFone(c.telefone)}</small>
        </div>
        {c.lead && <button className="btn peq" onClick={() => onAbrirLead(c.lead!.id)}>Ver lead</button>}
      </header>
      <div className="conversa-msgs">
        {lista.map((m) => (
          <div key={m.message_id ?? m.id} className={`bolha ${m.de_mim ? "minha" : ""}`}>
            <p>{m.texto}</p>
            <small>
              {hora(m.momento)} {m.de_mim && <span className={`tick ${m.status === "READ" || m.status === "PLAYED" ? "lido" : ""}`}>{ticks(m.status)}</span>}
            </small>
          </div>
        ))}
        <div ref={fim} />
      </div>
      <form
        className="conversa-envio"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <textarea
          value={texto}
          rows={1}
          placeholder={podeEnviar ? "Escreva uma mensagem" : "Conecte o WhatsApp para enviar"}
          disabled={!podeEnviar}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              enviar();
            }
          }}
        />
        {integ.ia && (
          <button type="button" className="btn peq conversa-ia" onClick={sugerir} disabled={pensando || !lista.length} title="Sugerir resposta com IA">
            {pensando ? "..." : "IA"}
          </button>
        )}
        <button className="btn zap icone" type="submit" disabled={!podeEnviar || enviando || !texto.trim()} aria-label="Enviar"><IcEnviar /></button>
      </form>
    </section>
  );
}
