import type {
  Canal,
  CategoriaId,
  Estilo,
  SegmentoId,
  ServicoId,
  StatusLead,
  TipoContato,
} from "./types";

export const CATEGORIAS: { id: CategoriaId; nome: string; canal: Canal; descricao: string }[] = [
  { id: "primeira-ligacao", nome: "Primeira ligação", canal: "ligacao", descricao: "Primeiro contato por telefone, do cumprimento ao pedido de permissão." },
  { id: "segunda-ligacao", nome: "Segunda ligação", canal: "ligacao", descricao: "Retomar uma conversa que já começou." },
  { id: "whatsapp", nome: "Abordagem por WhatsApp", canal: "whatsapp", descricao: "Mensagem curta, pessoal e com convite para conversar." },
  { id: "instagram", nome: "Instagram Direct", canal: "instagram", descricao: "Primeira mensagem no Direct sem cara de spam." },
  { id: "site-demonstrativo", nome: "Apresentar site demonstrativo", canal: "whatsapp", descricao: "Enviar e explicar um modelo feito para o lead." },
  { id: "proposta", nome: "Apresentação de proposta", canal: "presencial", descricao: "Explicar o que está incluso e por que vale a pena." },
  { id: "follow-up", nome: "Follow-up", canal: "whatsapp", descricao: "Retomar o contato sem cobrar a pessoa." },
  { id: "objecoes", nome: "Quebra de objeções", canal: "ligacao", descricao: "Respostas para as objeções mais comuns." },
  { id: "negociacao", nome: "Negociação de preço", canal: "ligacao", descricao: "Ajustar escopo e forma de pagamento sem desvalorizar o trabalho." },
  { id: "fechamento", nome: "Fechamento de venda", canal: "ligacao", descricao: "Conduzir para o orçamento e a contratação." },
  { id: "recuperacao", nome: "Recuperação de clientes", canal: "whatsapp", descricao: "Reabrir conversa com quem esfriou ou disse não." },
  { id: "pos-venda", nome: "Pós-venda", canal: "whatsapp", descricao: "Entrega, acompanhamento, indicação e novos serviços." },
];

export const CANAIS: { id: Canal; nome: string }[] = [
  { id: "ligacao", nome: "Ligação" },
  { id: "whatsapp", nome: "WhatsApp" },
  { id: "instagram", nome: "Instagram Direct" },
  { id: "email", nome: "E-mail" },
  { id: "presencial", nome: "Reunião / presencial" },
];

export const SERVICOS: { id: ServicoId; nome: string; artigo: string; resumo: string }[] = [
  { id: "site", nome: "site profissional", artigo: "um", resumo: "site institucional com serviços, fotos, localização e botão de WhatsApp" },
  { id: "landing-page", nome: "landing page", artigo: "uma", resumo: "página única focada em um serviço, feita para receber pedidos de orçamento" },
  { id: "loja-virtual", nome: "loja virtual", artigo: "uma", resumo: "catálogo com carrinho, pagamento online e controle de pedidos" },
  { id: "sistema", nome: "sistema de agendamento", artigo: "um", resumo: "agenda online em que o cliente escolhe serviço, dia e horário" },
  { id: "trafego-pago", nome: "gestão de tráfego pago", artigo: "uma", resumo: "anúncios no Google e no Instagram para quem está procurando o serviço na região" },
];

export const ESTILOS: { id: Estilo; nome: string; descricao: string }[] = [
  { id: "consultivo", nome: "Consultivo", descricao: "Mais perguntas, escuta e diagnóstico." },
  { id: "direto", nome: "Direto", descricao: "Vai ao ponto rápido, frases curtas." },
  { id: "descontraido", nome: "Descontraído", descricao: "Leve, próximo, sem perder o respeito." },
  { id: "formal", nome: "Formal", descricao: "Tratamento mais cerimonioso (advocacia, clínicas)." },
];

export const STATUS: { id: StatusLead; nome: string }[] = [
  { id: "novo", nome: "Novo" },
  { id: "contatado", nome: "Contatado" },
  { id: "interessado", nome: "Interessado" },
  { id: "proposta", nome: "Proposta enviada" },
  { id: "fechado", nome: "Fechado" },
  { id: "perdido", nome: "Perdido" },
];

export const TIPOS_CONTATO: { id: TipoContato; nome: string }[] = [
  { id: "ligacao", nome: "Ligação" },
  { id: "whatsapp", nome: "WhatsApp" },
  { id: "instagram", nome: "Instagram" },
  { id: "email", nome: "E-mail" },
  { id: "reuniao", nome: "Reunião" },
  { id: "anotacao", nome: "Anotação" },
];

