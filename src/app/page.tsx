"use client";

import { useCallback, useEffect, useState } from "react";
import BuscarLeads from "@/components/BuscarLeads";
import Central, { type AbaCentral } from "@/components/Central";
import FichaLead from "@/components/FichaLead";
import Hoje from "@/components/Hoje";
import { IcBusca, IcGrafico, IcHoje, IcLeads, IcMsg, IcSair, IcVoltar } from "@/components/Icones";
import Leads from "@/components/Leads";
import Login, { NovaSenha } from "@/components/Login";
import Resultados from "@/components/Resultados";
import { useIntegracoes } from "@/lib/api";
import { filaDeHoje } from "@/lib/acoes";
import { carregarDados, definirVendedor, exportarDados, importarDados, limparDados, useEstado } from "@/lib/store";
import { supabase } from "@/lib/supabase";

type Tela = "hoje" | "leads" | "funil" | "buscar" | "central" | "resultados";

interface Rota {
  tela: Tela;
  ficha: string | null;
  aba?: AbaCentral;
  lead?: string | null;
}

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

  if (sessao === "verificando") return <div className="tela-carregando"><span className="spinner" /></div>;
  if (sessao === "fora") return <Login />;
  if (sessao === "nova-senha") return <NovaSenha onPronto={() => setSessao("dentro")} />;
  return <App email={email} />;
}

const NAV: { tela: Tela; nome: string; curto: string; Icone: () => React.ReactElement }[] = [
  { tela: "hoje", nome: "Hoje", curto: "Hoje", Icone: IcHoje },
  { tela: "leads", nome: "Leads", curto: "Leads", Icone: IcLeads },
  { tela: "buscar", nome: "Buscar empresas", curto: "Buscar", Icone: IcBusca },
  { tela: "central", nome: "Mensagens", curto: "Mensagens", Icone: IcMsg },
  { tela: "resultados", nome: "Resultados", curto: "Resultados", Icone: IcGrafico },
];

const TITULO: Record<Tela, string> = {
  hoje: "Hoje",
  leads: "Leads",
  funil: "Funil",
  buscar: "Buscar empresas",
  central: "Mensagens",
  resultados: "Resultados",
};

