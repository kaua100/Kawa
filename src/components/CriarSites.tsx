"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { avisar, postar, useIntegracoes } from "@/lib/api";
import {
  apagarProjeto,
  baixarZip,
  criarProjeto,
  dadosDoLead,
  dadosVazios,
  enviarArquivo,
  ESTILOS,
  listarProjetos,
  salvarProjeto,
  SECOES,
  type DadosSite,
  type MidiaSite,
  type ProjetoSite,
} from "@/lib/sites";
import { alterarLead, useEstado } from "@/lib/store";
import { IcBaixar, IcVoltar } from "./Icones";

type Aba = "dados" | "estilo" | "midias" | "ia";

export default function CriarSites({ leadInicial, onAbrirLead }: { leadInicial?: string | null; onAbrirLead: (id: string) => void }) {
  const { leads } = useEstado();
  const integ = useIntegracoes();
  const [projetos, setProjetos] = useState<ProjetoSite[] | null>(null);
  const [aberto, setAberto] = useState<ProjetoSite | null>(null);
  const [erro, setErro] = useState("");
  const [novoLead, setNovoLead] = useState("");
  const iniciou = useRef(false);

  const carregar = useCallback(async () => {
    try {
      const p = await listarProjetos();
      setProjetos(p);
      return p;
    } catch (e) {
      setErro((e as Error).message);
      setProjetos([]);
      return [];
    }
  }, []);

  async function novo(leadId: string) {
    setErro("");
    try {
      const l = leads.find((x) => x.id === leadId);
      const p = await criarProjeto(l ? `Site ${l.empresa}` : "Novo site", l ? dadosDoLead(l) : dadosVazios(), l?.id ?? null);
      setProjetos((x) => [p, ...(x ?? [])]);
      setAberto(p);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  // Veio de "Criar site para esta empresa": abre o projeto do lead ou cria um novo.
  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;
    carregar().then((lista) => {
      if (!leadInicial) return;
      const existente = lista.find((p) => p.lead_id === leadInicial);
      if (existente) setAberto(existente);
      else if (leads.some((l) => l.id === leadInicial)) novo(leadInicial);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (aberto) {
    return (
      <Editor
        key={aberto.id}
        inicial={aberto}
        temGemini={integ.gemini || !integ.carregado}
        temVercel={integ.vercel || !integ.carregado}
        onFechar={(p) => {
          setProjetos((x) => (x ?? []).map((y) => (y.id === p.id ? p : y)).sort((a, b) => (a.atualizado_em < b.atualizado_em ? 1 : -1)));
          setAberto(null);
        }}
        onAbrirLead={onAbrirLead}
      />
    );
  }

  return (
    <div className="sites">
      {integ.carregado && !integ.gemini && <AvisoGemini />}
      <section className="card pad sites-novo">
        <h2>Novo site</h2>
        <div className="sites-novo-linha">
          <select className="sel" value={novoLead} onChange={(e) => setNovoLead(e.target.value)} aria-label="Empresa">
            <option value="">Escolha uma empresa da prospecção</option>
            {leads
              .slice()
              .sort((a, b) => a.empresa.localeCompare(b.empresa))
              .map((l) => (
                <option key={l.id} value={l.id}>{l.empresa}{l.cidade ? ` (${l.cidade.split("/")[0]})` : ""}</option>
              ))}
          </select>
          <button className="btn prim" disabled={!novoLead} onClick={() => novo(novoLead)}>Criar site</button>
          <button className="btn" onClick={() => novo("")}>Em branco</button>
        </div>
      </section>

      {erro && <p className="erro">{erro}</p>}

      <h3 className="sites-titulo">Projetos salvos</h3>
      {projetos === null ? (
        <div className="carregando"><span className="spinner" /></div>
      ) : projetos.length === 0 ? (
        <p className="vazio-texto">Nenhum site ainda. Escolha uma empresa acima.</p>
      ) : (
        <div className="sites-grade">
          {projetos.map((p) => (
            <article key={p.id} className="card site-card">
              <button className="site-miniatura" onClick={() => setAberto(p)} aria-label={`Abrir ${p.nome}`}>
                {p.html ? <iframe title={p.nome} srcDoc={p.html} sandbox="" tabIndex={-1} loading="lazy" /> : <span>Ainda não gerado</span>}
              </button>
              <div className="site-card-pe">
                <div>
                  <b>{p.nome}</b>
                  <small>
                    {p.publicado_url ? <a href={p.publicado_url} target="_blank" rel="noopener noreferrer">No ar: {p.publicado_url.replace("https://", "")}</a> : `Editado em ${new Date(p.atualizado_em).toLocaleDateString("pt-BR")}`}
                  </small>
                </div>
                <button className="btn peq" onClick={() => setAberto(p)}>Editar</button>
                <button
                  className="btn peq perigo"
                  onClick={async () => {
                    if (!window.confirm(`Apagar "${p.nome}" e as mídias dele?`)) return;
                    try {
                      await apagarProjeto(p);
                      setProjetos((x) => (x ?? []).filter((y) => y.id !== p.id));
                    } catch (e) {
                      avisar((e as Error).message);
                    }
                  }}
                >
                  Apagar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function AvisoGemini() {
  return (
    <div className="aviso-zap sites-aviso">
      <span>
        Falta a chave do Gemini. No Google AI Studio, crie uma chave em um projeto <b>sem faturamento</b> e coloque na Vercel como <code>GEMINI_API_KEY</code>.
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Editor({ inicial, temGemini, temVercel, onFechar, onAbrirLead }: { inicial: ProjetoSite; temGemini: boolean; temVercel: boolean; onFechar: (p: ProjetoSite) => void; onAbrirLead: (id: string) => void }) {
  const [p, setP] = useState<ProjetoSite>(inicial);
  const [aba, setAba] = useState<Aba>(inicial.html ? "ia" : "dados");
  const [tela, setTela] = useState<"painel" | "previa">("painel");
  const [dispositivo, setDispositivo] = useState<"pc" | "celular">("pc");
  const [gerando, setGerando] = useState("");
  const [aviso, setAviso] = useState<{ tipo: "erro" | "info"; texto: string } | null>(null);
  const [versoes, setVersoes] = useState<string[]>([]);
  const [salvo, setSalvo] = useState(true);
  const ultimo = useRef(JSON.stringify(inicial));

  // Salva sozinho 1 segundo depois de cada mudança.
  useEffect(() => {
    const atual = JSON.stringify(p);
    if (atual === ultimo.current) return;
    setSalvo(false);
    const t = setTimeout(async () => {
      try {
        await salvarProjeto(p);
        ultimo.current = atual;
        setSalvo(true);
      } catch (e) {
        setAviso({ tipo: "erro", texto: `Não salvou: ${(e as Error).message}` });
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [p]);

  const mudar = (x: Partial<ProjetoSite>) => setP((v) => ({ ...v, ...x }));
  const mudarDados = (k: keyof DadosSite, v: string) => setP((x) => ({ ...x, dados: { ...x.dados, [k]: v } }));

  async function pedirIA(modo: "gerar" | "editar", pedido?: string) {
    setAviso(null);
    setGerando(modo);
    if (pedido) mudar({ chat: [...p.chat, { autor: "eu", texto: pedido, quando: new Date().toISOString() }] });
    try {
      const r = await postar<{ html: string; modelo: string; aviso: string }>("/api/sites/gerar", {
        modo,
        dados: p.dados,
        estilo: p.estilo,
        midias: p.midias.map(({ url, tipo, origem, descricao }) => ({ url, tipo, origem, descricao })),
        html: modo === "editar" ? p.html : undefined,
        pedido,
      });
      if (p.html) setVersoes((v) => [...v.slice(-9), p.html]);
      setP((x) => ({
        ...x,
        html: r.html,
        chat: [...x.chat, { autor: "ia", texto: modo === "gerar" ? "Site gerado. Veja a prévia e peça ajustes aqui." : "Pronto, apliquei a mudança.", quando: new Date().toISOString() }],
      }));
      if (r.aviso) setAviso({ tipo: "info", texto: r.aviso });
      if (modo === "gerar") setAba("ia");
      if (window.matchMedia("(max-width: 900px)").matches) setTela("previa");
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setGerando("");
    }
  }

  async function publicar() {
    setAviso(null);
    setGerando("publicar");
    try {
      if (!salvo) await salvarProjeto(p);
      const r = await postar<{ url: string; publicadoEm: string }>("/api/sites/publicar", { projetoId: p.id });
      setP((x) => ({ ...x, publicado_url: r.url, publicado_em: r.publicadoEm }));
      if (p.lead_id) alterarLead(p.lead_id, (l) => ({ ...l, linkDemo: r.url }));
      avisar(p.lead_id ? "Site publicado e salvo na ficha do lead" : "Site publicado");
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setGerando("");
    }
  }

  async function exportar() {
    setGerando("zip");
    try {
      const n = await baixarZip(p);
      avisar(`ZIP baixado com ${n} ${n === 1 ? "mídia" : "mídias"}`);
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setGerando("");
    }
  }

  return (
    <div className={`editor-site ${tela === "previa" ? "ver-previa" : ""}`}>
      <header className="editor-topo card">
        <button className="btn icone" onClick={() => onFechar(p)} aria-label="Voltar para os projetos"><IcVoltar /></button>
        <input className="editor-nome" value={p.nome} onChange={(e) => mudar({ nome: e.target.value })} aria-label="Nome do projeto" />
        <small className="editor-salvo">{salvo ? "Salvo" : "Salvando..."}</small>
        <div className="editor-acoes">
          {p.lead_id && <button className="btn peq" onClick={() => onAbrirLead(p.lead_id!)}>Ver lead</button>}
          <button className="btn peq" disabled={!versoes.length || !!gerando} onClick={() => { const v = versoes.at(-1)!; setVersoes((x) => x.slice(0, -1)); mudar({ html: v }); }}>Desfazer</button>
          <button className="btn prim" disabled={!!gerando || !temGemini || !p.dados.empresa.trim()} onClick={() => pedirIA("gerar")}>
            {gerando === "gerar" ? "Gerando..." : p.html ? "Gerar de novo" : "Gerar site"}
          </button>
          <button className="btn publicar" disabled={!p.html || !!gerando || !temVercel} onClick={publicar}>
            {gerando === "publicar" ? "Publicando..." : p.publicado_url ? "Publicar de novo" : "Publicar"}
          </button>
          <button className="btn" disabled={!p.html || !!gerando} onClick={exportar} title="Baixar os arquivos do site"><IcBaixar /><span>{gerando === "zip" ? "Montando..." : "ZIP"}</span></button>
        </div>
      </header>

      {p.publicado_url && (
        <div className="publicado">
          <span className="publicado-selo">No ar</span>
          <a href={p.publicado_url} target="_blank" rel="noopener noreferrer">{p.publicado_url.replace("https://", "")}</a>
          <button className="btn peq" onClick={() => navigator.clipboard?.writeText(p.publicado_url!).then(() => avisar("Link copiado"))}>Copiar</button>
          {p.publicado_em && <small>Publicado em {new Date(p.publicado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}. Mudanças novas só aparecem depois de publicar de novo.</small>}
        </div>
      )}
      {gerando === "publicar" && <p className="editor-aviso info">Enviando para a Vercel. Leva de 20 segundos a 1 minuto.</p>}
      {!temVercel && <div className="aviso-zap"><span>Para publicar, falta o token da Vercel no servidor (<code>VERCEL_TOKEN</code>).</span></div>}
      {aviso && <p className={aviso.tipo === "erro" ? "erro editor-aviso" : "editor-aviso info"}>{aviso.texto}</p>}
      {!temGemini && <AvisoGemini />}

      <div className="editor-alternar so-mobile-flex">
        <button className={tela === "painel" ? "ativo" : ""} onClick={() => setTela("painel")}>Editar</button>
        <button className={tela === "previa" ? "ativo" : ""} onClick={() => setTela("previa")}>Prévia</button>
      </div>

      <div className="editor-corpo">
        <aside className="editor-painel card">
          <nav className="editor-abas" role="tablist">
            {(["dados", "estilo", "midias", "ia"] as Aba[]).map((a) => (
              <button key={a} role="tab" aria-selected={aba === a} className={aba === a ? "ativo" : ""} onClick={() => setAba(a)}>
                {a === "dados" ? "Dados" : a === "estilo" ? "Estilo" : a === "midias" ? `Mídias${p.midias.length ? ` (${p.midias.length})` : ""}` : "IA"}
              </button>
            ))}
          </nav>
          <div className="editor-aba">
            {aba === "dados" && <AbaDados d={p.dados} mudar={mudarDados} />}
            {aba === "estilo" && <AbaEstilo p={p} mudar={mudar} />}
            {aba === "midias" && <AbaMidias p={p} mudar={mudar} />}
            {aba === "ia" && <AbaIA p={p} gerando={gerando} temGemini={temGemini} onPedir={(t) => pedirIA("editar", t)} onGerar={() => pedirIA("gerar")} />}
          </div>
        </aside>

        <section className="editor-previa card">
          <div className="previa-barra">
            <span className="previa-pontos" aria-hidden><i /><i /><i /></span>
            <div className="alternar mini">
              <button className={dispositivo === "pc" ? "ativo" : ""} onClick={() => setDispositivo("pc")}>Computador</button>
              <button className={dispositivo === "celular" ? "ativo" : ""} onClick={() => setDispositivo("celular")}>Celular</button>
            </div>
          </div>
          <div className={`previa-moldura ${dispositivo}`}>
            {p.html ? (
              <iframe title="Prévia do site" srcDoc={p.html} sandbox="allow-scripts allow-popups" />
            ) : (
              <div className="previa-vazia">
                {gerando === "gerar" ? (
                  <><span className="spinner" /><p>O Gemini está montando o site. Leva de 30 segundos a 2 minutos.</p></>
                ) : (
                  <p>Confira os dados, escolha o estilo e as mídias, e toque em <b>Gerar site</b>.</p>
                )}
              </div>
            )}
            {p.html && gerando && gerando !== "zip" && <div className="previa-carregando"><span className="spinner" /></div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function AbaDados({ d, mudar }: { d: DadosSite; mudar: (k: keyof DadosSite, v: string) => void }) {
  const campo = (k: keyof DadosSite, rotulo: string, dica = "", grande = false) => (
    <label className="campo" key={k}>
      <span>{rotulo}</span>
      {grande ? (
        <textarea value={d[k]} onChange={(e) => mudar(k, e.target.value)} placeholder={dica} rows={4} />
      ) : (
        <input value={d[k]} onChange={(e) => mudar(k, e.target.value)} placeholder={dica} />
      )}
    </label>
  );
  return (
    <div className="aba-dados">
      <p className="dica">A IA usa só o que estiver aqui. O que faltar, ela deixa de fora.</p>
      {campo("empresa", "Empresa")}
      {campo("segmento", "Segmento")}
      {campo("cidade", "Cidade")}
      {campo("endereco", "Endereço")}
      {campo("telefone", "Telefone")}
      {campo("whatsapp", "WhatsApp (só números, com 55)")}
      {campo("instagram", "Instagram", "@perfil")}
      {campo("mapa", "Link do Google Maps")}
      {campo("nota", "Avaliação no Google", "Ex.: 4,8 com 157 avaliações")}
      {campo("servicos", "Serviços ou produtos", "Liste o que a empresa faz, um por linha", true)}
      {campo("descricao", "Descrição e diferenciais", "Horários, história, o que você viu no Instagram...", true)}
    </div>
  );
}

function AbaEstilo({ p, mudar }: { p: ProjetoSite; mudar: (x: Partial<ProjetoSite>) => void }) {
  const e = p.estilo;
  const set = (x: Partial<typeof e>) => mudar({ estilo: { ...e, ...x } });
  return (
    <div className="aba-estilo">
      <span className="rotulo">Estilo</span>
      <div className="estilos">
        {ESTILOS.map((s) => (
          <button key={s.nome} className={`estilo-op ${e.estilo === s.nome ? "ativo" : ""}`} onClick={() => set({ estilo: s.nome, corPrimaria: s.cores[0], corSecundaria: s.cores[1], corFundo: s.cores[2], fonte: s.fonte })}>
            <span className="estilo-cores">{s.cores.map((c, i) => <i key={i} style={{ background: c }} />)}</span>
            {s.nome}
          </button>
        ))}
      </div>
      <span className="rotulo">Cores</span>
      <div className="cores">
        {([["corPrimaria", "Principal"], ["corSecundaria", "Destaque"], ["corFundo", "Fundo"]] as const).map(([k, n]) => (
          <label key={k} className="cor">
            <input type="color" value={e[k]} onChange={(ev) => set({ [k]: ev.target.value })} />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <span className="rotulo">Estrutura (seções)</span>
      <div className="secoes">
        {SECOES.map((s) => (
          <label key={s} className="check">
            <input type="checkbox" checked={e.secoes.includes(s)} onChange={(ev) => set({ secoes: ev.target.checked ? SECOES.filter((x) => x === s || e.secoes.includes(x)) : e.secoes.filter((x) => x !== s) })} />
            {s}
          </label>
        ))}
      </div>
      <p className="dica">Mudou o estilo depois de gerar? Toque em "Gerar de novo" ou peça a mudança na aba IA.</p>
    </div>
  );
}

function AbaMidias({ p, mudar }: { p: ProjetoSite; mudar: (x: Partial<ProjetoSite>) => void }) {
  const { apifyToken, apifyTokens } = useEstado();
  const [busca, setBusca] = useState<{ fonte: "maps" | "instagram"; itens: Omit<MidiaSite, "path">[] } | null>(null);
  const [carregando, setCarregando] = useState("");
  const [erro, setErro] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const token = apifyToken || apifyTokens[0]?.token || "";
  const noProjeto = useMemo(() => new Set(p.midias.map((m) => m.descricao + m.url)), [p.midias]);

  async function buscar(fonte: "maps" | "instagram") {
    setErro("");
    setBusca(null);
    setCarregando(fonte);
    try {
      const r = await postar<{ midias: Omit<MidiaSite, "path">[] }>("/api/sites/midias", {
        fonte,
        mapa: p.dados.mapa,
        busca: [p.dados.empresa, p.dados.endereco || p.dados.cidade].filter(Boolean).join(", "),
        instagram: p.dados.instagram,
        token,
      });
      setBusca({ fonte, itens: r.midias });
      if (!r.midias.length) setErro(fonte === "maps" ? "A Apify não devolveu fotos deste local no Maps." : "A Apify não devolveu publicações deste perfil (pode ser privado).");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando("");
    }
  }

  async function usar(m: Omit<MidiaSite, "path">) {
    setCarregando(m.url);
    try {
      const r = await postar<{ url: string; path: string; tipo: "imagem" | "video" }>("/api/sites/copiar", { url: m.url, projetoId: p.id });
      mudar({ midias: [...p.midias, { url: r.url, path: r.path, tipo: r.tipo, origem: m.origem, descricao: m.descricao }] });
      setBusca((b) => (b ? { ...b, itens: b.itens.filter((x) => x.url !== m.url) } : b));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando("");
    }
  }

  async function enviar(files: FileList | null) {
    if (!files?.length) return;
    setErro("");
    setCarregando("upload");
    const novas: MidiaSite[] = [];
    for (const f of Array.from(files).slice(0, 15)) {
      try {
        novas.push(await enviarArquivo(p.id, f));
      } catch (e) {
        setErro((e as Error).message);
      }
    }
    if (novas.length) mudar({ midias: [...p.midias, ...novas] });
    setCarregando("");
  }

  return (
    <div className="aba-midias">
      <div className="midias-botoes">
        <button className="btn" disabled={!!carregando} onClick={() => arquivo.current?.click()}>{carregando === "upload" ? "Enviando..." : "Enviar minhas imagens"}</button>
        <input ref={arquivo} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden onChange={(e) => { enviar(e.target.files); e.target.value = ""; }} />
      </div>

      <div className="midias-externas">
        <label className="check">
          <input type="checkbox" checked={autorizado} onChange={(e) => setAutorizado(e.target.checked)} />
          A empresa autorizou o uso das fotos e vídeos dela no site.
        </label>
        <div className="midias-botoes">
          <button className="btn" disabled={!autorizado || !token || !!carregando || !(p.dados.mapa || p.dados.empresa)} onClick={() => buscar("maps")}>
            {carregando === "maps" ? "Buscando no Maps..." : "Fotos do Google Maps"}
          </button>
          <button className="btn" disabled={!autorizado || !token || !!carregando || !p.dados.instagram} onClick={() => buscar("instagram")}>
            {carregando === "instagram" ? "Buscando no Instagram..." : "Fotos do Instagram"}
          </button>
        </div>
        <small className="dica">Usa a sua conta da Apify (crédito gratuito mensal). Pode levar até 2 minutos.{!token && " Adicione um token da Apify na tela de busca."}</small>
      </div>

      {erro && <p className="erro">{erro}</p>}

      {busca && busca.itens.length > 0 && (
        <>
          <span className="rotulo">Encontradas no {busca.fonte === "maps" ? "Google Maps" : "Instagram"}: toque para usar</span>
          <div className="midias-grade">
            {busca.itens.map((m) => (
              <button key={m.url} className="midia" disabled={!!carregando || noProjeto.has(m.descricao + m.url)} onClick={() => usar(m)} title={m.descricao}>
                {m.tipo === "video" ? <video src={m.url} muted playsInline preload="metadata" /> : <img src={m.url} alt="" loading="lazy" referrerPolicy="no-referrer" />}
                {carregando === m.url && <span className="midia-carregando"><span className="spinner" /></span>}
                {m.tipo === "video" && <i className="midia-tag">vídeo</i>}
              </button>
            ))}
          </div>
        </>
      )}

      <span className="rotulo">No site ({p.midias.length})</span>
      {p.midias.length === 0 ? (
        <p className="dica">Nenhuma mídia. Sem fotos, a IA monta o visual só com cores e tipografia.</p>
      ) : (
        <div className="midias-grade">
          {p.midias.map((m, i) => (
            <div key={m.url} className="midia escolhida">
              {m.tipo === "video" ? <video src={m.url} muted playsInline preload="metadata" /> : <img src={m.url} alt="" loading="lazy" />}
              <i className="midia-tag">{m.origem === "upload" ? "sua" : m.origem}</i>
              <button className="midia-x" aria-label="Remover" onClick={() => mudar({ midias: p.midias.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SUGESTOES = ["Deixe o topo mais impactante", "Use a melhor foto no topo", "Textos mais curtos e diretos", "Botão de WhatsApp fixo no canto", "Troque as cores para tons de azul"];

function AbaIA({ p, gerando, temGemini, onPedir, onGerar }: { p: ProjetoSite; gerando: string; temGemini: boolean; onPedir: (t: string) => void; onGerar: () => void }) {
  const [texto, setTexto] = useState("");
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [p.chat.length]);
  const enviar = (t: string) => {
    if (!t.trim() || gerando || !p.html) return;
    onPedir(t.trim());
    setTexto("");
  };
  return (
    <div className="aba-ia">
      {!p.html ? (
        <div className="ia-vazio">
          <p>Primeiro gere o site. Depois, peça qualquer mudança por aqui.</p>
          <button className="btn prim" disabled={!!gerando || !temGemini} onClick={onGerar}>{gerando === "gerar" ? "Gerando..." : "Gerar site"}</button>
        </div>
      ) : (
        <>
          <div className="ia-msgs">
            {p.chat.map((m, i) => (
              <div key={i} className={`bolha ${m.autor === "eu" ? "minha" : ""}`}><p>{m.texto}</p></div>
            ))}
            {gerando === "editar" && <div className="bolha"><p><span className="spinner mini" /> Aplicando...</p></div>}
            <div ref={fim} />
          </div>
          <div className="ia-sugestoes">
            {SUGESTOES.map((s) => (
              <button key={s} className="chip" disabled={!!gerando} onClick={() => enviar(s)}>{s}</button>
            ))}
          </div>
          <form className="conversa-envio" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
            <textarea value={texto} rows={2} placeholder="Ex.: troque o título, adicione uma seção de horários, use a foto 2 no topo" onChange={(e) => setTexto(e.target.value)} disabled={!!gerando || !temGemini}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); enviar(texto); } }} />
            <button className="btn prim" type="submit" disabled={!!gerando || !texto.trim() || !temGemini}>Enviar</button>
          </form>
        </>
      )}
    </div>
  );
}
