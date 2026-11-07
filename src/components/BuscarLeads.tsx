"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { avisar, postar, useIntegracoes } from "@/lib/api";
import { SEGMENTOS, SERVICOS } from "@/lib/catalogo";
import { telefoneWhatsApp } from "@/lib/prontas";
import { definirApifyToken, novoId, salvarVariosLeads, useEstado } from "@/lib/store";
import type { Lead, SegmentoId, ServicoId } from "@/lib/types";
import type { Encontrado } from "@/app/api/apify/status/route";

const TERMO: Record<SegmentoId, string> = {
  odontologia: "dentista",
  "clinica-medica": "clínica médica",
  petshop: "pet shop",
  oficina: "oficina mecânica",
  "estetica-automotiva": "estética automotiva",
  advocacia: "advogado",
  restaurante: "restaurante",
  salao: "salão de beleza",
  academia: "academia",
  transportadora: "transportadora",
  imobiliaria: "imobiliária",
  "loja-local": "loja",
};

const chave = (nome: string, tel: string) => telefoneWhatsApp(tel) || nome.trim().toLowerCase();

export default function BuscarLeads({ onImportados }: { onImportados: () => void }) {
  const { leads, apifyToken } = useEstado();
  const integ = useIntegracoes();
  const [segmento, setSegmento] = useState<SegmentoId>("odontologia");
  const [busca, setBusca] = useState(TERMO.odontologia);
  const [local, setLocal] = useState("");
  const [maximo, setMaximo] = useState(20);
  const [contatos, setContatos] = useState(false);
  const [servico, setServico] = useState<ServicoId>("site");
  const [mostrarToken, setMostrarToken] = useState(!apifyToken);

  const [rodando, setRodando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState("");
  const [encontrados, setEncontrados] = useState<Encontrado[] | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [soSemSite, setSoSemSite] = useState(true);
  const parar = useRef(false);

  useEffect(() => () => { parar.current = true; }, []);
  useEffect(() => { if (apifyToken) setMostrarToken(false); }, [apifyToken]);

  const jaCadastrados = useMemo(() => new Set(leads.map((l) => chave(l.empresa, l.telefone))), [leads]);
  const temToken = Boolean(apifyToken || integ.apify);

  const lista = (encontrados ?? []).map((e, i) => ({ e, i })).filter(({ e }) => !soSemSite || !e.site);

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
      const { runId } = await postar<{ runId: string }>("/api/apify/iniciar", {
        busca, local, maximo, contatos, token: apifyToken,
      });
      while (!parar.current) {
        await new Promise((r) => setTimeout(r, 5000));
        const r = await postar<{ status: string; erro?: string; encontrados?: Encontrado[] }>("/api/apify/status", {
          runId, token: apifyToken,
        });
        if (r.status === "pronto") {
          const novos = r.encontrados ?? [];
          setEncontrados(novos);
          setMarcados(new Set(novos.map((e, i) => (!e.site && !jaCadastrados.has(chave(e.nome, e.telefone)) ? i : -1)).filter((i) => i >= 0)));
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
        segmento,
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
        origemLead: "apify",
        servicoInteresse: servico,
        status: "novo",
        contatos: [],
        criadoEm: agora,
      }));
    if (!novos.length) return avisar("Nada novo para importar");
    salvarVariosLeads(novos);
    avisar(`${novos.length} ${novos.length === 1 ? "lead importado" : "leads importados"}`);
    onImportados();
  }

  const alternar = (i: number) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <>
      <div className="topo">
        <div>
          <h1>Buscar leads</h1>
          <p>Encontre empresas no Google Maps pela Apify e importe direto para os seus leads.</p>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 16 }}>
        {mostrarToken || !temToken ? (
          <div className="grade" style={{ gap: 8 }}>
            <label className="campo">
              <span>Token da Apify</span>
              <input
                type="password"
                defaultValue={apifyToken}
                placeholder="apify_api_..."
                onBlur={(e) => e.target.value.trim() && definirApifyToken(e.target.value)}
                autoComplete="off"
              />
            </label>
            <p className="dica" style={{ margin: 0 }}>
              Crie uma conta grátis em apify.com e copie o token em Settings, na parte de API. Ele fica salvo só na sua conta da ferramenta.
              A Apify cobra por resultado, e o plano gratuito vem com um crédito mensal.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="dica">Apify conectada{apifyToken ? " com o seu token" : " pelo servidor"}.</span>
            {apifyToken && <button className="btn peq" onClick={() => setMostrarToken(true)}>Trocar token</button>}
          </div>
        )}
      </div>

      <form
        className="card pad grade g3"
        onSubmit={(e) => { e.preventDefault(); if (temToken) buscar(); else setErro("Cole o token da Apify primeiro."); }}
      >
        <label className="campo">
          <span>Segmento</span>
          <select value={segmento} onChange={(e) => { const s = e.target.value as SegmentoId; setSegmento(s); setBusca(TERMO[s]); }}>
            {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>O que buscar no Maps</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Cidade</span>
          <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: São Luís, MA" required />
        </label>
        <label className="campo">
          <span>Quantidade máxima</span>
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
        <label className="campo">
          <span>Extras</span>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, paddingTop: 6 }}>
            <input type="checkbox" checked={contatos} onChange={(e) => setContatos(e.target.checked)} />
            Buscar Instagram e e-mail (mais lento e custa mais)
          </label>
        </label>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn prim" type="submit" disabled={rodando}>
            {rodando ? `Buscando... ${segundos}s` : "Buscar empresas"}
          </button>
          {rodando && <span className="dica">A Apify costuma levar de 1 a 3 minutos. Pode deixar esta tela aberta.</span>}
          {erro && <span className="erro" style={{ margin: 0 }}>{erro}</span>}
        </div>
      </form>

      {encontrados && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="filtros" style={{ alignItems: "center", justifyContent: "space-between" }}>
            <span>
              <b>{encontrados.length}</b> empresas encontradas · <b>{encontrados.filter((e) => !e.site).length}</b> sem site
            </span>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14, flex: "0 0 auto" }}>
              <input type="checkbox" checked={soSemSite} onChange={(e) => setSoSemSite(e.target.checked)} />
              Mostrar só quem não tem site
            </label>
            <button className="btn prim" onClick={importar} disabled={!marcados.size} style={{ flex: "0 0 auto" }}>
              Importar {marcados.size} {marcados.size === 1 ? "lead" : "leads"}
            </button>
          </div>
          {lista.length === 0 ? (
            <div className="vazio">Nenhuma empresa com esse filtro.</div>
          ) : (
            <div className="tabela-wrap">
              <table className="resultados">
                <thead>
                  <tr><th></th><th>Empresa</th><th>Telefone</th><th>Site</th><th>Google</th></tr>
                </thead>
                <tbody>
                  {lista.map(({ e, i }) => {
                    const ja = jaCadastrados.has(chave(e.nome, e.telefone));
                    return (
                      <tr key={i} style={{ opacity: ja ? 0.55 : 1 }}>
                        <td><input type="checkbox" disabled={ja} checked={marcados.has(i)} onChange={() => alternar(i)} aria-label={`Selecionar ${e.nome}`} /></td>
                        <td>
                          {e.nome}
                          <small>{e.endereco}{ja ? " · já está nos seus leads" : ""}</small>
                        </td>
                        <td>{e.telefone || <small>sem telefone</small>}</td>
                        <td>{e.site ? <small style={{ overflowWrap: "anywhere" }}>{e.site}</small> : <span className="tag laranja">Sem site</span>}</td>
                        <td>{e.nota !== null ? `${String(e.nota).replace(".", ",")} ★` : "—"}<small>{e.avaliacoes !== null ? `${e.avaliacoes} avaliações` : ""}</small></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