function App({ email }: { email: string }) {
  const { leads, vendedor, carregando } = useEstado();
  const integ = useIntegracoes();
  const [rota, setRota] = useState<Rota>({ tela: "hoje", ficha: null });
  const [toast, setToast] = useState("");

  // Navegação ligada ao histórico do navegador: o botão voltar do celular funciona.
  useEffect(() => {
    window.history.replaceState({ tela: "hoje", ficha: null }, "");
    const pop = (e: PopStateEvent) => setRota((e.state as Rota) ?? { tela: "hoje", ficha: null });
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  const ir = useCallback((nova: Partial<Rota>) => {
    setRota((atual) => {
      const r: Rota = { ...atual, ficha: null, ...nova };
      window.history.pushState(r, "");
      window.scrollTo({ top: 0 });
      return r;
    });
  }, []);

  const abrirFicha = useCallback((id: string) => {
    setRota((atual) => {
      const r = { ...atual, ficha: id };
      window.history.pushState(r, "");
      return r;
    });
  }, []);

  const voltar = useCallback(() => window.history.back(), []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const ouvir = (e: Event) => {
      setToast((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setToast(""), 2800);
    };
    window.addEventListener("aviso", ouvir);
    return () => window.removeEventListener("aviso", ouvir);
  }, []);

  const exportar = () => {
    const blob = new Blob([exportarDados()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mindstrat-prospector-${new Date().toISOString().slice(0, 10)}.json`;
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

  const naFila = filaDeHoje(leads).length;
  const telaNav = rota.tela === "funil" ? "leads" : rota.tela;

  return (
    <div className="app">
      <aside className="side">
        <div className="marca">
          <div className="marca-sinal" aria-hidden>M</div>
          <div>
            <b>Mindstrat</b>
            <small>Prospector</small>
          </div>
        </div>
        <nav className="nav" aria-label="Principal">
          {NAV.map(({ tela, nome, curto, Icone }) => (
            <button key={tela} className={`nav-btn ${telaNav === tela ? "ativo" : ""}`} onClick={() => ir({ tela })} aria-current={telaNav === tela ? "page" : undefined}>
              <Icone />
              <span className="nav-nome">{nome}</span>
              <span className="nav-curto">{curto}</span>
              {tela === "hoje" && naFila > 0 && <span className="nav-qtd">{naFila}</span>}
              {tela === "leads" && <span className="nav-qtd fraco">{leads.length}</span>}
            </button>
          ))}
        </nav>
        <div className="side-rodape">
          <label htmlFor="vendedor">Seu nome nas mensagens</label>
          <input id="vendedor" value={vendedor} onChange={(e) => definirVendedor(e.target.value)} placeholder="Ex.: Kaua" />
          <div className="side-links">
            <button onClick={exportar}>Fazer backup</button>
            <button onClick={importar}>Restaurar</button>
          </div>
          <div className="conta">
            <small>{email}</small>
            <button onClick={() => supabase.auth.signOut()} aria-label="Sair da conta" title="Sair"><IcSair /></button>
          </div>
        </div>
      </aside>

      <header className="barra-mobile">
        {rota.tela !== "hoje" ? (
          <button className="voltar" onClick={voltar}><IcVoltar /> Voltar</button>
        ) : (
          <div className="marca mini"><div className="marca-sinal" aria-hidden>M</div><b>Mindstrat</b></div>
        )}
        <span className="barra-titulo">{rota.tela !== "hoje" ? TITULO[rota.tela] : ""}</span>
        <button className="sair-mobile" onClick={() => supabase.auth.signOut()} aria-label="Sair da conta"><IcSair /></button>
      </header>

      <main className="main">
        {rota.tela !== "hoje" && (
          <button className="voltar voltar-desk" onClick={voltar}><IcVoltar /> Voltar</button>
        )}
        {carregando ? (
          <div className="carregando"><span className="spinner" /> Carregando seus dados...</div>
        ) : rota.tela === "hoje" ? (
          <Hoje onAbrir={abrirFicha} onBuscar={() => ir({ tela: "buscar" })} onFunil={() => ir({ tela: "funil" })} onResultados={() => ir({ tela: "resultados" })} />
        ) : rota.tela === "leads" || rota.tela === "funil" ? (
          <Leads key={rota.tela} onAbrir={abrirFicha} onBuscar={() => ir({ tela: "buscar" })} visaoInicial={rota.tela === "funil" ? "funil" : "lista"} />
        ) : rota.tela === "buscar" ? (
          <BuscarLeads onImportados={() => ir({ tela: "hoje" })} />
        ) : rota.tela === "resultados" ? (
          <Resultados />
        ) : (
          <Central
            key={rota.lead ?? "x"}
            aba={rota.aba ?? "prontas"}
            setAba={(aba) => setRota((r) => ({ ...r, aba }))}
            leadInicial={rota.lead ?? null}
            temIA={integ.ia}
            onCadastrar={() => ir({ tela: "leads" })}
          />
        )}
      </main>

      <nav className="nav-mobile" aria-label="Principal">
        {NAV.map(({ tela, curto, Icone }) => (
          <button key={tela} className={telaNav === tela ? "ativo" : ""} onClick={() => ir({ tela })} aria-current={telaNav === tela ? "page" : undefined}>
            <span className="nm-icone"><Icone />{tela === "hoje" && naFila > 0 && <i>{naFila > 99 ? "99+" : naFila}</i>}</span>
            <span>{curto}</span>
          </button>
        ))}
      </nav>

      {rota.ficha && (
        <FichaLead
          leadId={rota.ficha}
          onFechar={voltar}
          onMensagens={(id) => ir({ tela: "central", aba: "prontas", lead: id })}
          onIA={integ.ia ? (id) => ir({ tela: "central", aba: "gerador", lead: id }) : undefined}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
