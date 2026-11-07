"use client";

import { useState } from "react";
import { SEGMENTOS, SERVICOS } from "@/lib/catalogo";
import { novoId } from "@/lib/store";
import type { Lead } from "@/lib/types";

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
          onSalvar({ ...l, siteStatus: l.site.trim() ? l.siteStatus : "nao-encontrado" });
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
          <label className="campo"><span>Cidade</span><input value={l.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="Ex.: São Luís/MA" /></label>
          <label className="campo"><span>WhatsApp com DDD</span><input value={l.telefone} inputMode="tel" onChange={(e) => set("telefone", e.target.value)} placeholder="(98) 99123-4567" /></label>
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
