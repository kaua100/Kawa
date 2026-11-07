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
  { id: "reuniao", nome: "Reunião marcada" },
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
  {
    id: "barbearia",
    nome: "barbearia",
    plural: "barbearias",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "procuram barbearia perto de casa, olham as fotos dos cortes e querem marcar horário sem precisar ligar",
    dores: [
      "a agenda é toda marcada por mensagem, muitas vezes no meio de um corte",
      "cliente que não consegue resposta rápida marca em outra barbearia",
      "horários vagos no meio da semana que ninguém preenche",
    ],
    argumentos: [
      "uma agenda online deixa o cliente escolher barbeiro, serviço e horário sozinho, a qualquer hora",
      "lembrete automático ajuda a reduzir quem marca e não aparece",
      "uma página com cortes, preços e localização faz o cliente novo decidir sem perguntar",
    ],
    gancho: "Hoje os clientes marcam horário com vocês como? É tudo pelo WhatsApp?",
    oQueMostrar: "serviços e preços, barbeiros, fotos dos cortes, agendamento e localização",
  },
  {
    id: "clinica-estetica",
    nome: "clínica de estética",
    plural: "clínicas de estética",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "pesquisam o procedimento no Google e no Instagram e escolhem a clínica que passa mais confiança",
    dores: [
      "a cliente pergunta valor de cada procedimento pelo Direct e some depois da resposta",
      "procedimentos de valor mais alto pedem mais confiança antes de agendar a avaliação",
      "os procedimentos ficam espalhados nos posts e a cliente não acha o que procura",
    ],
    argumentos: [
      "uma página para cada procedimento ajuda quem pesquisa aquele procedimento a encontrar a clínica",
      "mostrar a profissional, a formação e a estrutura passa segurança para quem ainda não conhece",
      "um botão para agendar avaliação pelo WhatsApp transforma a dúvida em horário marcado",
    ],
    gancho: "As clientes novas chegam mais pelo Instagram ou por indicação? E quanto das perguntas de preço vira avaliação?",
    oQueMostrar: "procedimentos, sobre a profissional, estrutura, avaliação pelo WhatsApp e localização",
    cuidado: "Não prometa resultado de procedimento. Se a responsável for da área da saúde, siga as regras de publicidade do conselho dela.",
  },
  {
    id: "psicologia",
    nome: "consultório de psicologia",
    plural: "psicólogos",
    cliente: "paciente",
    clientes: "pacientes",
    comoBuscam: "pesquisam psicólogo pela abordagem, pela especialidade ou por atendimento online e conferem quem é o profissional antes de chamar",
    dores: [
      "quem procura terapia tem receio de mandar mensagem sem saber nada do profissional",
      "boa parte dos pacientes depende de indicação",
      "as perguntas sobre valor, abordagem e atendimento online se repetem toda semana",
    ],
    argumentos: [
      "um site com abordagem, formação e CRP ajuda a pessoa a se sentir segura para dar o primeiro passo",
      "explicar como funciona a primeira sessão e o atendimento online responde as dúvidas antes da mensagem",
      "quem pesquisa terapia online encontra o consultório mesmo fora da cidade",
    ],
    gancho: "Os pacientes novos chegam mais por indicação ou pela internet? Vocês atendem online também?",
    oQueMostrar: "abordagem, formação e CRP, como funciona a primeira sessão, atendimento online e contato",
    cuidado: "Siga o Código de Ética do CFP: sem depoimentos de pacientes, sem promessa de resultado e sem preço como chamariz.",
  },
  {
    id: "nutricionista",
    nome: "consultório de nutrição",
    plural: "nutricionistas",
    cliente: "paciente",
    clientes: "pacientes",
    comoBuscam: "procuram nutricionista pelo objetivo (emagrecimento, esporte, gestação) e conferem a formação antes de marcar",
    dores: [
      "o paciente pergunta valor e como é a consulta pelo Instagram, um por um",
      "a agenda depende de quem já segue o perfil",
      "o atendimento online atenderia gente de outras cidades, mas pouca gente sabe que existe",
    ],
    argumentos: [
      "um site com especialidades, formação e CRN mostra para quem a consulta é indicada",
      "explicar como funciona a consulta e o acompanhamento responde as dúvidas antes da mensagem",
      "agendamento online deixa o paciente marcar sem esperar resposta",
    ],
    gancho: "Hoje os pacientes chegam mais pelo Instagram ou por indicação? Vocês atendem online?",
    oQueMostrar: "especialidades, formação e CRN, como funciona a consulta, atendimento online e agendamento",
    cuidado: "Siga as regras do CFN: sem fotos de antes e depois de pacientes e sem promessa de resultado.",
  },
  {
    id: "fisioterapia",
    nome: "clínica de fisioterapia",
    plural: "clínicas de fisioterapia",
    cliente: "paciente",
    clientes: "pacientes",
    comoBuscam: "pesquisam pelo problema que sentem ou pela especialidade, como pilates ou RPG, e pelo convênio",
    dores: [
      "o paciente liga para saber se a clínica atende o convênio dele ou a lesão que ele tem",
      "boa parte dos pacientes chega por encaminhamento e é difícil prever o volume",
      "as modalidades, como pilates e RPG, não ficam claras para quem ainda não conhece",
    ],
    argumentos: [
      "uma página para cada especialidade ajuda quem pesquisa o tratamento a encontrar a clínica",
      "mostrar convênios, equipe com CREFITO e estrutura reduz as ligações de dúvida",
      "um botão para agendar avaliação deixa o caminho do paciente mais curto",
    ],
    gancho: "Os pacientes chegam mais por encaminhamento médico ou procuram vocês direto?",
    oQueMostrar: "especialidades, equipe com CREFITO, convênios, estrutura e agendamento",
    cuidado: "Siga as regras do COFFITO para publicidade: sem promessa de cura ou resultado.",
  },
  {
    id: "contabilidade",
    nome: "escritório de contabilidade",
    plural: "escritórios de contabilidade",
    cliente: "cliente",
    clientes: "empresas clientes",
    comoBuscam: "pesquisam contador para abrir empresa, trocar de contador ou regularizar o MEI e comparam alguns escritórios",
    dores: [
      "quem vai abrir empresa ou trocar de contador pesquisa vários escritórios antes de pedir orçamento",
      "os pedidos de orçamento chegam sem saber o tipo de empresa nem o faturamento",
      "a carteira cresce quase só por indicação",
    ],
    argumentos: [
      "um site com os serviços separados (abertura de empresa, MEI, troca de contador) fala direto com cada tipo de cliente",
      "um formulário de orçamento já pergunta o tipo de empresa, então o pedido chega completo",
      "quem pesquisa contador na cidade encontra o escritório com cara de profissional",
    ],
    gancho: "Hoje os clientes novos chegam mais por indicação ou procurando contador na internet?",
    oQueMostrar: "serviços por tipo de empresa, equipe com CRC, orçamento online e contato",
  },
  {
    id: "construcao",
    nome: "construtora",
    plural: "construtoras e empresas de reforma",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "pesquisam empresas de reforma ou construção e decidem pelo portfólio de obras e pela confiança que a empresa passa",
    dores: [
      "quem vai reformar tem medo de contratar e quer ver obras prontas antes de pedir orçamento",
      "o portfólio fica só no Instagram ou no celular",
      "os pedidos de orçamento chegam sem medida, tipo de obra ou bairro",
    ],
    argumentos: [
      "um portfólio de obras com fotos de antes e depois mostra o padrão do trabalho",
      "um formulário de orçamento pergunta tipo de obra, metragem e bairro, então o pedido chega completo",
      "serviço de valor alto pede uma empresa que pareça sólida também na internet",
    ],
    gancho: "Quando alguém pede orçamento, vocês costumam mandar fotos de obras pelo WhatsApp?",
    oQueMostrar: "portfólio de obras, serviços, processo de trabalho, orçamento e área de atendimento",
  },
  {
    id: "buffet",
    nome: "buffet",
    plural: "buffets e espaços de festa",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "comparam fotos do espaço, pacotes e datas livres de vários buffets antes de visitar",
    dores: [
      "cada pedido de orçamento vira uma conversa longa sobre pacote, cardápio e capacidade",
      "o cliente quer ver o espaço antes de visitar e as fotos ficam espalhadas",
      "datas fora de temporada ficam vazias",
    ],
    argumentos: [
      "um site com fotos do espaço, capacidade e o que vem em cada pacote responde o principal antes da mensagem",
      "um formulário com data, número de convidados e tipo de festa faz o orçamento chegar pronto",
      "anúncios na região ajudam a preencher datas fora de temporada",
    ],
    gancho: "O pessoal costuma pedir orçamento pelo WhatsApp? Quanto tempo leva até a visita?",
    oQueMostrar: "fotos do espaço, pacotes, cardápio, capacidade, pedido de orçamento e localização",
  },
  {
    id: "energia-solar",
    nome: "empresa de energia solar",
    plural: "empresas de energia solar",
    cliente: "cliente",
    clientes: "clientes",
    comoBuscam: "pesquisam quanto custa e quanto economizam, comparam empresas e querem ver instalações feitas",
    dores: [
      "o cliente pede orçamento sem mandar a conta de luz e a conversa demora",
      "a decisão é cara e o cliente compara várias empresas antes de fechar",
      "as instalações feitas ficam só nas fotos do celular",
    ],
    argumentos: [
      "um formulário que pede o valor da conta de luz e a cidade faz o orçamento chegar completo",
      "mostrar instalações feitas na região e a garantia dos equipamentos passa confiança",
      "uma página explicando como funciona a instalação responde as dúvidas mais comuns",
    ],
    gancho: "Quando alguém pede orçamento, já manda a conta de luz ou vocês precisam pedir?",
    oQueMostrar: "como funciona, instalações feitas, garantia, simulação de orçamento e área de atendimento",
    cuidado: "Não prometa porcentagem de economia sem a simulação de cada cliente.",
  },
  {
    id: "pousada",
    nome: "pousada",
    plural: "pousadas e hotéis",
    cliente: "hóspede",
    clientes: "hóspedes",
    comoBuscam: "comparam fotos, localização e preço nos sites de reserva antes de escolher",
    dores: [
      "parte do valor de cada reserva fica com a comissão das plataformas",
      "o hóspede pergunta disponibilidade e valor pelo WhatsApp, uma data por vez",
      "quem já se hospedou não tem um canal direto para voltar",
    ],
    argumentos: [
      "um site próprio com fotos, quartos e pedido de reserva pelo WhatsApp é um canal sem comissão",
      "mostrar quartos, café da manhã e o que tem perto responde o hóspede antes da mensagem",
      "o hóspede que volta pode reservar direto com vocês",
    ],
    gancho: "Hoje as reservas vêm mais das plataformas ou direto pelo WhatsApp?",
    oQueMostrar: "quartos, fotos, café da manhã, localização e pedido de reserva",
  },
];

