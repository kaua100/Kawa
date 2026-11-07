import { segmentoPorId, servicoPorId, type Segmento } from "./catalogo";
import type { CategoriaId, Lead, SegmentoId, ServicoId } from "./types";

/**
 * Biblioteca de scripts prontos.
 * Os textos são montados a partir da categoria + segmento + serviço.
 * Sem lead selecionado, os dados aparecem entre colchetes para o usuário preencher.
 */

export interface Contexto {
  empresa: string;
  responsavel: string;
  saudacaoNome: string; // "Carlos" ou "" (para "Oi, tudo bem?")
  cidade: string;
  vendedor: string;
  seg: Segmento;
  servico: string; // "site profissional"
  umServico: string; // "um site profissional"
  servicoResumo: string;
  sobreSite: string; // observação sobre o site encontrado
  sobreInstagram: string;
}

export function montarContexto(
  segmento: SegmentoId,
  servico: ServicoId,
  lead?: Lead | null,
  vendedor?: string,
): Contexto {
  const seg = segmentoPorId(segmento);
  const sv = servicoPorId(servico);

  let sobreSite = "[comente o que você viu: se tem site, se está atualizado]";
  let sobreInstagram = "[comente o que você viu no Instagram]";
  if (lead) {
    if (lead.siteStatus === "nao-encontrado" || !lead.site) {
      sobreSite = "não encontrei um site de vocês, só o perfil e o contato";
    } else if (lead.siteStatus === "desatualizado") {
      sobreSite = "vi o site de vocês e acho que ele pode mostrar melhor o trabalho que vocês fazem hoje";
    } else {
      sobreSite = "vi o site de vocês";
    }
    sobreInstagram = lead.instagram
      ? `vi o Instagram de vocês (${lead.instagram})`
      : "não encontrei um Instagram de vocês";
  }

  return {
    empresa: lead?.empresa || "[nome da empresa]",
    responsavel: lead?.responsavel || "[nome do responsável]",
    saudacaoNome: lead ? lead.responsavel.split(" ")[0] || "" : "[nome]",
    cidade: lead?.cidade || "[cidade]",
    vendedor: vendedor?.trim() || "[seu nome]",
    seg,
    servico: sv.nome,
    umServico: `${sv.artigo} ${sv.nome}`,
    servicoResumo: sv.resumo,
    sobreSite,
    sobreInstagram,
  };
}

const oi = (c: Contexto) => (c.saudacaoNome ? `Oi, ${c.saudacaoNome}, tudo bem?` : "Oi, tudo bem?");
const vc = (c: Contexto) => (c.saudacaoNome ? `, ${c.saudacaoNome}` : "");
const gancho = (c: Contexto) => c.seg.gancho.replaceAll("{cidade}", c.cidade);

