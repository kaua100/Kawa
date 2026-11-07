"use client";

import { useEffect, useState } from "react";
import BuscarLeads from "@/components/BuscarLeads";
import Central, { type AbaCentral } from "@/components/Central";
import Leads from "@/components/Leads";
import Login, { NovaSenha } from "@/components/Login";
import { useIntegracoes } from "@/lib/api";
import { carregarDados, definirVendedor, exportarDados, importarDados, limparDados, useEstado } from "@/lib/store";
import { supabase } from "@/lib/supabase";

type Tela = "leads" | "buscar" | "central";

export default function Home() {
  const [sessao, setSessao] = useState<"verificando" | "fora" | "dentro" | "nova-senha">("verificando");
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setEmail(data.session.user.email ?? "");
        setSessao("dentro");
        carregarDados(data.session.user.id);
      } else setSessao("fora");
    });
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === "PASSWORD_RECOVERY") return setSessao("nova-senha");
      if (evento === "SIGNED_IN" && s) {
        setEmail(s.user.email ?? "");
        setSessao((atual) => {
          if (atual !== "dentro") carregarDados(s.user.id);
          return atual === "nova-senha" ? atual : "dentro";
        });
      }
      if (evento === "SIGNED_OUT") {
        limparDados();
        setSessao("fora");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (sessao === "verificando") return <div className="tela-carregando">Carregando...</div>;
  if (sessao === "fora") return <Login />;
  if (sessao === "nova-senha") return <NovaSenha onPronto={() => setSessao("dentro")} />;
  return <App email={email} />;
}

function App({ email }: { email: string }) {
  const { leads, scripts, vendedor, carregando } = useEstado();
  const integ = useIntegracoes();
  const [tela, setTela] = useState<Tela>("leads");
  const [abaCentral, setAbaCentral] = useState<AbaCentral>("prontas");
  const [leadSel, setLeadSel] = useState<string | null>(null);
  const [leadCentral, setLeadCentral] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const ouvir = (e: Event) => {
      setToast((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setToast(""), 2600);
    };
    window.addEventListener("aviso", ouvir);
    return () => window.removeEventListener("aviso", ouvir);
  }, []);

  const abrirCentral = (leadId: string, aba: AbaCentral) => {
    setLeadCentral(leadId);
    setAbaCentral(aba);
    setTela("central");
  };

  const exportar = () => {
    const blob = new Blob([exportarDados()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `conecta-prospector-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importar = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        await importarDados(await f.text());
        setToast("Dados importados");
      } catch {
        setToast("Arquivo inválido");
      }
    };
    input.click();
  };

  return (
    <div className="app">
      <aside className="side">
        <div className="logo">
          <div className="logo-mark">CD</div>
          <div>
            <b>Conecta Digital</b>
            <small>Prospector</small>
          </div>
        </div>
        <button className={`nav-btn ${tela === "leads" ? "ativo" : ""}`} onClick={() => setTela("leads")}>
          Leads <span className="qtd">{leads.length}</span>
        </button>
        <button className={`nav-btn ${tela === "buscar" ? "ativo" : ""}`} onClick={() => setTela("buscar")}>
          Buscar leads
        </button>
        <button className={`nav-btn ${tela === "central" ? "ativo" : ""}`} onClick={() => setTela("central")}>
          Central de Abordagem <span className="qtd">{scripts.length}</span>
        </button>
        <div className="side-rodape">
          <label htmlFor="vendedor">Seu nome (entra nas mensagens)</label>
          <input id="vendedor" value={vendedor} onChange={(e) => definirVendedor(e.target.value)} placeholder="Ex.: Kaua" />
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <button className="nav-btn" style={{ fontSize: 12, padding: "6px 8px" }} onClick={exportar}>Exportar</button>
            <button className="nav-btn" style={{ fontSize: 12, padding: "6px 8px" }} onClick={importar}>Importar</button>
            <button className="nav-btn" style={{ fontSize: 12, padding: "6px 8px" }} onClick={() => supabase.auth.signOut()}>Sair</button>
          </div>
          <small style={{ display: "block", marginTop: 8, opacity: 0.6, overflowWrap: "anywhere" }}>{email}</small>
        </div>
      </aside>

      <main className="main">
        {carregando ? (
          <div className="carregando"><span className="spinner" /> Carregando seus dados...</div>
        ) : tela === "leads" ? (
          <Leads
            selecionado={leadSel}
            setSelecionado={setLeadSel}
            onGerar={(id) => abrirCentral(id, "gerador")}
            onZap={(id) => abrirCentral(id, "prontas")}
            onBuscar={() => setTela("buscar")}
            temIA={integ.ia}
          />
        ) : tela === "buscar" ? (
          <BuscarLeads onImportados={() => setTela("leads")} />
        ) : (
          <Central
            key={leadCentral ?? "x"}
            aba={abaCentral}
            setAba={setAbaCentral}
            leadInicial={leadCentral}
            temIA={integ.ia}
            onCadastrar={() => setTela("leads")}
          />
        )}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