/** Termo usado na busca do Google Maps para cada nicho. */
export const TERMO_MAPS: Record<SegmentoId, string> = {
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
  barbearia: "barbearia",
  "clinica-estetica": "clínica de estética",
  psicologia: "psicólogo",
  nutricionista: "nutricionista",
  fisioterapia: "fisioterapia",
  contabilidade: "contabilidade",
  construcao: "construtora reformas",
  buffet: "buffet de festas",
  "energia-solar": "energia solar",
  pousada: "pousada",
};

/**
 * Potencial de venda de cada nicho para quem vende site: ticket do serviço do cliente,
 * quanto ele depende de ser encontrado e quanto costuma investir em divulgação.
 * Vai de 1 (menor) a 3 (maior).
 */
export const POTENCIAL: Record<SegmentoId, 1 | 2 | 3> = {
  odontologia: 3,
  "clinica-estetica": 3,
  advocacia: 3,
  "energia-solar": 3,
  construcao: 3,
  imobiliaria: 3,
  "clinica-medica": 3,
  "estetica-automotiva": 3,
  psicologia: 2,
  nutricionista: 2,
  fisioterapia: 2,
  barbearia: 2,
  salao: 2,
  buffet: 2,
  pousada: 2,
  contabilidade: 2,
  academia: 2,
  oficina: 2,
  petshop: 2,
  transportadora: 2,
  restaurante: 1,
  "loja-local": 1,
};