const TEMPLATES: Record<CategoriaId, (c: Contexto) => string> = {
  "primeira-ligacao": (c) => `CUMPRIMENTO
Bom dia, tudo bem? Eu falo com ${c.responsavel}?
(Se não for a pessoa: "Ah, tudo bem. Quem cuida da parte de divulgação da ${c.empresa}? Qual o melhor horário para falar com ela?")

APRESENTAÇÃO
Aqui é ${c.vendedor}, da Conecta Digital. A gente faz sites e cuida da presença no Google para ${c.seg.plural} aqui de ${c.cidade} e região.

MOTIVO DO CONTATO
Eu estava pesquisando a ${c.empresa} e ${c.sobreSite}. Por isso resolvi ligar, coisa rápida.

PERGUNTA PARA DESPERTAR INTERESSE
${gancho(c)}
(Deixe a pessoa falar. Anote as palavras que ela usar, porque você vai repetir na apresentação.)

CONEXÃO
Entendi. Isso é bem comum com ${c.seg.plural}: ${c.seg.dores[0]}.

PEDIDO DE PERMISSÃO
Posso te mostrar como ficaria ${c.umServico} pensado para a ${c.empresa}? Leva uns cinco minutos e, se não fizer sentido, sem problema nenhum.

PRÓXIMO PASSO
Prefere que eu te mande pelo WhatsApp agora e a gente conversa por lá, ou marcamos quinze minutos amanhã? Qual horário fica melhor para você?`,

  "segunda-ligacao": (c) => `RETOMADA
${oi(c)} Aqui é ${c.vendedor}, da Conecta Digital. A gente conversou [dia da última conversa] sobre ${c.umServico} para a ${c.empresa}.

LEMBRAR O PONTO DA CONVERSA ANTERIOR
Você tinha comentado que [o que a pessoa disse na primeira ligação]. Fiquei com isso na cabeça.

NOVIDADE (motivo para ligar de novo)
Preparei [um modelo / uma ideia de estrutura] mostrando como ${c.seg.argumentos[0]}.

PERGUNTA
Você conseguiu pensar no assunto desde a última vez? O que ficou de dúvida?

PEDIDO
Posso te mandar agora pelo WhatsApp para você ver com calma? Depois eu te ligo uns dez minutinhos para explicar o que pensei.`,

  whatsapp: (c) => `${oi(c)} Aqui é ${c.vendedor}, da Conecta Digital.

Eu estava olhando a ${c.empresa} e ${c.sobreSite}. Trabalho com ${c.seg.plural} aqui de ${c.cidade} e uma coisa que eu sempre vejo é que ${c.seg.dores[0]}.

Tenho uma ideia de ${c.servico} para vocês que ajuda nisso. Posso te mandar um áudio rápido ou uma imagem explicando?`,

  instagram: (c) => `${oi(c)} Sou ${c.vendedor}, da Conecta Digital, aqui de ${c.cidade} também.

Conheci o perfil da ${c.empresa} e gostei de [algo real que você viu no perfil: um post, o atendimento, as fotos].

Eu faço sites para ${c.seg.plural} e fiquei pensando em como ${c.seg.argumentos[0]}. Se você tiver interesse, te mostro uma ideia por aqui mesmo. Se não for o momento, tudo certo também.`,

  "site-demonstrativo": (c) => `${oi(c)} Como combinamos, montei um modelo de como poderia ficar o site da ${c.empresa}:

[link do site demonstrativo]

Algumas coisas que pensei para vocês:
• ${capitalizar(c.seg.argumentos[0])}.
• ${capitalizar(c.seg.argumentos[1])}.
• Tem espaço para ${c.seg.oQueMostrar}.

Usei fotos e textos de exemplo. Na versão final entram as fotos e as informações reais de vocês.

Dá uma olhada com calma, de preferência no celular, que é como a maioria dos ${c.seg.clientes} vai ver. O que você achou? Tem algo que você mudaria?`,

  proposta: (c) => `ABERTURA
${c.saudacaoNome ? `${c.saudacaoNome}, o` : "O"}brigado pelo tempo. Antes de falar de valores, quero confirmar se entendi o que vocês precisam.

RESUMO DO QUE OUVI
Pelo que você me contou, hoje [resumo do problema nas palavras do cliente]. E o objetivo é [objetivo que o cliente falou].

O QUE ESTÁ INCLUSO
A proposta é ${c.umServico} para a ${c.empresa}: ${c.servicoResumo}.
Ele vai mostrar ${c.seg.oQueMostrar}.

POR QUE ISSO AJUDA
${capitalizar(c.seg.clientes)} ${c.seg.comoBuscam}. Com o site:
• ${capitalizar(c.seg.argumentos[0])}.
• ${capitalizar(c.seg.argumentos[1])}.
• ${capitalizar(c.seg.argumentos[2])}.

COMO FUNCIONA
1. Vocês me mandam fotos, logo e informações.
2. Eu entrego a primeira versão em [prazo] e vocês pedem os ajustes.
3. Publicamos com domínio próprio e eu te mostro como acompanhar os contatos.

INVESTIMENTO
O valor é [valor], [forma de pagamento]. Inclui [o que inclui: domínio, hospedagem, ajustes, suporte].

PERGUNTA DE CHECAGEM
Isso faz sentido para o que você precisa hoje? Ficou alguma dúvida sobre o que está incluso?${
    c.seg.cuidado ? `\n\nATENÇÃO: ${c.seg.cuidado}` : ""
  }`,

  "follow-up": (c) => `${oi(c)} Aqui é ${c.vendedor}, da Conecta Digital.

Passando para saber se você conseguiu ver [o modelo / a proposta] que te mandei para a ${c.empresa}.

Se tiver ficado alguma dúvida, me fala que eu explico em um áudio rápido. E se não for o momento, pode me dizer também, sem problema.`,

  objecoes: (c) => `Use as respostas da aba "Objeções". Estrutura que funciona para qualquer objeção:

1. CONCORDE COM O SENTIMENTO
"Entendo${vc(c)}. Faz sentido você pensar assim."

2. PERGUNTE ANTES DE RESPONDER
"Posso te perguntar o que te faz pensar isso?"

3. RESPONDA COM UM PONTO DO SEGMENTO
"Com ${c.seg.plural}, o que eu vejo é que ${c.seg.dores[0]}."

4. DEVOLVA A DECISÃO
"Se fizer sentido para você, eu te mostro. Se não fizer, tudo bem também."`,

  negociacao: (c) => `QUANDO O CLIENTE PEDIR DESCONTO
Entendo${vc(c)}. Antes de mexer no valor, me ajuda a entender: o valor ficou acima do que você tinha planejado, ou a dúvida é se vale o investimento?

SE FOR ORÇAMENTO APERTADO (ajuste o escopo, não o preço)
Uma opção é começar com o essencial: [versão menor, ex.: landing page com os principais serviços e WhatsApp]. Depois, quando fizer sentido, a gente amplia. Assim o valor fica em [valor menor].

SE FOR FORMA DE PAGAMENTO
Consigo dividir em [número] vezes de [valor], com a primeira parcela na aprovação e o restante [condição].

SE FOR COMPARAÇÃO COM OUTRO ORÇAMENTO
Faz sentido comparar. Vale olhar o que cada orçamento inclui: domínio, hospedagem, ajustes depois da entrega, se o site é seu e quem dá suporte. Se quiser, a gente compara item por item.

O QUE EVITAR
Não dê desconto sem receber algo em troca (pagamento à vista, depoimento, indicação). Isso mantém o valor do seu trabalho.`,

  fechamento: (c) => `RESUMO
Então, recapitulando: ${c.umServico} para a ${c.empresa}, com ${c.seg.oQueMostrar}, entregue em [prazo], por [valor].

PERGUNTA DE FECHAMENTO
Ficou alguma dúvida que te impede de começar?

SE NÃO HOUVER DÚVIDA
Ótimo. Para começar eu preciso de três coisas: a confirmação do pagamento da [primeira parcela], o logo e as fotos que vocês já têm. Te mando agora o contrato e os dados para pagamento pelo WhatsApp, pode ser?

DATA
Se eu receber o material até [dia], consigo te mostrar a primeira versão em [data].

SE A PESSOA HESITAR
Tranquilo. O que precisaria acontecer para você se sentir seguro para começar?`,

  recuperacao: (c) => `${oi(c)} Aqui é ${c.vendedor}, da Conecta Digital. A gente conversou um tempo atrás sobre ${c.umServico} para a ${c.empresa}.

Na época não era o momento, e eu entendi. Estou voltando a falar porque [motivo real: abriu agenda, novo modelo, condição de pagamento nova, época do ano importante para o segmento].

Como estão as coisas por aí? Ainda faz sentido conversar sobre isso, ou hoje as prioridades são outras?`,

  "pos-venda": (c) => `ENTREGA
${oi(c)} O site da ${c.empresa} está no ar: [link]. Testei no celular e no computador. Dá uma olhada e me fala se quer ajustar algo.

ACOMPANHAMENTO (30 dias depois)
${oi(c)} Faz um mês que o site está no ar. Queria saber como está: ${c.seg.clientes} comentaram que encontraram vocês por lá? Tem algo que você gostaria de mudar ou acrescentar?

PEDIDO DE DEPOIMENTO
Se você estiver gostando do resultado, me ajudaria muito um depoimento curto, pode ser um áudio ou texto de duas linhas. Uso para mostrar meu trabalho para outros negócios.

PEDIDO DE INDICAÇÃO
Você conhece alguém que também precise de site ou de ajuda com a presença online? Se indicar, eu atendo com o mesmo cuidado.

NOVO SERVIÇO (somente se fizer sentido)
Agora que o site está no ar, ${c.seg.id === "salao" || c.seg.id === "petshop" || c.seg.id === "odontologia" || c.seg.id === "clinica-medica" ? "um próximo passo seria o agendamento online" : "um próximo passo seria anunciar no Google para quem procura o serviço na região"}. Se quiser, te explico como funciona.`,
};

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function scriptDaBiblioteca(categoria: CategoriaId, c: Contexto): string {
  return TEMPLATES[categoria](c);
}

