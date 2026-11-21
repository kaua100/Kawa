"use client";

import { useEffect, useId, useState } from "react";

export const UFS: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

let cache: Record<string, string[]> | null = null;
let carregando: Promise<Record<string, string[]>> | null = null;

/** Todas as cidades do Brasil por estado (lista do IBGE, 5.570 municípios). Carrega uma vez. */
export function useCidades() {
  const [dados, setDados] = useState(cache);
  useEffect(() => {
    if (cache) return;
    carregando ??= fetch("/cidades-br.json").then((r) => r.json()).then((d) => (cache = d));
    carregando.then(setDados).catch(() => {});
  }, []);
  return dados;
}

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export interface Local {
  uf: string;
  cidade: string;
  bairro: string;
}

/** Estado (lista), cidade (pesquisa digitando) e bairro opcional. */
export function SeletorLocal({ valor, onChange, comBairro = true }: { valor: Local; onChange: (l: Local) => void; comBairro?: boolean }) {
  const cidades = useCidades();
  const id = useId();
  const lista = valor.uf && cidades ? cidades[valor.uf] ?? [] : [];
  const valida = !valor.cidade || lista.some((c) => sem(c) === sem(valor.cidade));

  return (
    <>
      <label className="campo">
        <span>Estado</span>
        <select value={valor.uf} onChange={(e) => onChange({ ...valor, uf: e.target.value, cidade: "" })} required>
          <option value="">Escolha</option>
          {Object.entries(UFS)
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([uf, nome]) => (
              <option key={uf} value={uf}>{nome}</option>
            ))}
        </select>
      </label>
      <label className="campo">
        <span>Cidade</span>
        <select
          id={`${id}-cidade`}
          value={valida ? lista.find((c) => sem(c) === sem(valor.cidade)) ?? "" : ""}
          disabled={!valor.uf || !lista.length}
          onChange={(e) => onChange({ ...valor, cidade: e.target.value })}
          required
        >
          <option value="">{valor.uf ? (lista.length ? "Escolha a cidade" : "Carregando...") : "Escolha o estado"}</option>
          {lista.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      {comBairro && (
        <label className="campo">
          <span>Bairro (opcional)</span>
          <input value={valor.bairro} onChange={(e) => onChange({ ...valor, bairro: e.target.value })} placeholder="Ex.: Centro" />
        </label>
      )}
    </>
  );
}

/** Texto usado na busca do Google Maps. */
export const localParaBusca = (l: Local) =>
  [l.bairro.trim(), l.cidade.trim(), UFS[l.uf] ?? l.uf, "Brasil"].filter(Boolean).join(", ");

/** "Cidade/UF", formato guardado no lead. */
export const localParaLead = (l: Local) => (l.cidade ? `${l.cidade}/${l.uf}` : "");

export function lerLocalDoLead(cidade: string): Local {
  const [c, uf] = cidade.split("/");
  return { cidade: (c ?? "").trim(), uf: (uf ?? "").trim().toUpperCase(), bairro: "" };
}

/* ---------- Outros países ---------- */

export interface DadosPais {
  regioes: { c: string; n: string }[];
  cidades: Record<string, string[]>;
}

const cachePais: Record<string, DadosPais> = {};
const carregandoPais: Record<string, Promise<DadosPais> | undefined> = {};

/** Regiões e cidades de um país (lista em /public/locais, gerada do countries-states-cities-database, licença ODbL). */
export function useLocaisPais(pais: string) {
  const [dados, setDados] = useState<DadosPais | null>(cachePais[pais] ?? null);
  useEffect(() => {
    if (pais === "BR") return;
    if (cachePais[pais]) {
      setDados(cachePais[pais]);
      return;
    }
    setDados(null);
    carregandoPais[pais] ??= fetch(`/locais/${pais}.json`).then((r) => r.json()).then((d: DadosPais) => (cachePais[pais] = d));
    let vivo = true;
    carregandoPais[pais]!.then((d) => vivo && setDados(d)).catch(() => {});
    return () => {
      vivo = false;
    };
  }, [pais]);
  return dados;
}

export interface LocalFora {
  regiao: string; // código da região
  cidade: string;
}

/** Região (lista) e cidade (lista) de outro país, escolhidas sem digitar. */
export function SeletorFora({ pais, rotuloRegiao, valor, onChange }: { pais: string; rotuloRegiao: string; valor: LocalFora; onChange: (l: LocalFora) => void }) {
  const dados = useLocaisPais(pais);
  const regiaoOk = !!dados?.regioes.some((r) => r.c === valor.regiao);
  const lista = regiaoOk ? dados!.cidades[valor.regiao] ?? [] : [];
  return (
    <>
      <label className="campo">
        <span>{rotuloRegiao}</span>
        <select value={regiaoOk ? valor.regiao : ""} onChange={(e) => onChange({ regiao: e.target.value, cidade: "" })} required disabled={!dados}>
          <option value="">{dados ? "Escolha" : "Carregando..."}</option>
          {dados?.regioes.map((r) => (
            <option key={r.c} value={r.c}>{r.n}</option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Cidade</span>
        <select value={lista.includes(valor.cidade) ? valor.cidade : ""} onChange={(e) => onChange({ ...valor, cidade: e.target.value })} required disabled={!regiaoOk}>
          <option value="">{regiaoOk ? "Escolha a cidade" : `Escolha ${rotuloRegiao.toLowerCase().startsWith("p") ? "a" : "o"} ${rotuloRegiao.toLowerCase()}`}</option>
          {lista.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
    </>
  );
}

export const nomeRegiao = (d: DadosPais | null, codigo: string) => d?.regioes.find((r) => r.c === codigo)?.n ?? "";