/** Nichos em ordem de potencial, para os atalhos da busca. */
export const NICHOS_EM_ALTA = SEGMENTOS.slice().sort((a, b) => POTENCIAL[b.id] - POTENCIAL[a.id]);

export const segmentoPorId = (id: SegmentoId) => SEGMENTOS.find((s) => s.id === id)!;
export const servicoPorId = (id: ServicoId) => SERVICOS.find((s) => s.id === id)!;
export const categoriaPorId = (id: CategoriaId) => CATEGORIAS.find((c) => c.id === id)!;
export const canalNome = (id: Canal) => CANAIS.find((c) => c.id === id)?.nome ?? id;

/**
 * Descobre o nicho pela categoria do Google Maps ou pelo nome da empresa.
 * Evita mensagem falando de dentista para uma barbearia quando a busca foi feita com outro nicho selecionado.
 */
const PISTAS: [SegmentoId, RegExp][] = [
  ["barbearia", /barbear|barber/i],
  ["clinica-estetica", /est[eé]tica (facial|corporal)|cl[ií]nica de est[eé]tica|esteticista|depila|harmoniza|spa\b|sobrancelha|c[ií]lios|micropigment/i],
  ["estetica-automotiva", /est[eé]tica automotiva|detail|lava.?r[aá]pido|lava.?jato|polimento|envelopament|insulfilm|car ?wash/i],
  ["odontologia", /dent|odonto|ortodon|implante dent/i],
  ["psicologia", /psic[oó]log|psicoterap|terapeuta/i],
  ["nutricionista", /nutri/i],
  ["fisioterapia", /fisio|pilates|rpg|quiropra|osteopat/i],
  ["clinica-medica", /m[eé]dic|cl[ií]nica (geral|popular)|pediatr|ginecolog|dermatolog|cardiolog|ortoped|oftalmo|laborat/i],
  ["petshop", /pet|veterin|banho e tosa|animal/i],
  ["advocacia", /advoc|advogad|jur[ií]dic/i],
  ["contabilidade", /cont[aá]bil|contador|contabilidade/i],
  ["imobiliaria", /imobili|corretor de im[oó]veis/i],
  ["energia-solar", /solar|fotovolt/i],
  ["construcao", /constru|reforma|empreiteir|engenharia|arquitet|marmoraria|serralheria|vidra[cç]aria/i],
  ["buffet", /buffet|bufê|sal[aã]o de festa|festa infantil|eventos/i],
  ["pousada", /pousada|hotel|hostel|chal[eé]/i],
  ["academia", /academia|crossfit|muscula|fitness|lutas|jiu|muay/i],
  ["transportadora", /transport|frete|mudan[cç]a|log[ií]stica/i],
  ["oficina", /mec[aâ]nic|oficina|auto ?center|funilaria|borracharia|auto el[eé]tric/i],
  ["salao", /sal[aã]o|cabeleire|beleza|manicure|unha|hair/i],
  ["restaurante", /restaurante|pizzar|lanchonete|hamburg|a[cç]a[ií]|padaria|confeitaria|sushi|churrasc|marmit|bar\b|cafeteria|doceria/i],
];

export function detectarSegmento(...textos: (string | undefined)[]): SegmentoId | null {
  const t = textos.filter(Boolean).join(" ");
  if (!t) return null;
  for (const [id, re] of PISTAS) if (re.test(t)) return id;
  return null;
}
