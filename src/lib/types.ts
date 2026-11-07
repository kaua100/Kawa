export type SegmentoId =
  | "odontologia"
  | "clinica-medica"
  | "petshop"
  | "oficina"
  | "estetica-automotiva"
  | "advocacia"
  | "restaurante"
  | "salao"
  | "academia"
  | "transportadora"
  | "imobiliaria"
  | "loja-local";

export type CategoriaId =
  | "primeira-ligacao"
  | "segunda-ligacao"
  | "whatsapp"
  | "instagram"
  | "site-demonstrativo"
  | "proposta"
  | "follow-up"
  | "objecoes"
  | "negociacao"
  | "fechamento"
  | "recuperacao"
  | "pos-venda";

export type Canal = "ligacao" | "whatsapp" | "instagram" | "email" | "presencial";

export type ServicoId =
  | "site"
  | "landing-page"
  | "loja-virtual"
  | "sistema"
  | "trafego-pago";

export type Estilo = "consultivo" | "direto" | "descontraido" | "formal";

export type StatusLead =
  | "novo"
  | "contatado"
  | "interessado"
  | "proposta"
  | "fechado"
  | "perdido";

export type TipoContato =
  | "ligacao"
  | "whatsapp"
  | "instagram"
  | "email"
  | "reuniao"
  | "anotacao";

export interface Contato {
  id: string;
  data: string; // ISO
  tipo: TipoContato;
  resumo: string;
}

export interface Lead {
  id: string;
  empresa: string;
  responsavel: string;
  segmento: SegmentoId;
  cidade: string;
  telefone: string;
  site: string; // vazio = não localizado
  siteStatus: "nao-encontrado" | "desatualizado" | "ok";
  instagram: string;
  seguidores: string;
  infoPublica: string; // o que o usuário viu publicamente (Google, avaliações etc.)
  linkDemo?: string; // link do site demonstrativo feito para o lead
  endereco?: string;
  origemLead?: "manual" | "apify";
  servicoInteresse: ServicoId;
  status: StatusLead;
  contatos: Contato[];
  criadoEm: string;
}

export interface Script {
  id: string;
  titulo: string;
  texto: string;
  categoria: CategoriaId;
  canal: Canal;
  segmento?: SegmentoId;
  servico?: ServicoId;
  leadId?: string;
  leadNome?: string;
  origem: "biblioteca" | "ia" | "editado";
  favorito: boolean;
  criadoEm: string;
  versaoDe?: string; // id do script que originou esta versão
  acao?: AcaoIA;
}

export type AcaoIA =
  | "gerar"
  | "nova-versao"
  | "adaptar-canal"
  | "mais-curta"
  | "mais-persuasiva";

export interface PedidoGeracao {
  acao: AcaoIA;
  lead?: Lead | null;
  segmento: SegmentoId;
  canal: Canal;
  servico: ServicoId;
  objetivo: CategoriaId;
  estilo: Estilo;
  observacoes?: string;
  textoBase?: string; // para versões, adaptações e reescritas
  canalDestino?: Canal;
  nomeVendedor?: string;
}