/* ---------------- OBJEÇÕES ---------------- */

export interface Objecao {
  id: string;
  objecao: string;
  resposta: (c: Contexto) => string;
}

export const OBJECOES: Objecao[] = [
  {
    id: "ja-tenho-site",
    objecao: "Já tenho um site.",
    resposta: (c) => `Que bom${vc(c)}. Muita gente do setor ainda não deu esse passo.

Posso te fazer duas perguntas rápidas? Ele está trazendo contatos novos? E quando foi a última vez que vocês atualizaram?

[Se trouxer resultado] Então ele está cumprindo o papel. Se um dia quiser uma segunda opinião, estou por aqui.
[Se não souber ou estiver parado] Às vezes o site existe, mas ${c.seg.clientes} não encontram o que procuram nele. Se quiser, eu faço uma análise gratuita e te mostro três pontos que poderiam melhorar. Você decide o que fazer com isso.`,
  },
  {
    id: "sem-interesse",
    objecao: "Não tenho interesse.",
    resposta: (c) => `Tudo bem${vc(c)}, agradeço a sinceridade.

Só para eu entender e não te incomodar à toa: é porque vocês já estão bem atendidos nessa parte, ou porque hoje a prioridade é outra?

[Depois da resposta] Entendi. Posso te mandar meu contato pelo WhatsApp? Se um dia fizer sentido, você já sabe onde me encontrar.`,
  },
  {
    id: "muito-caro",
    objecao: "Está muito caro.",
    resposta: (c) => `Entendo. É um investimento e faz sentido avaliar com cuidado.

Me ajuda a entender: o valor ficou acima do que você tinha planejado, ou a dúvida é se o site vai dar retorno?

[Se for orçamento] Dá para começar com uma versão mais enxuta e ampliar depois. Ou dividir o pagamento. O que funciona melhor para vocês?
[Se for retorno] Pensa assim: quantos ${c.seg.clientes} novos por mês fariam esse valor se pagar? Em muitos negócios do segmento, poucos já cobrem. Mas eu prefiro que você decida olhando os seus números.`,
  },
  {
    id: "vou-pensar",
    objecao: "Vou pensar.",
    resposta: (c) => `Claro${vc(c)}, é bom pensar com calma.

Para eu te ajudar nisso: o que ficou de dúvida? É o valor, o prazo ou se o site vai resolver o que você precisa?

[Depois da resposta] Combinado. Posso te chamar na [dia] para saber o que você decidiu? Se antes disso surgir alguma pergunta, me chama.`,
  },
  {
    id: "ja-tenho-alguem",
    objecao: "Já tenho alguém que cuida disso.",
    resposta: (c) => `Que bom que vocês já têm alguém. Ter uma pessoa de confiança nessa parte faz diferença.

Essa pessoa cuida também do site, ou mais das redes sociais?

[Se só redes] Então o site pode complementar o trabalho dela. Eu posso trabalhar junto, sem atrapalhar o que já funciona.
[Se cuida de tudo] Perfeito. Se em algum momento você quiser uma segunda opinião ou um projeto específico, como ${c.umServico}, pode contar comigo.`,
  },
  {
    id: "sem-dinheiro",
    objecao: "Não tenho dinheiro agora.",
    resposta: (c) => `Entendo${vc(c)}, e agradeço por falar abertamente.

Faz sentido conversarmos de novo mais para frente? Tem algum mês que costuma ser melhor para vocês?

[Se houver interesse real] Uma alternativa é começar com algo mais simples, com um valor menor, e completar depois. Mas só se fizer sentido para o caixa de vocês agora.`,
  },
  {
    id: "outro-dia",
    objecao: "Me chama outro dia.",
    resposta: (c) => `Claro, sem problema. Qual dia e horário ficam melhores para você?

[Anote no CRM e confirme] Combinado: te chamo na [dia], às [hora]. Para não tomar seu tempo, quer que eu te mande antes um resumo de duas linhas do que eu queria te mostrar?`,
  },
  {
    id: "socio",
    objecao: "Preciso conversar com meu sócio.",
    resposta: (c) => `Faz todo sentido decidir juntos.

Para facilitar essa conversa, quer que eu te mande um resumo curto com o que está incluso, o prazo e o valor? Aí você mostra para ele com tudo na mão.

E se for melhor, posso explicar para os dois numa conversa rápida de quinze minutos. Qual dia funcionaria?`,
  },
  {
    id: "instagram",
    objecao: "Já divulgo pelo Instagram.",
    resposta: (c) => `Dá para ver que vocês cuidam do Instagram, e isso ajuda muito.

O Instagram fala com quem já segue vocês. O site aparece para quem está pesquisando no Google e ainda não conhece a ${c.empresa}. ${capitalizar(c.seg.clientes)} ${c.seg.comoBuscam}.

Os dois trabalham juntos: quem acha vocês no Google pode seguir no Instagram, e quem vê o Instagram encontra no site as informações completas. Faz sentido para você?`,
  },
  {
    id: "nao-preciso",
    objecao: "Não preciso de site.",
    resposta: (c) => `Entendo. Se a agenda de vocês está cheia e os clientes chegam bem por indicação, talvez não seja prioridade mesmo.

Posso te fazer uma pergunta? Quando alguém recebe a indicação da ${c.empresa}, o que essa pessoa encontra quando pesquisa o nome de vocês no Google?

[Se a resposta for "pouca coisa"] É aí que o site ajuda: ele confirma a indicação e facilita o contato. Mas a decisão é sua, e eu respeito.`,
  },
];
