import { DbState, Dizimista, Movimentacao, Usuario } from "./types";

const API_BASE = "/api";

let activeChurchId = "ipb-alianca";

// Help function to merge custom headers (like the active church context)
function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-church-id": activeChurchId,
    ...extraHeaders
  };
}

export interface CompiledMonth {
  mesIndex: number;
  nome: string;
  saldoAnteriorBanco: number;
  saldoAnteriorInvest: number;
  saldoAnteriorTotal: number;
  entradasMap: { [key: string]: number };
  entradasTotal: number;
  saidasMap: { [key: string]: number };
  saidasTotal: number;
  saldoFinalBanco: number;
  saldoFinalInvest: number;
  saldoFinalTotal: number;
  resultadoMensal: number;
}

export interface WorkbookPayload {
  meses: CompiledMonth[];
  geral: {
    totalAnualEntradas: number;
    totalAnualSaidas: number;
    resultadoAnual: number;
    entradasTotaisPorCategoria: { [key: string]: number };
    saidasTotaisPorCategoria: { [key: string]: number };
  };
  dizimistasStats: {
    totalMembros: number;
    contagemAtivos: number;
    contagemContribuidores: number;
    mediaContribuicaoMensal: number;
    totalComprovadoDizimo: number;
    participacaoPercent: number;
  };
  relatorioPresbiterio: {
    nomeIgreja: string;
    cnpj: string;
    endereco: string;
    pastorResponsavel: string;
    pastorCpf?: string;
    tesoureiroNome?: string;
    tesoureiroCpf?: string;
    tesoureiroTelefone?: string;
    tesoureiroEmail?: string;
    segundoTesoureiroNome?: string;
    segundoTesoureiroTelefone?: string;
    segundoTesoureiroEmail?: string;
    totalMembrosAtivos: number;
    dizimistasAtivosContagem: number;
    percentualParticipacaoDizimo: number;
    bancoInicialJan: number;
    investInicialJan: number;
    totalInicialJan: number;
    bancoFinalDez: number;
    investFinalDez: number;
    totalFinalDez: number;
    receitaDizimos: number;
    receitaOfertas: number;
    receitaMinisterios: number;
    receitaOutras: number;
    totalReceitas: number;
    despesaClero: number;
    despesaFuncionarios: number;
    despesaAtividades: number;
    despesaOperacionais: number;
    despesaConservacao: number;
    despesaContribuicaoEstatutaria: number;
    despesaOutras: number;
    totalDespesas: number;
    superavitDeficit: number;
  };
}

