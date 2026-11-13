"use client";

import { useEffect, useRef, useState } from "react";
import Omnizapi, { OmnizapiError } from "@omnizapi/connect";
import type { OmnizapiClient } from "@omnizapi/connect";
import { avisar, postar } from "@/lib/api";
import { tokenAtual } from "@/lib/supabase";
import { atualizarZap, formatarFone, useZap } from "@/lib/zap";
import { IcZap } from "./Icones";

export default function Configuracoes({ onConversas }: { onConversas: () => void }) {
  return (
    <div className="config">
      <ConectarWhatsApp onConversas={onConversas} />
    </div>
  );
}

/** Motivos de falha do SDK @omnizapi/connect, em português. */
const MOTIVOS: Record<string, string> = {
  cancelled: "Conexão cancelada.",
  popup_closed: "A janela de conexão foi fechada antes de terminar.",
  not_completed: "A conexão não foi concluída. Tente de novo.",
  invalid_channel: "A Omni recusou o canal. Confira o ID do canal.",
  origin_not_allowed: "Este endereço não está autorizado na Omni. Em Segurança → Configurações da SDK → Domínios autorizados, adicione o endereço do painel.",
  unsupported_channel: "Este tipo de canal não é aceito pela janela de conexão.",
};
const CODIGOS: Record<string, string> = {
  POPUP_BLOCKED: "O navegador bloqueou a janela de conexão. Libere pop-ups para este site e toque de novo.",
  CONNECTION_IN_PROGRESS: "Já existe uma conexão em andamento nesta página.",
  INVALID_CONFIGURATION: "A Public Key da Omni está ausente ou inválida.",
  NETWORK_ERROR: "Falha de rede ao falar com a Omni.",
  TIMEOUT: "O tempo para ler o QR Code acabou. Tente de novo.",
  HTTP_ERROR: "A Omni respondeu com erro. Tente de novo em instantes.",
};

const PAGAMENTO: Record<string, string> = {
  PAID: "Pago",
  TRIAL: "Em teste",
  PENDING: "Pagamento pendente",
  BOLETO_PENDING: "Boleto pendente",
  CANCELLATION_PROCESS: "Em cancelamento",
  CANCELED: "Cancelado",
};

