import { canalNome, categoriaPorId, ESTILOS, segmentoPorId, servicoPorId, STATUS, TIPOS_CONTATO } from "./catalogo";
import type { Canal, PedidoGeracao } from "./types";

export const SYSTEM_PROMPT = `Você escreve roteiros comerciais para a Conecta Digital, empresa brasileira que vende sites, landing pages, lojas virtuais, sistemas de agendamento e gestão de tráfego pago para negócios locais.

Quem vai usar o texto é o vendedor da Conecta Digital, falando com o dono ou responsável de um negócio local.

REGRAS DE ESCRITA
- Português do Brasil, do jeito que um vendedor experiente e educado fala de verdade.
- Frases curtas e naturais. Tom humano, profissional e confiante.
- Nada de exagero, promessa de resultado, números inventados ("aumente 300% suas vendas"), urgência falsa ou pressão.
- Não use clichês de marketing: "alavancar", "potencializar", "transformar seu negócio", "no mundo de hoje", "próximo nível", "solução completa", "presença digital de impacto".
- Não use travessão (—). Não use emojis, exceto no máximo um em WhatsApp ou Instagram se combinar com o estilo descontraído.
- Não use pontos de exclamação em excesso (no máximo um no texto inteiro).
- Evite construções do tipo "não é X, é Y" e listas de negações.

REGRA MAIS IMPORTANTE: NÃO INVENTAR
- Use somente os dados do lead que foram informados. Nunca invente avaliações, número de seguidores, faturamento, problemas, nomes de funcionários ou fatos sobre a empresa.
- Quando o roteiro precisar de uma informação que você não tem, escreva um marcador entre colchetes para o vendedor completar, por exemplo: [algo que você viu no perfil], [valor], [prazo].
- Se o site não foi encontrado, você pode dizer "não encontrei um site de vocês". Não afirme que a empresa "perde clientes" como fato; fale como possibilidade ou como algo comum no segmento.

FORMATO POR CANAL
- Ligação: roteiro com etapas em MAIÚSCULAS (ex.: CUMPRIMENTO, APRESENTAÇÃO, MOTIVO DO CONTATO, PERGUNTA, PEDIDO DE PERMISSÃO, PRÓXIMO PASSO). Inclua entre parênteses orientações curtas para o vendedor, como pausas e o que fazer conforme a resposta.
- WhatsApp: mensagem curta (até 5 linhas), pessoal, termina com uma pergunta simples. Pode ser dividida em 2 balões, separados por uma linha em branco.
- Instagram Direct: curta, cita algo real do perfil (ou marcador para o vendedor preencher), sem link na primeira mensagem, sem parecer mensagem em massa.
- E-mail: comece com "Assunto: ..." e depois o corpo, curto.
- Reunião/presencial: roteiro em etapas, com perguntas de diagnóstico antes de apresentar a solução.

RESPEITE AS REGRAS DO SEGMENTO
- Advocacia: Provimento 205/2021 da OAB. Conteúdo informativo, sem captação de clientela, sem promessa de resultado.
- Clínicas odontológicas e médicas: regras de publicidade do CFO e do CFM. Sem promessa de resultado de tratamento.

SAÍDA
Responda somente com o roteiro, pronto para usar. Sem introdução, sem explicação no final, sem markdown com asteriscos ou cerquilhas.`;

function blocoLead(p: PedidoGeracao): string {
  const l = p.lead;
  if (!l) return "Nenhum lead selecionado. Use marcadores entre colchetes para nome da empresa, responsável e cidade.";
  const siteTxt =
    l.siteStatus === "nao-encontrado" || !l.site
      ? "Não localizado"
      : `${l.site} (${l.siteStatus === "desatualizado" ? "parece desatualizado" : "existe e está ok"})`;
  const historico = l.contatos.length
    ? l.contatos
        .slice()
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(-8)
        .map(
          (c) =>
            `- ${new Date(c.data).toLocaleDateString("pt-BR")} · ${TIPOS_CONTATO.find((t) => t.id === c.tipo)?.nome}: ${c.resumo}`,
        )
        .join("\n")
    : "Nenhum contato registrado ainda (este é o primeiro).";
  return `DADOS DO LEAD (use apenas estes fatos)
Empresa: ${l.empresa}
Responsável: ${l.responsavel || "não informado"}
Segmento: ${segmentoPorId(l.segmento).nome}
Cidade: ${l.cidade || "não informada"}
Site: ${siteTxt}
Instagram: ${l.instagram || "não encontrado"}${l.seguidores ? ` (${l.seguidores} seguidores)` : ""}
Informações públicas observadas pelo vendedor: ${l.infoPublica || "nenhuma"}
Status no funil: ${STATUS.find((s) => s.id === l.status)?.nome}

HISTÓRICO DE CONTATOS
${historico}`;
}

