"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { avisar, postar, useIntegracoes } from "@/lib/api";
import { linkSite, qualificar, type Temperatura } from "@/lib/acoes";
import { NICHOS_EM_ALTA, POTENCIAL, SEGMENTOS, SERVICOS, TERMO_MAPS, segmentoPorId } from "@/lib/catalogo";
import { telefoneWhatsApp } from "@/lib/prontas";
import { definirApifyToken, novoId, salvarVariosLeads, useEstado } from "@/lib/store";
import type { Lead, SegmentoId, ServicoId } from "@/lib/types";
import type { Encontrado } from "@/app/api/apify/status/route";
import { SeloTemperatura } from "./AcoesRapidas";
import { IcInsta, IcPino, IcSite } from "./Icones";

const chave = (nome: string, tel: string) => telefoneWhatsApp(tel) || nome.trim().toLowerCase();

export default function BuscarLeads({ onImportados }: { onImportados: () => void }) {
  const { leads, apifyToken } = useEstado();
  const integ = useIntegracoes();
  const [segmento, setSegmento] = useState<SegmentoId>("odontologia");
  const [busca, setBusca] = useState(TERMO_MAPS.odontologia);
  const [local, setLocal] = useState("");
  const [maximo, setMaximo] = useState(20);
  const [contatos, setContatos] = useState(false);
  const [servico, setServico] = useState<ServicoId>("site");
  const [mostrarToken, setMostrarToken] = useState(!apifyToken);

  const [rodando, setRodando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState("");
  const [encontrados, setEncontrados] = useState<Encontrado[] | null>(null);
  const [segBusca, setSegBusca] = useState<SegmentoId>("odontologia");
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [soSemSite, setSoSemSite] = useState(false);
  const [temp, setTemp] = useState<"" | Temperatura>("");
  const parar = useRef(false);

  useEffect(() => () => { parar.current = true; }, []);
  useEffect(() => { if (apifyToken) setMostrarToken(false); }, [apifyToken]);

  const jaCadastrados = useMemo(() => new Set(leads.map((l) => chave(l.empresa, l.telefone))), [leads]);
  const temToken = Boolean(apifyToken || integ.apify);

  const avaliados = useMemo(
    () =>
      (encontrados ?? [])
        .map((e, i) => ({ e, i, q: qualificar({ ...e, segmento: segBusca }) }))
        .sort((a, b) => b.q.pontos - a.q.pontos),
    [encontrados, segBusca],
  );
  const lista = avaliados.filter(({ e, q }) => (!soSemSite || !e.site) && (!temp || q.temperatura === temp));
  const contagem = (t: Temperatura) => avaliados.filter((x) => x.q.temperatura === t).length;

  function escolherNicho(s: SegmentoId) {
    setSegmento(s);
    setBusca(TERMO_MAPS[s]);
  }

  async function buscar() {
    setErro("");
    setEncontrados(null);
    setMarcados(new Set());
    setRodando(true);
    setSegundos(0);
    parar.current = false;
    const inicio = Date.now();
    const relogio = setInterval(() => setSegundos(Math.round((Date.now() - inicio) / 1000)), 1000);
    try {
      const { runId } = await postar<{ runId: string }>("/api/apify/iniciar", { busca, local, maximo, contatos, token: apifyToken });
      while (!parar.current) {
        await new Promise((r) => setTimeout(r, 5000));
        const r = await postar<{ status: string; erro?: string; encontrados?: Encontrado[] }>("/api/apify/status", { runId, token: apifyToken });
        if (r.status === "pronto") {
          const novos = r.encontrados ?? [];
          setSegBusca(segmento);
          setEncontrados(novos);
          setMarcados(
            new Set(
              novos
                .map((e, i) => (!jaCadastrados.has(chave(e.nome, e.telefone)) && qualificar({ ...e, segmento }).temperatura !== "frio" ? i : -1))
                .filter((i) => i >= 0),
            ),
          );
          break;
        }
        if (r.status === "falhou") throw new Error(r.erro);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro na busca");
    } finally {
      clearInterval(relogio);
      setRodando(false);
    }
  }

  function importar() {
    if (!encontrados) return;
    const agora = new Date().toISOString();
    const novos: Lead[] = [...marcados]
      .map((i) => encontrados[i])
      .filter((e) => e && !jaCadastrados.has(chave(e.nome, e.telefone)))
      .map((e) => ({
        id: novoId(),
        empresa: e.nome,
        responsavel: "",
        segmento: segBusca,
        cidade: e.cidade || local,
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
      }));
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
      <div className="topo">
        <div>
          <h1>Buscar empresas</h1>
          <p>Encontre negócios no Google Maps e importe os mais quentes direto para a sua lista.</p>
        </div>
      </div>

      <section className="nichos" aria-label="Nichos">
        <h2 className="secao-titulo">Nichos que mais compram site</h2>
        <div className="nichos-lista">
          {NICHOS_EM_ALTA.map((s) => (
            <button key={s.id} className={`nicho ${segmento === s.id ? "ativo" : ""}`} onClick={() => escolherNicho(s.id)} aria-pressed={segmento === s.id}>
              <span>{s.nome.charAt(0).toUpperCase() + s.nome.slice(1)}</span>
              <span className="potencial" aria-label={`Potencial ${POTENCIAL[s.id]} de 3`}>
                {[1, 2, 3].map((i) => <i key={i} className={i <= POTENCIAL[s.id] ? "on" : ""} />)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <form
        className="card pad busca-form"
        onSubmit={(e) => { e.preventDefault(); if (temToken) buscar(); else setErro("Cole o token da Apify primeiro."); }}
      >
        <div className="grade g3">
          <label className="campo">
            <span>Nicho</span>
            <select value={segmento} onChange={(e) => escolherNicho(e.target.value as SegmentoId)}>
              {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label className="campo">
            <span>O que buscar no Maps</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} required />
          </label>
          <label className="campo">
            <span>Cidade ou bairro</span>
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Moema, São Paulo" required />
          </label>
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
            Buscar Instagram e e-mail também (mais lento)
          </label>
        </div>

        <div className="busca-pe">
          <button className="btn prim grande" type="submit" disabled={rodando}>
            {rodando ? `Buscando ${segmentoPorId(segmento).plural}... ${segundos}s` : `Buscar ${segmentoPorId(segmento).plural}`}
          </button>
          {rodando && <span className="dica">Costuma levar de 1 a 3 minutos. Pode deixar esta tela aberta.</span>}
          {erro && <span className="erro" style={{ margin: 0 }}>{erro}</span>}
        </div>

        <div className="token">
          {mostrarToken || !temToken ? (
            <label className="campo">
              <span>Token da Apify</span>
              <input type="password" defaultValue={apifyToken} placeholder="apify_api_..." onBlur={(e) => e.target.value.trim() && definirApifyToken(e.target.value)} autoComplete="off" />
              <small className="dica">Em apify.com, entre em Settings e copie o token da parte de API. Ele fica salvo só na sua conta.</small>
            </label>
          ) : (
            <p className="dica" style={{ margin: 0 }}>
              Apify conectada.{" "}
              {apifyToken && <button type="button" className="link" onClick={() => setMostrarToken(true)}>Trocar token</button>}
            </p>
          )}
        </div>
      </form>

      {encontrados && (
        <section className="card resultados-card">
          <div className="resultados-cab">
            <div>
              <h2>{encontrados.length} empresas encontradas</h2>
              <p className="dica" style={{ margin: 0 }}>Ordenadas da mais quente para a mais fria. As quentes e mornas já vêm marcadas.</p>
            </div>
            <button className="btn prim" onClick={importar} disabled={!marcados.size}>
              Importar {marcados.size} {marcados.size === 1 ? "lead" : "leads"}
            </button>
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
              {lista.map(({ e, i, q }) => {
                const ja = jaCadastrados.has(chave(e.nome, e.telefone));
                return (
                  <li key={i} className={`achado ${ja ? "ja" : ""} ${marcados.has(i) ? "marcado" : ""}`}>
                    <label className="achado-check">
                      <input type="checkbox" disabled={ja} checked={marcados.has(i)} onChange={() => alternar(i)} aria-label={`Selecionar ${e.nome}`} />
                    </label>
                    <div className="achado-info">
                      <b>{e.nome}</b>
                      <small>{e.endereco}</small>
                      <div className="achado-tags">
                        {!e.site && <span className="tag laranja">Sem site</span>}
                        {e.nota !== null && <span className="tag cinza">{String(e.nota).replace(".", ",")} ★ {e.avaliacoes !== null ? `(${e.avaliacoes})` : ""}</span>}
                        {e.telefone ? <span className="tag cinza">{e.telefone}</span> : <span className="tag cinza">Sem telefone</span>}
                        {ja && <span className="tag azul">Já está na sua lista</span>}
                      </div>
                      {q.motivos.length > 0 && <p className="achado-motivos">{q.motivos.join(", ")}</p>}
                    </div>
                    <div className="achado-lado">
                      <SeloTemperatura dados={{ ...e, segmento: segBusca }} />
                      <div className="achado-links">
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
