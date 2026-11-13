"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { avisar, postar, useIntegracoes } from "@/lib/api";
import { linkSite, linkZap, qualificar, registrarEnvio, textoDaMensagem, type Temperatura } from "@/lib/acoes";
import { NICHOS_EM_ALTA, SEGMENTOS, SERVICOS, TERMO_MAPS, detectarSegmento, segmentoPorId } from "@/lib/catalogo";
import { telefoneWhatsApp } from "@/lib/prontas";
import { adicionarTokenApify, definirApifyToken, novoId, removerTokenApify, salvarLead, salvarVariosLeads, useEstado } from "@/lib/store";
import type { Lead, SegmentoId, ServicoId } from "@/lib/types";
import type { Encontrado } from "@/app/api/apify/status/route";
import { SeloTemperatura } from "./AcoesRapidas";
import { localParaBusca, localParaLead, SeletorLocal, type Local } from "./SeletorLocal";
import { IcInsta, IcPino, IcSite, IcZap } from "./Icones";

const chave = (nome: string, tel: string) => telefoneWhatsApp(tel) || nome.trim().toLowerCase();

/** Pesquisas guardadas no aparelho, para não sumirem ao sair da tela. */
interface PesquisaSalva {
  id: string;
  quando: string;
  segBusca: SegmentoId;
  local: string;
  encontrados: Encontrado[];
}
interface Pendente {
  runId: string;
  token: string;
  segBusca: SegmentoId;
  local: string;
  inicio: number;
}
const K_PESQUISAS = "mindstrat:pesquisas";
const K_PENDENTE = "mindstrat:pesquisa-pendente";
function ler<T>(k: string, padrao: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : padrao;
  } catch {
    return padrao;
  }
}
function gravar(k: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* sem armazenamento */
  }
}
const quandoCurto = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date().toDateString() === d.toDateString();
  return hoje
    ? `hoje ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export default function BuscarLeads({ onImportados, onAbrir }: { onImportados: () => void; onAbrir: (leadId: string) => void }) {
  const { leads, apifyToken, apifyTokens, vendedor } = useEstado();
  const integ = useIntegracoes();
  const [segmento, setSegmento] = useState<SegmentoId>("odontologia");
  const [busca, setBusca] = useState(TERMO_MAPS.odontologia);
  const [lugar, setLugar] = useState<Local>(() => {
    try {
      return JSON.parse(localStorage.getItem("mindstrat:local") || "") as Local;
    } catch {
      return { uf: "", cidade: "", bairro: "" };
    }
  });
  const local = localParaBusca(lugar);
  const mudarLugar = (l: Local) => {
    setLugar(l);
    try {
      localStorage.setItem("mindstrat:local", JSON.stringify(l));
    } catch {
      /* sem armazenamento */
    }
  };
  const [maximo, setMaximo] = useState(20);
  const [contatos, setContatos] = useState(false);
  const [servico, setServico] = useState<ServicoId>("site");
  const [novoToken, setNovoToken] = useState("");
  const [addAberto, setAddAberto] = useState(false);

  const [rodando, setRodando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState("");
  const [encontrados, setEncontrados] = useState<Encontrado[] | null>(null);
  const [segBusca, setSegBusca] = useState<SegmentoId>("odontologia");
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [soSemSite, setSoSemSite] = useState(false);
  const [temp, setTemp] = useState<"" | Temperatura>("");
  const [aberto, setAberto] = useState<number | null>(null);
  const [pesquisas, setPesquisas] = useState<PesquisaSalva[]>([]);
  const [atual, setAtual] = useState<string | null>(null);
  const parar = useRef(false);

  // Ao abrir a tela: recupera as pesquisas salvas e continua uma busca que ainda estava rodando.
  useEffect(() => {
    parar.current = false;
    const salvas = ler<PesquisaSalva[]>(K_PESQUISAS, []);
    setPesquisas(salvas);
    const pend = ler<Pendente | null>(K_PENDENTE, null);
    if (pend && Date.now() - pend.inicio < 30 * 60 * 1000) {
      setRodando(true);
      acompanhar(pend);
    } else {
      if (pend) gravar(K_PENDENTE, null);
      if (salvas[0]) abrirPesquisa(salvas[0]);
    }
    return () => { parar.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirPesquisa(p: PesquisaSalva) {
    setAtual(p.id);
    setSegBusca(p.segBusca);
    setEncontrados(p.encontrados);
    setMarcados(new Set());
    setTemp("");
    setSoSemSite(false);
    setAberto(null);
  }

  function apagarPesquisa(id: string) {
    const resto = pesquisas.filter((p) => p.id !== id);
    setPesquisas(resto);
    gravar(K_PESQUISAS, resto);
    if (atual === id) limpar();
  }

  const jaCadastrados = useMemo(() => new Set(leads.map((l) => chave(l.empresa, l.telefone))), [leads]);
  const temToken = Boolean(apifyTokens.length || integ.apify);

  const avaliados = useMemo(
    () =>
      (encontrados ?? [])
        .map((e, i) => {
          const seg = detectarSegmento(e.categoria, e.nome) ?? segBusca;
          return { e, i, seg, q: qualificar({ ...e, segmento: seg }) };
        })
        .sort((a, b) => b.q.pontos - a.q.pontos),
    [encontrados, segBusca],
  );
  const lista = avaliados.filter(({ e, q }) => (!soSemSite || !e.site) && (!temp || q.temperatura === temp));
  const contagem = (t: Temperatura) => avaliados.filter((x) => x.q.temperatura === t).length;

  function escolherNicho(s: SegmentoId) {
    setSegmento(s);
    setBusca(TERMO_MAPS[s]);
  }

  function limpar() {
    setAtual(null);
    setEncontrados(null);
    setMarcados(new Set());
    setTemp("");
    setSoSemSite(false);
  }

  async function buscar() {
    setErro("");
    setAtual(null);
    setEncontrados(null);
    setMarcados(new Set());
    setRodando(true);
    setSegundos(0);
    parar.current = false;
    const inicio = Date.now();
    const relogio = setInterval(() => setSegundos(Math.round((Date.now() - inicio) / 1000)), 1000);
    try {
      // Tenta o token em uso e, se ele estiver sem crédito ou inválido, passa para o próximo.
      const ordem = apifyTokens.length
        ? [...apifyTokens].sort((a, b) => (a.token === apifyToken ? -1 : b.token === apifyToken ? 1 : 0)).map((t) => t.token)
        : [""];
      let runId = "";
      let usado = "";
      for (const tk of ordem) {
        try {
          ({ runId } = await postar<{ runId: string }>("/api/apify/iniciar", { busca, local, maximo, contatos, token: tk }));
          usado = tk;
          break;
        } catch (e) {
          const codigo = (e as { codigo?: string }).codigo;
          if ((codigo === "sem-credito" || codigo === "invalido") && tk !== ordem.at(-1)) {
            const nome = apifyTokens.find((t) => t.token === tk)?.nome ?? "Conta";
            avisar(`${nome}: ${codigo === "sem-credito" ? "sem crédito" : "token inválido"}. Usando a próxima.`);
            continue;
          }
          throw e;
        }
      }
      if (usado && usado !== apifyToken) definirApifyToken(usado);
      const pend: Pendente = { runId, token: usado, segBusca: detectarSegmento(busca) ?? segmento, local, inicio };
      gravar(K_PENDENTE, pend);
      clearInterval(relogio);
      await acompanhar(pend);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro na busca");
      clearInterval(relogio);
      setRodando(false);
    }
  }

  /** Espera a Apify terminar e salva o resultado. Funciona também depois de sair e voltar para a tela. */
  async function acompanhar(pend: Pendente) {
    const relogio = setInterval(() => setSegundos(Math.round((Date.now() - pend.inicio) / 1000)), 1000);
    try {
      while (!parar.current) {
        await new Promise((r) => setTimeout(r, 5000));
        if (parar.current) return;
        const r = await postar<{ status: string; erro?: string; encontrados?: Encontrado[] }>("/api/apify/status", { runId: pend.runId, token: pend.token });
        if (r.status === "pronto") {
          const nova: PesquisaSalva = {
            id: pend.runId,
            quando: new Date().toISOString(),
            segBusca: pend.segBusca,
            local: pend.local.replace(/, Brasil$/, ""),
            encontrados: r.encontrados ?? [],
          };
          const lista = [nova, ...ler<PesquisaSalva[]>(K_PESQUISAS, []).filter((p) => p.id !== nova.id)].slice(0, 10);
          gravar(K_PESQUISAS, lista);
          gravar(K_PENDENTE, null);
          setPesquisas(lista);
          abrirPesquisa(nova);
          break;
        }
        if (r.status === "falhou") throw new Error(r.erro);
      }
    } catch (e) {
      gravar(K_PENDENTE, null);
      setErro(e instanceof Error ? e.message : "Erro na busca");
    } finally {
      clearInterval(relogio);
      if (!parar.current) setRodando(false);
    }
  }

  function paraLead(e: Encontrado, agora = new Date().toISOString()): Lead {
    return {
      id: novoId(),
      empresa: e.nome,
      responsavel: "",
      segmento: detectarSegmento(e.categoria, e.nome) ?? segBusca,
      cidade: e.cidade || localParaLead(lugar),
      telefone: e.telefone,
      site: e.site,
      siteStatus: e.site ? "ok" : "nao-encontrado",
      instagram: e.instagram,
      seguidores: "",
      infoPublica: [
        e.nota !== null ? `Nota ${String(e.nota).replace(".", ",")} no Google${e.avaliacoes !== null ? ` com ${e.avaliacoes} avaliações` : ""}` : "",
        e.categoria ? `categoria no Google: ${e.categoria}` : "",
      ].filter(Boolean).join("; "),
      endereco: e.endereco,
      mapa: e.mapa,
      nota: e.nota,
      avaliacoes: e.avaliacoes,
      origemLead: "apify",
      servicoInteresse: servico,
      status: "novo",
      contatos: [],
      criadoEm: agora,
    };
  }

  /** Lead já salvo para esta empresa, ou salva só ela agora. */
  function garantirLead(e: Encontrado): Lead {
    const k = chave(e.nome, e.telefone);
    const existente = leads.find((l) => chave(l.empresa, l.telefone) === k);
    if (existente) return existente;
    const novo = paraLead(e);
    salvarLead(novo);
    return novo;
  }

  function importar() {
    if (!encontrados) return;
    const agora = new Date().toISOString();
    const novos: Lead[] = [...marcados]
      .map((i) => encontrados[i])
      .filter((e) => e && !jaCadastrados.has(chave(e.nome, e.telefone)))
      .map((e) => paraLead(e, agora));
    if (!novos.length) return avisar("Nada novo para importar");
    salvarVariosLeads(novos);
    avisar(`${novos.length} ${novos.length === 1 ? "lead importado" : "leads importados"}. Eles já estão na lista de hoje.`);
    onImportados();
  }

  const alternar = (i: number) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const marcarVisiveis = (sim: boolean) =>
    setMarcados((m) => {
      const n = new Set(m);
      lista.forEach(({ e, i }) => {
        if (jaCadastrados.has(chave(e.nome, e.telefone))) return;
        if (sim) n.add(i);
        else n.delete(i);
      });
      return n;
    });

  return (
    <>


      <form
        className="card pad busca-form"
        onSubmit={(e) => { e.preventDefault(); if (temToken) buscar(); else setErro("Adicione um token da Apify."); }}
      >
        <div className="grade g3">
          <label className="campo">
            <span>Nicho</span>
            <select value={segmento} onChange={(e) => escolherNicho(e.target.value as SegmentoId)}>
              {[...NICHOS_EM_ALTA]
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.nome.charAt(0).toUpperCase() + s.nome.slice(1)}</option>
                ))}
            </select>
          </label>
          <SeletorLocal valor={lugar} onChange={mudarLugar} />
          <label className="campo">
            <span>Quantidade</span>
            <select value={maximo} onChange={(e) => setMaximo(Number(e.target.value))}>
              {[10, 20, 40, 60, 100].map((n) => <option key={n} value={n}>{n} empresas</option>)}
            </select>
          </label>
          <label className="campo">
            <span>Serviço que vai oferecer</span>
            <select value={servico} onChange={(e) => setServico(e.target.value as ServicoId)}>
              {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label className="check" style={{ alignSelf: "end", paddingBottom: 9 }}>
            <input type="checkbox" checked={contatos} onChange={(e) => setContatos(e.target.checked)} />
            Buscar Instagram também
          </label>
        </div>

        <div className="busca-pe">
          <button className="btn prim grande" type="submit" disabled={rodando}>
            {rodando ? `Buscando ${segmentoPorId(segmento).plural}... ${segundos}s` : `Buscar ${segmentoPorId(segmento).plural}`}
          </button>
          {rodando && <span className="dica">Leva de 1 a 3 minutos</span>}
          {erro && <span className="erro" style={{ margin: 0 }}>{erro}</span>}
        </div>

        <div className="contas">
          <span className="contas-rot">Apify</span>
          {apifyTokens.map((t) => (
            <span key={t.id} className={`conta-chip ${t.token === apifyToken ? "ativo" : ""}`}>
              <button type="button" onClick={() => definirApifyToken(t.token)} title="Usar esta conta">
                {t.nome} <small>•••{t.token.slice(-4)}</small>
              </button>
              <button
                type="button"
                className="conta-x"
                aria-label={`Remover ${t.nome}`}
                onClick={() => confirm(`Remover ${t.nome}?`) && removerTokenApify(t.id)}
              >
                ×
              </button>
            </span>
          ))}
          {addAberto || !apifyTokens.length ? (
            <span className="conta-add">
              <input
                type="password"
                value={novoToken}
                onChange={(e) => setNovoToken(e.target.value)}
                placeholder="Cole o token apify_api_..."
                autoComplete="off"
                aria-label="Novo token da Apify"
              />
              <button
                type="button"
                className="btn peq prim"
                disabled={!novoToken.trim()}
                onClick={() => {
                  adicionarTokenApify(novoToken);
                  setNovoToken("");
                  setAddAberto(false);
                }}
              >
                Adicionar
              </button>
            </span>
          ) : (
            <button type="button" className="conta-mais" onClick={() => setAddAberto(true)}>+ Token</button>
          )}
        </div>
      </form>

      {pesquisas.length > 0 && (
        <section className="pesquisas" aria-label="Pesquisas salvas">
          <h3>Pesquisas salvas</h3>
          <div className="pesquisas-lista">
            {pesquisas.map((p) => (
              <div key={p.id} className={`pesquisa ${atual === p.id ? "ativa" : ""}`}>
                <button type="button" onClick={() => abrirPesquisa(p)}>
                  <b>{segmentoPorId(p.segBusca).plural.charAt(0).toUpperCase() + segmentoPorId(p.segBusca).plural.slice(1)}</b>
                  <small>{p.local.split(",").slice(-2).join(",").trim()} · {p.encontrados.length} · {quandoCurto(p.quando)}</small>
                </button>
                <button type="button" className="pesquisa-x" onClick={() => apagarPesquisa(p.id)} aria-label="Apagar pesquisa">×</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {encontrados && (
        <section className="card resultados-card">
          <div className="resultados-cab">
            <div>
              <h2>{encontrados.length} encontradas</h2>
            </div>
            <div className="resultados-acoes">
              <button className="btn" onClick={limpar}>Limpar</button>
              <button className="btn prim" onClick={importar} disabled={!marcados.size}>
                Importar {marcados.size} {marcados.size === 1 ? "lead" : "leads"}
              </button>
            </div>
          </div>
          <div className="resultados-filtros">
            {(["", "quente", "morno", "frio"] as const).map((t) => (
              <button key={t || "todos"} className={`chip ${temp === t ? "ativo" : ""}`} onClick={() => setTemp(t)}>
                {t === "" ? `Todas (${encontrados.length})` : `${t.charAt(0).toUpperCase() + t.slice(1)}s (${contagem(t)})`}
              </button>
            ))}
            <label className="check">
              <input type="checkbox" checked={soSemSite} onChange={(e) => setSoSemSite(e.target.checked)} />
              Só sem site
            </label>
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button className="btn peq" onClick={() => marcarVisiveis(true)}>Marcar todas</button>
              <button className="btn peq" onClick={() => marcarVisiveis(false)}>Desmarcar</button>
            </span>
          </div>
          {lista.length === 0 ? (
            <div className="vazio">Nenhuma empresa com esse filtro.</div>
          ) : (
            <ul className="achados">
              {lista.map(({ e, i, q, seg }) => {
                const ja = jaCadastrados.has(chave(e.nome, e.telefone));
                return (
                  <li key={i} className={`achado ${ja ? "ja" : ""} ${marcados.has(i) ? "marcado" : ""}`}>
                    <label className="achado-check">
                      <input type="checkbox" disabled={ja} checked={marcados.has(i)} onChange={() => alternar(i)} aria-label={`Selecionar ${e.nome}`} />
                    </label>
                    <div className="achado-info" role="button" tabIndex={0} onClick={() => setAberto(aberto === i ? null : i)} onKeyDown={(ev) => ev.key === "Enter" && setAberto(aberto === i ? null : i)}>
                      <b>{e.nome}</b>
                      <small>{e.telefone || "Sem telefone"}</small>
                      <div className="achado-tags">
                        {!e.site && <span className="tag laranja">Sem site</span>}
                        {e.nota !== null && <span className="tag cinza">{String(e.nota).replace(".", ",")} ★ {e.avaliacoes !== null ? `(${e.avaliacoes})` : ""}</span>}
                        {seg !== segBusca && <span className="tag azul">{segmentoPorId(seg).nome}</span>}
                        {ja && <span className="tag azul">Já está na lista</span>}
                      </div>
                      {aberto === i && (
                        <dl className="achado-detalhes">
                          {e.categoria && <><dt>Categoria</dt><dd>{e.categoria}</dd></>}
                          {e.endereco && <><dt>Endereço</dt><dd>{e.endereco}</dd></>}
                          {e.site && <><dt>Site</dt><dd>{e.site}</dd></>}
                          {e.instagram && <><dt>Instagram</dt><dd>{e.instagram}</dd></>}
                        </dl>
                      )}
                    </div>
                    <div className="achado-lado">
                      <SeloTemperatura dados={{ ...e, segmento: seg }} />
                      <div className="achado-links">
                        {e.telefone && (
                          <a
                            className="btn zap icone"
                            href={linkZap(paraLead(e), textoDaMensagem(paraLead(e), "rot-abordagem", vendedor))}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chamar no WhatsApp com a primeira mensagem"
                            onClick={() => {
                              const l = garantirLead(e);
                              registrarEnvio(l, "rot-abordagem");
                              avisar(`${e.nome} foi para a sua lista.`);
                            }}
                          >
                            <IcZap />
                          </a>
                        )}
                        <button type="button" className="btn peq" onClick={() => onAbrir(garantirLead(e).id)}>Abrir</button>
                        {e.mapa && <a className="btn icone" href={e.mapa} target="_blank" rel="noopener noreferrer" title="Abrir no Maps"><IcPino /></a>}
                        {e.site && <a className="btn icone" href={linkSite(e.site)} target="_blank" rel="noopener noreferrer" title="Abrir site"><IcSite /></a>}
                        {e.instagram && <a className="btn icone" href={`https://instagram.com/${e.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" title="Abrir Instagram"><IcInsta /></a>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
