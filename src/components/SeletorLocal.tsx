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
        <input
          list={`${id}-cidades`}
          value={valor.cidade}
          disabled={!valor.uf}
          placeholder={valor.uf ? `Digite (${lista.length || "..."} cidades)` : "Escolha o estado"}
          onChange={(e) => onChange({ ...valor, cidade: e.target.value })}
          onBlur={() => {
            const certa = lista.find((c) => sem(c) === sem(valor.cidade));
            if (certa && certa !== valor.cidade) onChange({ ...valor, cidade: certa });
          }}
          aria-invalid={!valida}
          required
          autoComplete="off"
        />
        <datalist id={`${id}-cidades`}>
          {lista.map((c) => <option key={c} value={c} />)}
        </datalist>
        {!valida && <small className="erro" style={{ marginTop: 2 }}>Cidade não encontrada em {UFS[valor.uf]}</small>}
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