function ConectarWhatsApp({ onConversas }: { onConversas: () => void }) {
  const zap = useZap();
  const [ocupado, setOcupado] = useState("");
  const [msg, setMsg] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const cliente = useRef<OmnizapiClient | undefined>(undefined);
  const tentativa = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => tentativa.current?.abort(), []);

  async function criarCanal() {
    setMsg(null);
    setOcupado("canal");
    try {
      const r = await postar<{ id: string; criado: boolean }>("/api/zap/canal", {});
      setMsg({ tipo: "ok", texto: r.criado ? "Canal criado na Omni." : "O canal já existia; nada novo foi criado." });
      await atualizarZap();
    } catch (e) {
      setMsg({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setOcupado("");
    }
  }

  // A conexão abre a janela oficial da Omni. Chamada direto no clique, sem espera antes (exigência do SDK).
  async function conectar() {
    if (tentativa.current) return;
    const ctrl = new AbortController();
    tentativa.current = ctrl;
    setMsg(null);
    setOcupado("conectar");
    try {
      cliente.current ??= Omnizapi.newClient({ publicKey: zap.publicKey });
      const r = await cliente.current.connect({
        channelId: zap.canal,
        signal: ctrl.signal,
        getQRCode: async () => {
          const res = await fetch("/api/zap/qr-code", { headers: { Authorization: `Bearer ${await tokenAtual()}` }, cache: "no-store" });
          const body = (await res.json().catch(() => ({}))) as { qrcode?: string | null; connected?: boolean; message?: string | null };
          if (!res.ok) throw { status: res.status, message: body.message ?? null };
          return { connected: body.connected === true, value: body.qrcode ?? undefined };
        },
      });
      if (ctrl.signal.aborted) return;
      if (!r.success) {
        setMsg({ tipo: "erro", texto: MOTIVOS[r.reason] ?? "A conexão não foi concluída." });
        return;
      }
      // O SDK avisa que terminou, mas quem confirma a conexão real é a Omni.
      const s = await atualizarZap();
      if (s.conectado) {
        setMsg({ tipo: "ok", texto: "WhatsApp conectado." });
        avisar("WhatsApp conectado");
      } else {
        setMsg({ tipo: "erro", texto: "A janela terminou, mas a Omni ainda não confirmou a conexão. Aguarde alguns segundos e toque em Atualizar status." });
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setMsg({ tipo: "erro", texto: e instanceof OmnizapiError ? CODIGOS[e.code] ?? `Erro na conexão (${e.code}).` : "Não consegui confirmar a conexão. Toque em Atualizar status." });
    } finally {
      if (tentativa.current === ctrl) tentativa.current = undefined;
      setOcupado("");
    }
  }

  async function atualizar() {
    setOcupado("status");
    await atualizarZap();
    setOcupado("");
  }

  const status = !zap.carregado
    ? { classe: "neutro", texto: "Verificando..." }
    : !zap.configurado
      ? { classe: "neutro", texto: "Não configurado" }
      : !zap.canal
        ? { classe: "neutro", texto: "Sem canal" }
        : zap.conectado
          ? { classe: "ok", texto: "Conectado" }
          : ocupado === "conectar"
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
          <p>Falta a <b>Secret Key</b> da Z-API Omni no servidor. Na Vercel, adicione <code>OMNI_SECRET_KEY</code> e publique de novo.</p>
        </div>
      )}

      {zap.configurado && !zap.canal && (
        <div className="zap-desconectado">
          <p>Crie o canal WhatsApp Web na Omni. É feito uma vez só, e cada canal é cobrado no seu plano da Omni.</p>
          <div className="zap-botoes">
            <button className="btn prim" disabled={!!ocupado} onClick={criarCanal}>{ocupado === "canal" ? "Criando..." : "Criar canal"}</button>
          </div>
        </div>
      )}

      {zap.canal && !zap.canalNaVariavel && (
        <div className="zap-canal">
          <p>Cadastre este ID na Vercel como <code>OMNI_CHANNEL_ID</code>. O painel já usa o canal enquanto isso.</p>
          <div className="zap-copiar">
            <code>{zap.canal}</code>
            <button className="btn peq" onClick={() => navigator.clipboard?.writeText(zap.canal).then(() => avisar("ID copiado"))}>Copiar</button>
          </div>
        </div>
      )}

      {zap.canal && zap.conectado && (
        <div className="zap-conectado">
          <dl>
            <dt>Número</dt>
            <dd>{zap.numero ? formatarFone(zap.numero) : "Aparece na primeira mensagem recebida"}</dd>
            {zap.pagamento && <><dt>Assinatura</dt><dd>{PAGAMENTO[zap.pagamento] ?? zap.pagamento}</dd></>}
          </dl>
          <div className="zap-botoes">
            <button className="btn prim" onClick={onConversas}>Abrir conversas</button>
            <button className="btn" disabled={!!ocupado} onClick={atualizar}>{ocupado === "status" ? "Atualizando..." : "Atualizar status"}</button>
          </div>
          <details className="zap-desconectar">
            <summary>Como desconectar</summary>
            <p>A Omni não oferece desconexão do WhatsApp Web pela API. Para desconectar, no celular abra o WhatsApp → <b>Aparelhos conectados</b> → toque no aparelho → <b>Desconectar</b>. O painel mostra a mudança em seguida.</p>
          </details>
        </div>
      )}

      {zap.canal && !zap.conectado && (
        <div className="zap-desconectado">
          <p>Toque em <b>Conectar número</b>. Vai abrir a janela da Omni com o QR Code.</p>
          <ol className="zap-passos">
            <li>No celular, abra o WhatsApp.</li>
            <li>Entre em <b>Aparelhos conectados</b> e toque em <b>Conectar aparelho</b>.</li>
            <li>Aponte a câmera para o QR Code da janela.</li>
          </ol>
          <div className="zap-botoes">
            <button className="btn zap" disabled={!!ocupado || !zap.publicKey} onClick={conectar}>
              <IcZap /> <span>{ocupado === "conectar" ? "Aguardando o QR Code..." : "Conectar número"}</span>
            </button>
            <button className="btn" disabled={!!ocupado} onClick={atualizar}>{ocupado === "status" ? "Atualizando..." : "Atualizar status"}</button>
          </div>
          {!zap.publicKey && <small className="dica">Falta a variável <code>NEXT_PUBLIC_OMNI_PUBLIC_KEY</code> na Vercel.</small>}
        </div>
      )}

      {(msg || zap.erro) && <p className={msg?.tipo === "ok" ? "zap-ok" : "erro zap-erro"}>{msg?.texto ?? zap.erro}</p>}
    </section>
  );
}
