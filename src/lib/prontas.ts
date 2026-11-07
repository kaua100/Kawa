import { segmentoPorId, servicoPorId, type Segmento } from "./catalogo";
import type { CategoriaId, Lead } from "./types";

/**
 * Mensagens prontas para enviar no WhatsApp.
 * Todas são preenchidas com os dados do lead e não deixam campos em branco.
 * Quando falta uma informação, a frase muda para não depender dela.
 */

export interface CtxZap {
  oi: string; // "Oi, Marina, tudo bem?" ou "Oi, tudo bem?"
  vc: string; // ", Marina" ou ""
  nome: string;
  euSou: string; // "Aqui é Kaua, da Conecta Digital" ou "Aqui é da Conecta Digital"
  empresa: string;
  cidade: string;
  seg: Segmento;
  servico: string;
  umServico: string;
  servicoResumo: string;
  site: string;
  siteStatus: Lead["siteStatus"];
  linkDemo: string;
}

export function contextoZap(lead: Lead, vendedor: string): CtxZap {
  const nome = (lead.responsavel || "").trim().split(" ")[0] || "";
  const sv = servicoPorId(lead.servicoInteresse);
  return {
    oi: nome ? `Oi, ${nome}, tudo bem?` : "Oi, tudo bem?",
    vc: nome ? `, ${nome}` : "",
    nome,
    euSou: vendedor.trim() ? `Aqui é ${vendedor.trim()}, da Conecta Digital` : "Aqui é da Conecta Digital",
    empresa: lead.empresa,
    cidade: lead.cidade.split("/")[0].trim(),
    seg: segmentoPorId(lead.segmento),
    servico: sv.nome,
    umServico: `${sv.artigo} ${sv.nome}`,
    servicoResumo: sv.resumo,
    site: lead.site,
    siteStatus: lead.site ? lead.siteStatus : "nao-encontrado",
    linkDemo: (lead.linkDemo || "").trim(),
  };
}

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const daCidade = (c: CtxZap) => (c.cidade ? ` aqui de ${c.cidade}` : "");

function sobreSite(c: CtxZap) {
  if (c.siteStatus === "nao-encontrado") return "não achei um site de vocês";
  if (c.siteStatus === "desatualizado") return "vi o site de vocês e tive algumas ideias para ele mostrar melhor o trabalho de hoje";
  return "vi o site de vocês e tive algumas ideias";
}

export interface MensagemPronta {
  id: string;
  titulo: string;
  quando: string;
  categoria: CategoriaId;
  texto: (c: CtxZap) => string;
}

export interface Etapa {
  id: string;
  nome: string;
  mensagens: MensagemPronta[];
}