function blocoSegmento(p: PedidoGeracao): string {
  const s = segmentoPorId(p.segmento);
  return `CONTEXTO DO SEGMENTO (${s.nome})
Clientes finais: ${s.clientes}, que ${s.comoBuscam}.
Situações comuns no segmento (fale como possibilidade, não como fato sobre este lead):
${s.dores.map((d) => `- ${d}`).join("\n")}
Argumentos que costumam funcionar:
${s.argumentos.map((a) => `- ${a}`).join("\n")}
O que o site deve mostrar: ${s.oQueMostrar}.
Pergunta de abertura sugerida: ${s.gancho}${s.cuidado ? `\nCuidado: ${s.cuidado}` : ""}`;
}

export function montarMensagem(p: PedidoGeracao): string {
  const cat = categoriaPorId(p.objetivo);
  const sv = servicoPorId(p.servico);
  const estilo = ESTILOS.find((e) => e.id === p.estilo)!;
  const vendedor = p.nomeVendedor?.trim() ? p.nomeVendedor.trim() : "[seu nome]";

  const base = `${blocoLead(p)}

${blocoSegmento(p)}

SERVIÇO OFERECIDO: ${sv.nome} (${sv.resumo})
NOME DO VENDEDOR: ${vendedor}
ESTILO DE COMUNICAÇÃO: ${estilo.nome}. ${estilo.descricao}${p.observacoes ? `\nOBSERVAÇÕES DO VENDEDOR: ${p.observacoes}` : ""}`;

  switch (p.acao) {
    case "gerar":
      return `${base}

TAREFA
Escreva um roteiro de "${cat.nome}" para o canal ${canalNome(p.canal)}.
Objetivo desta etapa: ${cat.descricao}
${p.objetivo === "objecoes" ? "Inclua respostas curtas e respeitosas para as 5 objeções mais prováveis neste segmento, cada uma terminando com uma pergunta." : ""}
Se houver histórico de contatos, continue a conversa a partir dele e não se apresente como se fosse o primeiro contato.`;
    case "nova-versao":
      return `${base}

TEXTO ATUAL
${p.textoBase}

TAREFA
Escreva uma nova versão deste roteiro para o canal ${canalNome(p.canal)}, com outra abertura e outra forma de despertar interesse. Mantenha o mesmo objetivo e os mesmos fatos. Não repita frases do texto atual.`;
    case "adaptar-canal":
      return `${base}

TEXTO ATUAL (escrito para ${canalNome(p.canal)})
${p.textoBase}

TAREFA
Adapte este roteiro para o canal ${canalNome(p.canalDestino as Canal)}, seguindo o formato desse canal. Mantenha o objetivo e os fatos.`;
    case "mais-curta":
      return `${base}

TEXTO ATUAL
${p.textoBase}

TAREFA
Reescreva com cerca de metade do tamanho, mantendo o essencial: quem fala, motivo do contato e a pergunta final. Canal: ${canalNome(p.canal)}.`;
    case "mais-persuasiva":
      return `${base}

TEXTO ATUAL
${p.textoBase}

TAREFA
Reescreva de forma mais persuasiva para o canal ${canalNome(p.canal)}: deixe o benefício para o negócio mais concreto, use a situação do segmento e termine com um próximo passo mais claro. Continue respeitoso, sem pressão, sem urgência falsa e sem inventar dados.`;
  }
}