export interface Segmento {
  id: SegmentoId;
  nome: string; // singular, ex.: "clínica odontológica"
  plural: string; // ex.: "clínicas odontológicas"
  cliente: string; // como chamar o cliente final
  clientes: string;
  comoBuscam: string;
  dores: string[];
  argumentos: string[];
  gancho: string; // pergunta para despertar interesse. {cidade} é substituído
  oQueMostrar: string; // o que o site deve mostrar
  cuidado?: string; // regra ética ou ponto de atenção
}

export const SEGMENTOS: Segmento[] = [
  {
    id: "odontologia",
    nome: "clínica odontológica",
    plural: "clínicas odontológicas",
    cliente: "paciente",
    clientes: "pacientes",
    comoBuscam: "pesquisam o tratamento no Google, olham as avaliações e só então chamam no WhatsApp",
    dores: [
      "a recepção responde as mesmas perguntas sobre tratamentos e convênios várias vezes por dia",
      "quem pesquisa um tratamento específico, como implante ou alinhador, encontra primeiro a clínica que explica esse tratamento",
      "boa parte dos pacientes novos ainda depende de indicação",
    ],
    argumentos: [
      "uma página para cada tratamento ajuda quem pesquisa exatamente aquele tratamento a encontrar a clínica",
      "mostrar a equipe, a estrutura e o endereço passa segurança antes da primeira consulta",
      "o botão de WhatsApp já leva o paciente com a mensagem pronta, então a recepção sabe o que ele procura",
    ],
    gancho: "Hoje, quando alguém de {cidade} procura um dentista no Google, vocês sabem de onde vêm esses pacientes novos? Mais indicação ou mais internet?",
    oQueMostrar: "tratamentos, equipe com CRO, estrutura, convênios e localização",
    cuidado: "Siga as regras de publicidade do CFO: não prometa resultado de tratamento nem use preço como chamariz.",
  },
  {
    id: "clinica-medica",
    nome: "clínica médica",
    plural: "clínicas médicas",
    cliente: "paciente",
    clientes: "pacientes",
    comoBuscam: "procuram a especialidade e o convênio no Google antes de ligar",
    dores: [
      "o telefone e o WhatsApp ficam ocupados com perguntas sobre convênios, especialidades e horários",
      "o paciente que não encontra a especialidade explicada procura outra clínica",
      "marcar consulta depende de alguém disponível para atender",
    ],
    argumentos: [
      "deixar especialidades, médicos e convênios aceitos visíveis reduz as perguntas repetidas",
      "um agendamento online tira parte da carga da recepção",
      "um site com CRM dos médicos, endereço e fotos da estrutura transmite seriedade",
    ],
    gancho: "Os pacientes costumam perguntar muito pelo WhatsApp quais convênios e especialidades vocês atendem?",
    oQueMostrar: "especialidades, corpo clínico com CRM, convênios, horários e localização",
    cuidado: "Siga as regras de publicidade médica do CFM: nada de promessa de cura ou garantia de resultado.",
  },
  {
    id: "petshop",
    nome: "pet shop",
    plural: "pet shops",
    cliente: "tutor",
    clientes: "tutores",
    comoBuscam: "procuram banho e tosa ou veterinário perto de casa e decidem pelas fotos e avaliações",
    dores: [
      "a agenda de banho e tosa é marcada toda pelo WhatsApp, uma mensagem de cada vez",
      "o tutor novo não sabe quais serviços e produtos vocês têm até perguntar",
      "o movimento oscila durante a semana e sobra horário em alguns dias",
    ],
    argumentos: [
      "uma agenda online deixa o tutor escolher o horário de banho e tosa sozinho",
      "mostrar serviços, raças atendidas e fotos dos pets gera confiança em quem nunca foi aí",
      "quem procura pet shop no bairro encontra vocês no Google com o endereço e o WhatsApp à mão",
    ],
    gancho: "Como os tutores marcam o banho e tosa hoje? É tudo pelo WhatsApp?",
    oQueMostrar: "banho e tosa, veterinário, produtos, fotos dos pets atendidos e localização",
  },
  {
    id: "oficina",
    nome: "oficina mecânica",
    plural: "oficinas mecânicas",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "pesquisam 'oficina perto de mim' quando o carro dá problema e escolhem a que passa mais confiança",
    dores: [
      "o cliente novo tem receio de ser enganado e escolhe a oficina que parece mais organizada",
      "muita gente liga só para saber se vocês atendem determinada marca ou serviço",
      "o cliente que já foi atendido esquece de voltar para a revisão",
    ],
    argumentos: [
      "mostrar a oficina, a equipe e os serviços por escrito diminui a desconfiança de quem nunca foi aí",
      "listar marcas atendidas e serviços evita ligações que não viram serviço",
      "um botão para pedir orçamento pelo WhatsApp com foto do problema agiliza o atendimento",
    ],
    gancho: "Quando o carro de alguém quebra aqui em {cidade}, a pessoa costuma encontrar vocês pela internet ou chega mais por indicação?",
    oQueMostrar: "serviços, marcas atendidas, fotos da oficina, garantia do serviço e localização",
  },
  {
    id: "estetica-automotiva",
    nome: "estética automotiva",
    plural: "estéticas automotivas",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "decidem pelas fotos de antes e depois e pelo cuidado que o lugar transmite",
    dores: [
      "o portfólio fica espalhado no Instagram e o cliente não acha o serviço que procura",
      "chegam muitos pedidos de preço sem informação do carro ou do serviço",
      "serviços de valor mais alto, como vitrificação e PPF, pedem mais confiança antes do fechamento",
    ],
    argumentos: [
      "um site organiza os serviços com fotos e explicação de cada um, do polimento à vitrificação",
      "um formulário de orçamento já pergunta o modelo do carro e o serviço, então o pedido chega completo",
      "quem vai gastar mais no carro procura um lugar com cara de profissional antes de fechar",
    ],
    gancho: "Vocês recebem muito pedido de orçamento pelo Instagram? E quanto disso vira serviço?",
    oQueMostrar: "serviços com fotos reais, processo de trabalho, estrutura e pedido de orçamento",
  },
  {
    id: "advocacia",
    nome: "escritório de advocacia",
    plural: "escritórios de advocacia",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "pesquisam o problema jurídico e verificam o escritório no Google antes de entrar em contato",
    dores: [
      "a maior parte dos clientes chega por indicação e é difícil prever o volume",
      "quem procura um advogado pela internet quer conferir quem é o profissional antes de ligar",
      "as áreas de atuação não ficam claras para quem não conhece o escritório",
    ],
    argumentos: [
      "um site informativo apresenta as áreas de atuação e a trajetória dos advogados de forma sóbria",
      "conteúdo que explica dúvidas comuns ajuda o escritório a ser encontrado por quem pesquisa o assunto",
      "o cliente que recebe uma indicação quase sempre pesquisa o nome do escritório antes de ligar",
    ],
    gancho: "Hoje a maior parte dos clientes chega por indicação? Quando alguém indica vocês, essa pessoa encontra o escritório no Google?",
    oQueMostrar: "áreas de atuação, sobre os advogados com OAB, conteúdo informativo e contato",
    cuidado: "Respeite o Provimento 205/2021 da OAB: conteúdo informativo, sem captação de clientela, sem promessa de resultado e sem citar valores.",
  },
  {
    id: "restaurante",
    nome: "restaurante",
    plural: "restaurantes",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "olham o cardápio, as fotos e o horário de funcionamento antes de decidir onde comer ou pedir",
    dores: [
      "parte do lucro do delivery fica com a taxa dos aplicativos",
      "o cliente pergunta o cardápio e o horário pelo WhatsApp várias vezes ao dia",
      "quem procura onde comer no bairro não encontra o cardápio atualizado",
    ],
    argumentos: [
      "um cardápio online com pedido pelo WhatsApp é um canal de delivery próprio, sem comissão por pedido",
      "cardápio, fotos, horário e endereço num lugar só respondem as perguntas antes delas chegarem",
      "quem pesquisa restaurante na região encontra vocês com o cardápio à vista",
    ],
    gancho: "O delivery de vocês hoje passa mais pelos aplicativos ou pelo WhatsApp direto?",
    oQueMostrar: "cardápio com fotos, horários, delivery, reservas e localização",
  },
  {
    id: "salao",
    nome: "salão de beleza",
    plural: "salões de beleza",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "escolhem pelo portfólio e pela facilidade de marcar horário",
    dores: [
      "a agenda é marcada toda por mensagem, muitas vezes fora do horário de trabalho",
      "faltas e horários vagos que ninguém preenche",
      "a cliente nova não sabe quais serviços e profissionais vocês têm",
    ],
    argumentos: [
      "um agendamento online deixa a cliente marcar a qualquer hora, inclusive à noite",
      "lembrete automático ajuda a reduzir faltas",
      "uma página com serviços, profissionais e fotos dos trabalhos ajuda a cliente nova a decidir",
    ],
    gancho: "Como vocês organizam a agenda hoje? Muita marcação chega fora do horário?",
    oQueMostrar: "serviços, profissionais, fotos dos trabalhos, agendamento e localização",
  },
  {
    id: "academia",
    nome: "academia",
    plural: "academias",
    cliente: "aluno",
    clientes: "alunos",
    comoBuscam: "comparam modalidades, horários e planos de academias próximas antes de visitar",
    dores: [
      "o interessado pergunta planos e horários e some depois da resposta",
      "as modalidades e os horários das aulas não ficam claros para quem ainda não é aluno",
      "a procura concentra em algumas épocas do ano e cai em outras",
    ],
    argumentos: [
      "uma página com modalidades, horários e estrutura responde o que o interessado quer saber",
      "um botão para agendar aula experimental transforma curiosidade em visita",
      "anúncios para quem mora perto ajudam a manter a procura fora da época de pico",
    ],
    gancho: "Quem pergunta preço pelo WhatsApp costuma vir conhecer a academia, ou muita gente some depois da resposta?",
    oQueMostrar: "modalidades, grade de horários, estrutura, equipe e aula experimental",
  },
  {
    id: "transportadora",
    nome: "transportadora",
    plural: "transportadoras",
    cliente: "cliente",
    clientes: "empresas clientes",
    comoBuscam: "pesquisam a transportadora e conferem estrutura, rotas e CNPJ antes de pedir cotação",
    dores: [
      "a empresa que vai contratar frete quer ver estrutura, frota e rotas antes de confiar a carga",
      "os pedidos de cotação chegam incompletos e exigem várias trocas de mensagem",
      "a carteira depende de poucos clientes grandes",
    ],
    argumentos: [
      "um site com frota, rotas atendidas e tipos de carga passa credibilidade para o comprador de outra empresa",
      "um formulário de cotação com origem, destino, peso e volume faz o pedido chegar completo",
      "aparecer quando alguém pesquisa transporte para a rota que vocês fazem abre portas para clientes novos",
    ],
    gancho: "Quando uma empresa nova precisa cotar frete com vocês, como ela costuma chegar até aqui?",
    oQueMostrar: "rotas e regiões atendidas, frota, tipos de carga, segurança e cotação online",
  },
  {
    id: "imobiliaria",
    nome: "imobiliária",
    plural: "imobiliárias",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "filtram imóveis por bairro, preço e tamanho e entram em contato pelo anúncio",
    dores: [
      "os imóveis ficam só nos portais, onde aparecem ao lado da concorrência",
      "captar novos imóveis de proprietários depende de indicação",
      "os contatos chegam sem saber qual imóvel a pessoa viu",
    ],
    argumentos: [
      "um site próprio com busca por bairro, valor e tipo mostra a carteira sem concorrente do lado",
      "uma página para proprietários anunciarem ajuda na captação",
      "cada imóvel com botão de WhatsApp já informa o código do imóvel no contato",
    ],
    gancho: "Hoje os contatos de vocês chegam mais pelos portais ou por canal próprio?",
    oQueMostrar: "busca de imóveis com filtros, página de cada imóvel, captação de proprietários e contato",
  },
  {
    id: "loja-local",
    nome: "loja",
    plural: "lojas",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "pesquisam se a loja tem o produto antes de sair de casa",
    dores: [
      "o cliente pergunta se tem o produto, o preço e o tamanho pelo WhatsApp, um por um",
      "a venda fica limitada a quem passa na frente da loja",
      "o catálogo só existe no Instagram, misturado com outras postagens",
    ],
    argumentos: [
      "um catálogo online mostra produtos e preços e deixa o cliente pedir pelo WhatsApp",
      "uma loja virtual vende também para quem não passa na frente da loja",
      "a opção de retirar na loja traz o cliente até vocês",
    ],
    gancho: "Muita gente pergunta pelo WhatsApp se vocês têm o produto antes de ir até a loja?",
    oQueMostrar: "catálogo de produtos, formas de pagamento, entrega ou retirada e localização",
  },
];

export const segmentoPorId = (id: SegmentoId) => SEGMENTOS.find((s) => s.id === id)!;
export const servicoPorId = (id: ServicoId) => SERVICOS.find((s) => s.id === id)!;
export const categoriaPorId = (id: CategoriaId) => CATEGORIAS.find((c) => c.id === id)!;
export const canalNome = (id: Canal) => CANAIS.find((c) => c.id === id)?.nome ?? id;