export const ETAPAS: Etapa[] = [
  {
    id: "primeira",
    nome: "Primeira mensagem",
    mensagens: [
      {
        id: "primeira-direta",
        titulo: "Direta",
        quando: "Para quem não conhece você. Curta e já diz o motivo.",
        categoria: "whatsapp",
        texto: (c) => `${c.oi} ${c.euSou}.

Pesquisei ${c.empresa} no Google e ${sobreSite(c)}. Eu faço sites para ${c.seg.plural}${daCidade(c)}.

Posso te mostrar uma ideia rápida de como ficaria o de vocês?`,
      },
      {
        id: "primeira-pergunta",
        titulo: "Começando com pergunta",
        quando: "Abre conversa com uma pergunta fácil de responder.",
        categoria: "whatsapp",
        texto: (c) => `${c.oi} ${c.euSou}.

Uma pergunta rápida: ${minuscula(c.seg.gancho.replaceAll("{cidade}", c.cidade || "na cidade"))}

Pergunto porque trabalho com ${c.seg.plural} e tenho uma ideia que pode ajudar vocês nisso.`,
      },
      {
        id: "primeira-segmento",
        titulo: "Pela dor do segmento",
        quando: "Mostra que você entende o dia a dia do negócio.",
        categoria: "whatsapp",
        texto: (c) => `${c.oi} ${c.euSou}.

Trabalho com ${c.seg.plural} e uma coisa que vejo sempre é que ${c.seg.dores[0]}.

Pensei em ${c.umServico} para ${c.empresa} que ajuda nisso. Posso te mandar a ideia?`,
      },
    ],
  },
  {
    id: "resposta",
    nome: "Quando a pessoa responder",
    mensagens: [
      {
        id: "resposta-explicar",
        titulo: "Respondeu \"pode mandar\"",
        quando: "Explica a ideia em poucas linhas.",
        categoria: "site-demonstrativo",
        texto: (c) => `Perfeito${c.vc}. Te explico rapidinho:

A ideia é ${c.umServico}: ${c.servicoResumo}. Para ${c.seg.plural}, ${c.seg.argumentos[0]}.

Ele mostraria ${c.seg.oQueMostrar}.

${
  c.linkDemo
    ? `Montei um modelo para você ver como ficaria: ${c.linkDemo}`
    : "Se quiser, eu monto um modelo com a cara de vocês para você ver antes de decidir qualquer coisa. Pode ser?"
}`,
      },
      {
        id: "resposta-preco",
        titulo: "Perguntou o preço logo de cara",
        quando: "Entende a necessidade antes de passar valor.",
        categoria: "negociacao",
        texto: (c) => `Te passo sim${c.vc}. O valor muda conforme o que vocês precisam, então para te mandar certinho me responde duas coisas:

1. Hoje os ${c.seg.clientes} chegam mais por indicação, Instagram ou Google?
2. Vocês querem só apresentar o trabalho ou também receber pedidos e agendamentos pelo site?

Com isso já te mando a proposta com o valor.`,
      },
      {
        id: "resposta-como-funciona",
        titulo: "Perguntou como funciona",
        quando: "Explica o passo a passo do projeto.",
        categoria: "proposta",
        texto: (c) => `Funciona assim${c.vc}:

1. Vocês me mandam logo, fotos e as informações de vocês.
2. Eu monto o site e te mostro a primeira versão.
3. Vocês pedem os ajustes que quiserem.
4. Coloco no ar com o endereço de vocês e te mostro como acompanhar os contatos.

Tudo é feito por aqui mesmo, pelo WhatsApp. Quer que eu te mande a proposta?`,
      },
    ],
  },
  {
    id: "demo",
    nome: "Site demonstrativo",
    mensagens: [
      {
        id: "demo-envio",
        titulo: "Enviar o modelo",
        quando: "Cadastre o link do modelo no lead para ele entrar aqui.",
        categoria: "site-demonstrativo",
        texto: (c) =>
          c.linkDemo
            ? `${c.oi} Como combinado, montei um modelo de como poderia ficar o site de ${c.empresa}:

${c.linkDemo}

Abre no celular, que é como a maioria dos ${c.seg.clientes} vai ver. Usei alguns textos e fotos de exemplo; na versão final entram os de vocês.

O que achou?`
            : `${c.oi} Posso montar um modelo de site para ${c.empresa}, com a cara de vocês, para você ver como ficaria antes de decidir qualquer coisa. Sem compromisso. Topa?`,
      },
      {
        id: "demo-cobrar",
        titulo: "Depois de enviar o modelo",
        quando: "Um ou dois dias depois do envio, se não respondeu.",
        categoria: "follow-up",
        texto: (c) => `${c.oi} Conseguiu abrir o modelo do site? Se quiser mudar cor, foto ou algum texto, me fala que eu ajusto para você ver de novo.`,
      },
    ],
  },
  {
    id: "followup",
    nome: "Follow-up",
    mensagens: [
      {
        id: "follow-2dias",
        titulo: "2 dias sem resposta",
        quando: "Lembrete leve.",
        categoria: "follow-up",
        texto: (c) => `${c.oi} Conseguiu ver o que te mandei? Se ficou alguma dúvida, me fala que te explico rapidinho.`,
      },
      {
        id: "follow-semana",
        titulo: "1 semana sem resposta",
        quando: "Oferece um jeito mais fácil de conversar.",
        categoria: "follow-up",
        texto: (c) => `${c.oi} Passando aqui de novo sobre o site de ${c.empresa}. Sei que a rotina é corrida.

Prefere que eu te mande um áudio de um minuto explicando, ou que eu te chame outro dia?`,
      },
      {
        id: "follow-ultima",
        titulo: "Última tentativa",
        quando: "Encerra com educação. Muita gente responde nessa.",
        categoria: "follow-up",
        texto: (c) => `${c.oi} Vou parar de te chamar sobre isso para não incomodar.

Se em algum momento fizer sentido ter ${c.umServico} para ${c.empresa}, é só me mandar mensagem aqui. Abraço.`,
      },
    ],
  },
  {
    id: "proposta",
    nome: "Proposta e fechamento",
    mensagens: [
      {
        id: "proposta-envio",
        titulo: "Enviar a proposta",
        quando: "Anexe o PDF da proposta junto.",
        categoria: "proposta",
        texto: (c) => `${c.oi} Segue a proposta do ${c.servico} para ${c.empresa}. Coloquei o que está incluso, o prazo e as formas de pagamento.

Dá uma lida com calma e me fala o que achou. Se preferir, te explico por áudio.`,
      },
      {
        id: "proposta-cobrar",
        titulo: "Depois da proposta",
        quando: "Dois ou três dias depois de enviar.",
        categoria: "follow-up",
        texto: (c) => `${c.oi} Conseguiu ver a proposta? Ficou alguma dúvida sobre o que está incluso ou sobre o pagamento?`,
      },
      {
        id: "fechamento",
        titulo: "Cliente topou",
        quando: "Pede o material para começar.",
        categoria: "fechamento",
        texto: (c) => `Que bom${c.vc}, vamos começar. Para eu montar o site preciso de:

1. Logo e fotos que vocês já têm
2. As informações que vão no site: ${c.seg.oQueMostrar}
3. A confirmação do pagamento da entrada

Assim que eu receber, começo e te mostro a primeira versão.`,
      },
    ],
  },
  {
    id: "objecoes",
    nome: "Respostas para objeções",
    mensagens: [
      {
        id: "obj-site",
        titulo: "\"Já tenho site\"",
        quando: "",
        categoria: "objecoes",
        texto: (c) => `Que bom${c.vc}. Ele tem trazido contato novo para vocês? Se quiser, dou uma olhada e te mando três sugestões de melhoria, sem compromisso.`,
      },
      {
        id: "obj-interesse",
        titulo: "\"Não tenho interesse\"",
        quando: "",
        categoria: "objecoes",
        texto: (c) => `Tudo bem${c.vc}, obrigado por responder. Vou deixar meu contato salvo aqui. Se um dia precisar, é só chamar.`,
      },
      {
        id: "obj-caro",
        titulo: "\"Está muito caro\"",
        quando: "",
        categoria: "negociacao",
        texto: (c) => `Entendo${c.vc}. Dá para começar com uma versão mais simples e completar depois, ou dividir o pagamento. Quer que eu te mande essas duas opções?`,
      },
      {
        id: "obj-pensar",
        titulo: "\"Vou pensar\"",
        quando: "",
        categoria: "objecoes",
        texto: (c) => `Claro${c.vc}, pensa com calma. Ficou alguma dúvida que eu possa responder agora? Se não, te chamo na semana que vem, pode ser?`,
      },
      {
        id: "obj-alguem",
        titulo: "\"Já tenho alguém que cuida disso\"",
        quando: "",
        categoria: "objecoes",
        texto: () => `Que bom que vocês têm alguém cuidando disso. Essa pessoa faz o site também ou cuida mais das redes sociais? Se for só das redes, o site pode somar com o trabalho dela.`,
      },
      {
        id: "obj-dinheiro",
        titulo: "\"Não tenho dinheiro agora\"",
        quando: "",
        categoria: "objecoes",
        texto: (c) => `Entendo${c.vc}, obrigado pela sinceridade. Qual mês seria melhor para eu te chamar de novo?`,
      },
      {
        id: "obj-outro-dia",
        titulo: "\"Me chama outro dia\"",
        quando: "Registre a data no histórico do lead.",
        categoria: "objecoes",
        texto: () => `Combinado. Qual dia fica melhor para você? Eu te chamo nesse dia.`,
      },
      {
        id: "obj-socio",
        titulo: "\"Preciso falar com meu sócio\"",
        quando: "",
        categoria: "objecoes",
        texto: () => `Faz sentido decidir juntos. Quer que eu te mande um resumo curto com o que está incluso e o valor, para você mostrar para ele?`,
      },
      {
        id: "obj-instagram",
        titulo: "\"Já divulgo pelo Instagram\"",
        quando: "",
        categoria: "objecoes",
        texto: (c) => `O Instagram ajuda bastante com quem já segue vocês. O site aparece para quem pesquisa no Google e ainda não conhece ${c.empresa}.

Os dois funcionam juntos: quem acha vocês no Google acaba seguindo no Instagram também.`,
      },
      {
        id: "obj-nao-preciso",
        titulo: "\"Não preciso de site\"",
        quando: "",
        categoria: "objecoes",
        texto: (c) => `Entendo. Só uma curiosidade: quando alguém recebe indicação de vocês e pesquisa ${c.empresa} no Google, o que aparece?

O site ajuda muito nisso, a confirmar a indicação. Mas fica à vontade.`,
      },
    ],
  },
  {
    id: "depois",
    nome: "Recuperação e pós-venda",
    mensagens: [
      {
        id: "recuperacao",
        titulo: "Reabrir conversa antiga",
        quando: "Para quem esfriou ou disse \"agora não\" há algumas semanas.",
        categoria: "recuperacao",
        texto: (c) => `${c.oi} ${c.euSou}. A gente conversou um tempo atrás sobre ${c.umServico} para ${c.empresa}.

Lembrei de vocês e resolvi chamar de novo. Como estão as coisas por aí? Ainda faz sentido conversar sobre isso?`,
      },
      {
        id: "pos-entrega",
        titulo: "Site no ar",
        quando: "No dia da entrega.",
        categoria: "pos-venda",
        texto: (c) => `${c.oi} O site de ${c.empresa} está no ar${c.site ? `: ${c.site}` : ""}.

Dá uma olhada no celular e me fala se quer ajustar alguma coisa.`,
      },
      {
        id: "pos-30dias",
        titulo: "30 dias depois",
        quando: "Acompanhamento.",
        categoria: "pos-venda",
        texto: (c) => `${c.oi} Faz um mês que o site está no ar. Algum ${c.seg.cliente} comentou que encontrou vocês por lá? Quer mudar ou acrescentar alguma coisa?`,
      },
      {
        id: "pos-indicacao",
        titulo: "Depoimento e indicação",
        quando: "Quando o cliente estiver satisfeito.",
        categoria: "pos-venda",
        texto: (c) => `${c.nome ? `${c.nome}, q` : "Q"}ue bom que você gostou do site. Posso te pedir dois favores?

1. Um depoimento curto, pode ser um áudio ou duas linhas de texto.
2. Se conhecer alguém que precise de site, me indica. Atendo com o mesmo cuidado.

Obrigado pela confiança.`,
      },
    ],
  },
];

/** Normaliza para o formato do wa.me (só dígitos, com 55). Retorna "" se não der. */
export function telefoneWhatsApp(tel: string): string {
  let d = (tel || "").replace(/\D/g, "");
  if (!d) return "";
  d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.length < 12 || d.length > 13) return "";
  return d;
}

export function linkWhatsApp(tel: string, texto: string): string {
  const num = telefoneWhatsApp(tel);
  const t = encodeURIComponent(texto);
  return num ? `https://wa.me/${num}?text=${t}` : `https://wa.me/?text=${t}`;
}