export const api = {
  setChurchId: (churchId: string) => {
    activeChurchId = churchId;
  },

  getChurchId: () => {
    return activeChurchId;
  },

  getDbState: async (): Promise<DbState> => {
    const res = await fetch(`${API_BASE}/db/state`);
    if (!res.ok) throw new Error("Erro ao carregar banco de dados");
    return res.json();
  },

  getWorkbook: async (): Promise<WorkbookPayload> => {
    const res = await fetch(`${API_BASE}/finance/workbook`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Erro ao carregar cálculos");
    return res.json();
  },

  createDizimista: async (data: Partial<Dizimista>): Promise<Dizimista> => {
    const res = await fetch(`${API_BASE}/dizimistas/create`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao cadastrar dizimista");
    return res.json();
  },

  updateDizimista: async (id: string, data: Partial<Dizimista>): Promise<Dizimista> => {
    const res = await fetch(`${API_BASE}/dizimistas/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao atualizar dizimista");
    return res.json();
  },

  deleteDizimista: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/dizimistas/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Erro ao apagar dizimista");
    const json = await res.json();
    return json.success;
  },

  saveDizimistasBulk: async (list: Dizimista[]): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/dizimistas/bulk`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(list)
    });
    if (!res.ok) throw new Error("Erro ao salvar dizimistas");
    const json = await res.json();
    return json.success;
  },

  createMovimentacao: async (mov: Partial<Movimentacao>): Promise<Movimentacao> => {
    const res = await fetch(`${API_BASE}/movimentacoes/create`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(mov),
    });
    if (!res.ok) throw new Error("Erro ao lançar movimentação");
    return res.json();
  },

  updateMovimentacao: async (id: string, mov: Partial<Movimentacao>): Promise<Movimentacao> => {
    const res = await fetch(`${API_BASE}/movimentacoes/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(mov),
    });
    if (!res.ok) throw new Error("Erro ao atualizar movimentação");
    return res.json();
  },

  deleteMovimentacao: async (id: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/movimentacoes/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Erro ao excluir movimentação");
    const json = await res.json();
    return json.success;
  },

  saveIgrejaConfig: async (payload: { igreja?: any; configuracoes?: any }) => {
    const res = await fetch(`${API_BASE}/igreja-config`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Erro ao salvar configurações");
    return res.json();
  },

  saveFullDb: async (state: DbState): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/db/save`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(state),
    });
    if (!res.ok) throw new Error("Erro ao salvar o banco de dados");
    const json = await res.json();
    return json.success;
  },

  // --- Auth & Access Management APIs ---
  login: async (loginName: string, senha?: string): Promise<{ success: boolean, needPasswordSetup?: boolean, usuario?: Usuario }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ login: loginName, senha }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Login falhou");
    }
    return res.json();
  },

  setupPassword: async (loginName: string, email: string, senha: string): Promise<{ success: boolean, usuario?: Usuario }> => {
    const res = await fetch(`${API_BASE}/auth/setup-password`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ login: loginName, email, senha }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Configuração de senha falhou");
    }
    return res.json();
  },

  requestRecovery: async (loginName: string, email: string): Promise<{ success: boolean, message: string, codeSimulated?: string }> => {
    const res = await fetch(`${API_BASE}/auth/request-recovery`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ login: loginName, email }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Solicitação de recuperação falhou");
    }
    return res.json();
  },

  resetPassword: async (loginName: string, code: string, novaSenha: string): Promise<{ success: boolean, message: string }> => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ login: loginName, code, novaSenha }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Redefinição de senha falhou");
    }
    return res.json();
  },

  register: async (nome: string, loginName: string, perfil: string, igrejaId: string, assinaturaImg?: string, autorizacaoConsultas?: Record<string, boolean>, email?: string, cpf?: string, telefone?: string): Promise<{ success: boolean, usuario?: Usuario }> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ nome, login: loginName, perfil, igrejaId, email, assinaturaImg, autorizacaoConsultas, cpf, telefone }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Registro falhou");
    }
    return res.json();
  },

  toggleUserAuth: async (userId: string): Promise<{ success: boolean, usuario: Usuario }> => {
    const res = await fetch(`${API_BASE}/admin/users/toggle-auth`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error("Erro ao alterar autorização do usuário");
    return res.json();
  },

  deleteUser: async (userId: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/admin/users/delete`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Erro ao excluir usuário no servidor");
    }
    return true;
  },

  createChurch: async (nome: string, cnpj: string, endereco: string, pastor: string): Promise<{ success: boolean, church: any }> => {
    const res = await fetch(`${API_BASE}/admin/churches/create`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ nome, cnpj, endereco, pastor }),
    });
    if (!res.ok) throw new Error("Erro ao criar nova igreja");
    return res.json();
  },

  updateChurch: async (id: string, nome: string, cnpj: string, endereco: string, pastor: string): Promise<{ success: boolean, church: any }> => {
    const res = await fetch(`${API_BASE}/admin/churches/update`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ id, nome, cnpj, endereco, pastor }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Erro ao atualizar igreja");
    }
    return res.json();
  },

  updateUser: async (id: string, nome: string, loginName: string, perfil: string, igrejaId: string, assinaturaImg?: string, autorizacaoConsultas?: Record<string, boolean>, email?: string, senha?: string, cpf?: string, telefone?: string): Promise<{ success: boolean, usuario: Usuario }> => {
    const res = await fetch(`${API_BASE}/admin/users/update`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ id, nome, login: loginName, perfil, igrejaId, assinaturaImg, autorizacaoConsultas, email, senha, cpf, telefone }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Erro ao atualizar usuário");
    }
    return res.json();
  },

  updateUserSignature: async (userId: string, signatureImg: string): Promise<{ success: boolean, usuario: Usuario }> => {
    const res = await fetch(`${API_BASE}/users/update-signature`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ userId, signatureImg }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Erro ao atualizar assinatura do usuário");
    }
    return res.json();
  },

  deleteChurch: async (churchId: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/admin/churches/delete`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ churchId }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Erro ao excluir igreja no servidor (certifique-se de que não é a única)");
    }
    return true;
  },

  authorizeConsultant: async (consultantId: string, churchId: string, authorized: boolean): Promise<{ success: boolean, usuario: Usuario }> => {
    const res = await fetch(`${API_BASE}/users/authorize-consultant`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ consultantId, churchId, authorized }),
    });
    if (!res.ok) throw new Error("Erro ao conceder autorização para consulta");
    return res.json();
  }
};
