/**
 * Types shared between Frontend and Backend
 */

export type UserRole = 'admin' | 'tesoureiro' | 'consulta';

export interface Usuario {
  id: string;
  nome: string;
  login: string;
  perfil: UserRole;
  senha?: string; // used only for secure verification on server
  email?: string; // linked email for access and password recovery
  igrejaId?: string; // church assignment for local treasurers
  autorizado?: boolean; // admin has released access for this user
  cpf?: string; // individual cpf of the user
  telefone?: string; // contact phone of the user
  autorizacaoConsultas?: { [churchId: string]: boolean }; // authorized read-only churches for consultants
  assinaturaImg?: string; // Base64 stored jpg/png individual signature
  recoveryCode?: string; // code to recover password
  recoveryExpires?: number; // temporal expiration for verification code
}

export interface Igreja {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  pastor: string;
  pastorCpf?: string;
  membrosAtivos: number;
  tesoureiroNome?: string;
  tesoureiroCpf?: string;
  tesoureiroTelefone?: string;
  tesoureiroEmail?: string;
  tesoureiroAssinaturaImg?: string; // Base64 stored jpeg/png signature
  segundoTesoureiroNome?: string;
  segundoTesoureiroTelefone?: string;
  segundoTesoureiroEmail?: string;
}

export interface Dizimista {
  id: string;
  numero: number;
  nome: string;
  ativo: boolean;
  // Index 0 to 11 for Janeiro to Dezembro
  contribuicoes: number[];
}

export type TipoMovimentacao = 'entrada' | 'saida';

export interface Movimentacao {
  id: string;
  mes: number; // 0 = Janeiro, 11 = Dezembro
  tipo: TipoMovimentacao;
  categoria: string; // e.g., "Ofertas", "Sustento Pastoral", "Funcionários", etc.
  descricao: string;
  valor: number;
  data: string; // YYYY-MM-DD
  ministerio?: string; // empty/unset means General Church
}

export interface Configuracoes {
  igrejaId: string;
  saldoInicialBancoJan: number;
  saldoInicialInvestJan: number;
  fundoPresbiterialPercent: number; // e.g. 10%
  metaMembrosDizimistas: number; // target percentage
  saldosIniciaisMinisterios?: { [sigla: string]: number };
  ministerios?: MinisterioItem[];
  showDigitalSignatures?: boolean;
  signedByTreasurer?: boolean;
  signatureDate?: string;
  signatureTime?: string;
}

export interface CompromissoFinanceiro {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  parcelaAtual?: number;  // e.g. 2 for "Parcela 2 de 5"
  totalParcelas?: number; // e.g. 5
  categoria: string;      // e.g. "Despesas Operacionais", "Conservação e Patrimônio", etc.
  pago: boolean;
}

export interface IgrejaLocal {
  id: string;
  igreja: Igreja;
  dizimistas: Dizimista[];
  movimentacoes: Movimentacao[];
  configuracoes: Configuracoes;
  compromissos?: CompromissoFinanceiro[];
}

// Full Database State
export interface DbState {
  igreja: Igreja;
  usuarios: Usuario[];
  dizimistas: Dizimista[];
  movimentacoes: Movimentacao[];
  configuracoes: Configuracoes;
  compromissos?: CompromissoFinanceiro[];
  igrejasLocais?: IgrejaLocal[];
}

// Category Constants
export const CATEGORIAS_ENTRADA = [
  'Dízimos', // Auto-calculated from Dizimistas contributions + optional anonymous
  'Ofertas Regulares',
  'Ministérios Internos',
  'Resgate de Investimentos',
  'Empréstimos Recebidos',
  'Outras Entradas',
] as const;

export const CATEGORIAS_SAIDA = [
  'Sustento Pastoral',
  'Funcionários e Encargos',
  'Ministérios e Atividades',
  'Despesas Operacionais',
  'Conservação e Patrimônio',
  'Contribuições Estatutárias',
  'Aplicações Financeiras',
  'Amortização de Empréstimos',
  'Cartão de Crédito',
  'Outras Saídas',
] as const;

export const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
] as const;

export interface MinisterioItem {
  id: string;
  sigla: string;
  nome: string;
}

export const LISTA_MINISTERIOS: MinisterioItem[] = [
  { id: 'saf', sigla: 'SAF', nome: 'Ministério de Mulheres - Plenas' },
  { id: 'uph', sigla: 'UPH', nome: 'Ministério de Homens - Valentes' },
  { id: 'ump', sigla: 'UMP', nome: 'Juventude Aliança' },
  { id: 'upa', sigla: 'UPA', nome: 'Adolescentes Aliança' },
  { id: 'ucp', sigla: 'UCP', nome: 'Ministério Infantil - Impulsão' },
  { id: 'musica', sigla: 'Música', nome: 'Ministério de Louvor & Música' },
  { id: 'ebd', sigla: 'EBD', nome: 'Escola Bíblica Dominical (EBD)' }
];
