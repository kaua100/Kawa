"use client";

import { useEffect, useRef, useState } from "react";
import { avisar, postar } from "@/lib/api";
import { atualizarZap, formatarFone, useZap } from "@/lib/zap";
import { IcZap } from "./Icones";

export default function Configuracoes({ onConversas }: { onConversas: () => void }) {
  return (
    <div className="config">
      <ConectarWhatsApp onConversas={onConversas} />
    </div>
  );
}

function ConectarWhatsApp({ onConversas }: { onConversas: () => void }) {
  const zap = useZap();
  const [conectando, setConectando] = useState(false);
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");
  const parar = useRef(false);

  // Enquanto o QR está na tela, confere o status a cada 3 segundos (o QR da Z-API muda sozinho).
  useEffect(() => {
    if (!conectando) return;
    parar.current = false;
    let t: ReturnType<typeof setTimeout>;
    const ciclo = async () => {
      const s = await atualizarZap(true);
      if (parar.current) return;
      if (s.conectado) {
        setConectando(false);
        avisar("WhatsApp conectado");
        return;
      }
      t = setTimeout(ciclo, 3000);
    };
    ciclo();
    const limite = setTimeout(() => {
      setConectando(false);
      setErro("O QR Code expirou. Toque em Conectar número para gerar outro.");
    }, 4 * 60 * 1000);
    return () => {
      parar.current = true;
      clearTimeout(t);
      clearTimeout(limite);
    };
  }, [conectando]);

  async function conectar() {
    setErro("");
    setOcupado("conectar");
    try {
      await postar("/api/zap/conectar", {});
      setConectando(true);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado("");
    }
  }

  async function acao(rota: "reconectar" | "desconectar") {
    if (rota === "desconectar" && !window.confirm("Desconectar o WhatsApp do painel? Para voltar, vai precisar ler o QR Code de novo.")) return;
    setErro("");
    setOcupado(rota);
    try {
      await postar(`/api/zap/${rota}`, {});
      avisar(rota === "desconectar" ? "WhatsApp desconectado" : "Reiniciando a conexão...");
      setTimeout(() => atualizarZap(), rota === "reconectar" ? 6000 : 500);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado("");
    }
  }

  const status = !zap.carregado
    ? { classe: "neutro", texto: "Verificando..." }
    : !zap.configurado
      ? { classe: "neutro", texto: "Não configurado" }
      : zap.conectado
        ? zap.celularOnline === false
          ? { classe: "alerta", texto: "Conectado, celular sem internet" }
          : { classe: "ok", texto: "Conectado" }
        : conectando
          ? { classe: "alerta", texto: "Aguardando leitura do QR Code" }
          : { classe: "erro", texto: "Desconectado" };

  return (
    <section className="card pad zap-conexao">
      <div className="zap-cab">
        <span className="zap-logo"><IcZap /></span>
        <div>
          <h2>Conectar WhatsApp</h2>
          <span className={`zap-status ${status.classe}`}><i />{status.texto}</span>
        </div>
      </div>

      {zap.carregado && !zap.configurado && (
        <div className="zap-instrucoes">
          <p>Para conectar, falta configurar a Z-API no servidor:</p>
          <ol>
            <li>Crie uma conta em <a href="https://www.z-api.io" target="_blank" rel="noopener noreferrer">z-api.io</a> e crie uma instância.</li>
            <li>Copie o <b>ID da instância</b> e o <b>Token</b>. Em Segurança, gere o <b>Token de segurança da conta</b>.</li>
            <li>Na Vercel, adicione as variáveis <code>ZAPI_INSTANCE_ID</code>, <code>ZAPI_TOKEN</code>, <code>ZAPI_CLIENT_TOKEN</code> e <code>ZAPI_WEBHOOK_SECRET</code> e publique de novo.</li>
          </ol>
        </div>
      )}

      {zap.configurado && zap.conectado && (
        <div className="zap-conectado">
          <dl>
            <dt>Número</dt>
            <dd>{zap.numero ? formatarFone(zap.numero) : "—"}</dd>
            {zap.nome && <><dt>Nome</dt><dd>{zap.nome}</dd></>}
          </dl>
          <div className="zap-botoes">
            <button className="btn prim" onClick={onConversas}>Abrir conversas</button>
            <button className="btn" disabled={!!ocupado} onClick={() => acao("reconectar")}>{ocupado === "reconectar" ? "Reiniciando..." : "Reconectar"}</button>
            <button className="btn perigo" disabled={!!ocupado} onClick={() => acao("desconectar")}>{ocupado === "desconectar" ? "Desconectando..." : "Desconectar"}</button>
          </div>
        </div>
      )}

      {zap.configurado && !zap.conectado && !conectando && (
        <div className="zap-desconectado">
          <p>Conecte seu número uma vez e envie, receba e acompanhe as conversas aqui no painel.</p>
          <div className="zap-botoes">
            <button className="btn zap" disabled={!!ocupado} onClick={conectar}>
              <IcZap /> <span>{ocupado === "conectar" ? "Preparando..." : "Conectar número"}</span>
            </button>
            <button className="btn" disabled={!!ocupado} onClick={() => acao("reconectar")}>Reiniciar sessão</button>
          </div>
          {zap.detalhe && <small className="dica">Z-API: {zap.detalhe}</small>}
        </div>
      )}

      {conectando && !zap.conectado && (
        <div className="zap-qr">
          <div className="zap-qr-img">
            {zap.qr ? <img src={zap.qr} alt="QR Code para conectar o WhatsApp" width={264} height={264} /> : <span className="spinner" />}
          </div>
          <ol>
            <li>Abra o WhatsApp no celular.</li>
            <li>Toque em <b>Mais opções</b> (⋮) ou <b>Configurações</b>.</li>
            <li>Entre em <b>Aparelhos conectados</b> e toque em <b>Conectar aparelho</b>.</li>
            <li>Aponte a câmera para este QR Code.</li>
          </ol>
          <button className="btn" onClick={() => setConectando(false)}>Cancelar</button>
        </div>
      )}

      {(erro || zap.erro) && <p className="erro zap-erro">{erro || zap.erro}</p>}
    </section>
  );
}
