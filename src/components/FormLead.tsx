"use client";

import { useState } from "react";
import { SEGMENTOS, SERVICOS } from "@/lib/catalogo";
import { novoId } from "@/lib/store";
import type { Lead } from "@/lib/types";
import { lerLocalDoLead, SeletorFora, SeletorLocal } from "./SeletorLocal";
import { LISTA_PAISES, PAISES, type PaisId } from "@/lib/paises";

export const leadVazio = (): Lead => ({
  id: novoId(),
  empresa: "",
  responsavel: "",
  segmento: "odontologia",
  cidade: "",
  telefone: "",
  site: "",
  siteStatus: "nao-encontrado",
  instagram: "",
  seguidores: "",
  infoPublica: "",
  servicoInteresse: "site",
  status: "novo",
  contatos: [],
  criadoEm: new Date().toISOString(),
});

export default function FormLead({ inicial, onSalvar, onFechar }: { inicial: Lead; onSalvar: (l: Lead) => void; onFechar: () => void }) {
  const [l, setL] = useState<Lead>(inicial);
  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => setL((x) => ({ ...x, [k]: v }));

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <form
        className="card pad modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!l.empresa.trim()) return;
          const ddi = l.pais ? PAISES[l.pais].ddi : "";
          const tel = l.telefone.trim();
          // Fora do Brasil, guarda o número com o código do país (+1, +44...) para o WhatsApp abrir certo.
          const telefone = ddi && tel && !/^(\+|00)/.test(tel) ? `+${ddi} ${tel.replace(new RegExp(`^${ddi}`), "")}` : tel;
          onSalvar({ ...l, telefone, siteStatus: l.site.trim() ? l.siteStatus : "nao-encontrado" });
        }}
      >
        <h2 style={{ marginTop: 0 }}>{inicial.empresa ? "Editar lead" : "Novo lead"}</h2>
        <div className="grade g2">
          <label className="campo"><span>Empresa</span><input required value={l.empresa} onChange={(e) => set("empresa", e.target.value)} /></label>
          <label className="campo"><span>Responsável</span><input value={l.responsavel} onChange={(e) => set("responsavel", e.target.value)} placeholder="Nome de quem decide" /></label>
          <label className="campo">
            <span>Segmento</span>
            <select value={l.segmento} onChange={(e) => set("segmento", e.target.value as Lead["segmento"])}>
              {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label className="campo">
            <span>País</span>
            <select value={l.pais ?? "BR"} onChange={(e) => setL((x) => ({ ...x, pais: e.target.value === "BR" ? undefined : (e.target.value as PaisId), cidade: "" }))}>
              {LISTA_PAISES.map((p) => <option key={p.id} value={p.id}>{p.bandeira} {p.nome}</option>)}
            </select>
          </label>
          {(l.pais ?? "BR") === "BR" ? (
            <SeletorLocal
              valor={lerLocalDoLead(l.cidade)}
              onChange={(v) => set("cidade", v.cidade || v.uf ? `${v.cidade}/${v.uf}` : "")}
              comBairro={false}
            />
          ) : (
            <SeletorFora
              pais={l.pais!}
              rotuloRegiao={PAISES[l.pais!].regiao}
              valor={{ cidade: l.cidade.split("/")[0] ?? "", regiao: l.cidade.split("/")[1] ?? "" }}
              onChange={(v) => set("cidade", v.cidade || v.regiao ? `${v.cidade}/${v.regiao}` : "")}
            />
          )}
          <label className="campo">
            <span>{(l.pais ?? "BR") === "BR" ? "WhatsApp com DDD" : `WhatsApp com +${PAISES[l.pais!].ddi}`}</span>
            <input value={l.telefone} inputMode="tel" onChange={(e) => set("telefone", e.target.value)} placeholder={(l.pais ?? "BR") === "BR" ? "(98) 99123-4567" : `+${PAISES[l.pais!].ddi} ...`} />
          </label>
          <label className="campo">
            <span>Serviço que deseja oferecer</span>
            <select value={l.servicoInteresse} onChange={(e) => set("servicoInteresse", e.target.value as Lead["servicoInteresse"])}>
              {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label className="campo"><span>Endereço</span><input value={l.endereco ?? ""} onChange={(e) => set("endereco", e.target.value)} placeholder="Usado no botão do Maps" /></label>
          <label className="campo"><span>Link do Google Maps (opcional)</span><input value={l.mapa ?? ""} onChange={(e) => set("mapa", e.target.value)} placeholder="Cole o link do local" /></label>
          <label className="campo"><span>Site (vazio se não tiver)</span><input value={l.site} onChange={(e) => set("site", e.target.value)} placeholder="www.exemplo.com.br" /></label>
          <label className="campo">
            <span>Situação do site</span>
            <select value={l.site ? l.siteStatus : "nao-encontrado"} disabled={!l.site} onChange={(e) => set("siteStatus", e.target.value as Lead["siteStatus"])}>
              <option value="nao-encontrado">Não tem site</option>
              <option value="desatualizado">Tem, mas está desatualizado</option>
              <option value="ok">Tem e está ok</option>
            </select>
          </label>
          <label className="campo"><span>Instagram</span><input value={l.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@perfil" /></label>
          <label className="campo"><span>Link do site demonstrativo</span><input value={l.linkDemo ?? ""} onChange={(e) => set("linkDemo", e.target.value)} placeholder="Entra nas mensagens prontas" /></label>
        </div>
        <label className="campo" style={{ marginTop: 14 }}>
          <span>O que você viu sobre a empresa</span>
          <textarea
            value={l.infoPublica}
            onChange={(e) => set("infoPublica", e.target.value)}
            placeholder="Ex.: 4,8 no Google com 120 avaliações; posta antes e depois toda semana; atende convênios."
          />
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn prim">Salvar lead</button>
        </div>
      </form>
    </div>
  );
}
