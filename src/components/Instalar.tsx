"use client";

import { useEffect, useState } from "react";
import { IcFechar } from "./Icones";

interface PedidoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let pedidoGuardado: PedidoInstalacao | null = null;
const ouvintes = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pedidoGuardado = e as PedidoInstalacao;
    ouvintes.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    pedidoGuardado = null;
    ouvintes.forEach((f) => f());
  });
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
}

const jaInstalado = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);

const ehIphone = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Estado da instalação: se dá para instalar, se é iPhone (passo a passo manual) ou se já está instalado. */
export function useInstalar() {
  const [, forcar] = useState(0);
  const [instalado, setInstalado] = useState(false);
  useEffect(() => {
    setInstalado(jaInstalado());
    const f = () => {
      setInstalado(jaInstalado());
      forcar((n) => n + 1);
    };
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  }, []);
  return {
    instalado,
    podeInstalar: Boolean(pedidoGuardado),
    iphone: ehIphone(),
    instalar: async () => {
      if (!pedidoGuardado) return false;
      await pedidoGuardado.prompt();
      const { outcome } = await pedidoGuardado.userChoice;
      pedidoGuardado = null;
      ouvintes.forEach((f) => f());
      return outcome === "accepted";
    },
  };
}

/** Faixa no Início sugerindo instalar. Some depois de instalar ou fechar. */
export function FaixaInstalar() {
  const { instalado, podeInstalar, iphone, instalar } = useInstalar();
  const [fechada, setFechada] = useState(true);
  const [passos, setPassos] = useState(false);

  useEffect(() => {
    try {
      setFechada(localStorage.getItem("mindstrat:instalar-fechado") === "1");
    } catch {
      setFechada(false);
    }
  }, []);

  if (instalado || fechada || (!podeInstalar && !iphone)) return null;

  const fechar = () => {
    setFechada(true);
    try {
      localStorage.setItem("mindstrat:instalar-fechado", "1");
    } catch {
      /* sem armazenamento */
    }
  };

  return (
    <>
      <div className="faixa-instalar">
        <img src="/icone-192.png" alt="" width={44} height={44} />
        <div>
          <b>Instale no celular</b>
          <small>Ícone na tela inicial</small>
        </div>
        <button className="btn prim" onClick={() => (iphone ? setPassos(true) : instalar())}>
          Instalar
        </button>
        <button className="btn icone" onClick={fechar} aria-label="Fechar">
          <IcFechar />
        </button>
      </div>
      {passos && <PassosIphone onFechar={() => setPassos(false)} />}
    </>
  );
}

export function PassosIphone({ onFechar }: { onFechar: () => void }) {
  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="card pad modal passos-iphone" onClick={(e) => e.stopPropagation()}>
        <h2>Adicionar à Tela de Início</h2>
        <ol>
          <li>Abra este site no <b>Safari</b>.</li>
          <li>Toque em <b>Compartilhar</b> <span aria-hidden>(o quadrado com a seta para cima)</span>.</li>
          <li>Role e toque em <b>Adicionar à Tela de Início</b>.</li>
          <li>Toque em <b>Adicionar</b>.</li>
        </ol>
        <button className="btn prim grande" onClick={onFechar}>Entendi</button>
      </div>
    </div>
  );
}
