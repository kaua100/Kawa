import "server-only";

export interface DadosSite {
  empresa: string;
  segmento: string;
  cidade: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  instagram: string;
  site: string;
  mapa: string;
  nota: string;
  descricao: string;
  servicos: string;
}

export interface EstiloSite {
  corPrimaria: string;
  corSecundaria: string;
  corFundo: string;
  estilo: string;
  fonte: string;
  secoes: string[];
}

export interface MidiaSite {
  url: string;
  tipo: "imagem" | "video";
  origem: string;
  descricao?: string;
}

const REGRAS_TEXTO = `REGRAS DE TEXTO (português do Brasil):
- Escreva como um redator experiente, específico e direto. Frases curtas, sem cara de IA.
- Use só fatos dos dados da empresa. Nunca invente números, anos de experiência, prêmios, depoimentos, clientes, preços, horários ou promessas.
- Se uma informação não existir nos dados, não crie: deixe a seção de fora ou use um texto neutro sem afirmar fatos.
- Proibido: "não é X, é Y"; listas de negações; perguntas que você mesmo responde ("O resultado? ..."); frases feitas como "no mundo de hoje", "leve ao próximo nível", "solução completa", "excelência", "qualidade e compromisso"; travessão em títulos; pontos de exclamação.
- Cada seção defende uma ideia. Títulos concretos, que o cliente consegue imaginar.
- Chamadas de ação claras, por exemplo "Chamar no WhatsApp", "Ver como chegar", "Pedir orçamento".`;

const REGRAS_CODIGO = `REGRAS DE CÓDIGO:
- Devolva UM arquivo HTML completo, começando por <!doctype html> e terminando em </html>. Nada antes nem depois, sem blocos de markdown.
- CSS dentro de <style> no <head>, JavaScript (se precisar) dentro de <script> no final do <body>. Sem frameworks, sem CDNs de CSS/JS. Pode usar Google Fonts por <link>.
- Responsivo de verdade (celular primeiro), menu que funciona no celular, imagens com object-fit e loading="lazy", contraste legível.
- Use APENAS as URLs de imagens e vídeos fornecidas na lista de mídias. Nunca use imagens de banco, placeholders ou URLs inventadas. Sem mídia, faça um layout bonito só com cor, tipografia e formas em CSS.
- Vídeos: <video> com muted, playsinline, loop e autoplay apenas quando for fundo; senão controls.
- Links de WhatsApp no formato https://wa.me/NUMERO (só dígitos, com 55). Telefone com tel:. Instagram com https://instagram.com/usuario.
- Mapa: se houver endereço, use um iframe do Google Maps com a busca do endereço (https://www.google.com/maps?q=ENDERECO&output=embed).
- <title> e <meta name="description"> com o nome da empresa e o que ela faz na cidade.
- Marque cada seção com <section id="..."> para facilitar edições.`;

export const SISTEMA_GERAR = `Você cria sites profissionais de uma página para negócios locais brasileiros. O site precisa parecer feito sob medida para a empresa, moderno e pronto para publicar.

${REGRAS_TEXTO}

${REGRAS_CODIGO}`;

export const SISTEMA_EDITAR = `Você edita um site HTML existente de um negócio local brasileiro, seguindo o pedido do usuário.
Mude só o que foi pedido e mantenha todo o resto igual (textos, seções, estilo e mídias não citados).
Devolva o arquivo HTML COMPLETO já modificado.

${REGRAS_TEXTO}

${REGRAS_CODIGO}`;

const linha = (k: string, v: string) => (v?.trim() ? `- ${k}: ${v.trim()}` : "");

export function descreverDados(d: DadosSite) {
  return [
    linha("Empresa", d.empresa),
    linha("Segmento", d.segmento),
    linha("Cidade", d.cidade),
    linha("Endereço", d.endereco),
    linha("Telefone", d.telefone),
    linha("WhatsApp (só dígitos)", d.whatsapp),
    linha("Instagram", d.instagram),
    linha("Site atual", d.site),
    linha("Link do Google Maps", d.mapa),
    linha("Avaliação no Google", d.nota),
    linha("Serviços/produtos", d.servicos),
    linha("Descrição e informações", d.descricao),
  ]
    .filter(Boolean)
    .join("\n");
}

export function descreverEstilo(e: EstiloSite) {
  return [
    `- Estilo visual: ${e.estilo}`,
    `- Cor principal: ${e.corPrimaria}`,
    `- Cor de destaque: ${e.corSecundaria}`,
    `- Cor de fundo: ${e.corFundo}`,
    e.fonte ? `- Tipografia: ${e.fonte}` : "",
    `- Seções, nesta ordem: ${e.secoes.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function descreverMidias(m: MidiaSite[]) {
  if (!m.length) return "Nenhuma mídia disponível. Não use imagens.";
  return m.map((x, i) => `${i + 1}. [${x.tipo}] ${x.url}${x.descricao ? ` (${x.descricao})` : ""}`).join("\n");
}

/** Tira cercas de markdown e confere se é um HTML completo. */
export function limparHtml(saida: string): string {
  let t = saida.trim();
  const cerca = /^```(?:html)?\s*([\s\S]*?)```\s*$/i.exec(t);
  if (cerca) t = cerca[1].trim();
  const ini = t.search(/<!doctype html|<html/i);
  const fim = t.toLowerCase().lastIndexOf("</html>");
  if (ini < 0 || fim < 0) throw new Error("A IA não devolveu um HTML completo. Tente de novo.");
  return t.slice(ini, fim + 7);
}
