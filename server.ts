import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { 
  DbState, 
  Dizimista, 
  Movimentacao, 
  CATEGORIAS_ENTRADA, 
  CATEGORIAS_SAIDA, 
  MESES_NOMES,
  LISTA_MINISTERIOS,
  IgrejaLocal,
  Usuario
} from "./src/types.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const DB_FILE_PATH = path.join(process.cwd(), "db.json");

// Helper for generating unique IDs
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// ----------------------------------------------------
// DEFAULT SEED DATA
// ----------------------------------------------------
const SEED_CHURCHES: IgrejaLocal[] = [
  {
    id: "ipb-alianca",
    igreja: {
      id: "ipb-alianca",
      nome: "Igreja Presbiteriana Aliança",
      cnpj: "12.345.678/0001-99",
      endereco: "Av. Principal, 1000 - Centro",
      pastor: "Rev. Douglas de Paula",
      pastorCpf: "111.222.333-44",
      membrosAtivos: 150,
      tesoureiroNome: "Carlos Alberto da Silva",
      tesoureiroCpf: "555.666.777-88"
    },
    dizimistas: [],
    movimentacoes: [],
    configuracoes: {
      igrejaId: "ipb-alianca",
      saldoInicialBancoJan: 12000,
      saldoInicialInvestJan: 45000,
      fundoPresbiterialPercent: 10,
      metaMembrosDizimistas: 80,
      ministerios: LISTA_MINISTERIOS
    },
    compromissos: []
  },
  {
    id: "ipb-central",
    igreja: {
      id: "ipb-central",
      nome: "Igreja Presbiteriana Central",
      cnpj: "98.765.432/0001-11",
      endereco: "Rua das Oliveiras, 250 - Altos",
      pastor: "Rev. Douglas de Paula",
      pastorCpf: "111.222.333-44",
      membrosAtivos: 90,
      tesoureiroNome: "Roberto Mendes",
      tesoureiroCpf: "222.333.444-55"
    },
    dizimistas: [],
    movimentacoes: [],
    configuracoes: {
      igrejaId: "ipb-central",
      saldoInicialBancoJan: 3500,
      saldoInicialInvestJan: 0,
      fundoPresbiterialPercent: 10,
      metaMembrosDizimistas: 70,
      ministerios: LISTA_MINISTERIOS
    },
    compromissos: []
  },
  {
    id: "ipb-esperanca",
    igreja: {
      id: "ipb-esperanca",
      nome: "Igreja Presbiteriana Esperança",
      cnpj: "45.678.901/0001-22",
      endereco: "Praça da Paz, 12 - Jardim",
      pastor: "Rev. Douglas de Paula",
      pastorCpf: "111.222.333-44",
      membrosAtivos: 60,
      tesoureiroNome: "Marcos Pinheiro",
      tesoureiroCpf: "333.444.555-66"
    },
    dizimistas: [],
    movimentacoes: [],
    configuracoes: {
      igrejaId: "ipb-esperanca",
      saldoInicialBancoJan: 1500,
      saldoInicialInvestJan: 10000,
      fundoPresbiterialPercent: 10,
      metaMembrosDizimistas: 75,
      ministerios: LISTA_MINISTERIOS
    },
    compromissos: []
  }
];

const SEED_USERS: Usuario[] = [
  { id: "u-1", nome: "Presb. Douglas de Paula (Geral)", login: "admin", perfil: "admin", autorizado: true, autorizacaoConsultas: {} },
  { id: "u-6", nome: "Carlos Alberto", login: "alianca", perfil: "tesoureiro", igrejaId: "ipb-alianca", autorizado: true, autorizacaoConsultas: {} },
  { id: "u-7", nome: "Roberto Mendes", login: "central", perfil: "tesoureiro", igrejaId: "ipb-central", autorizado: true, autorizacaoConsultas: {} },
  { id: "u-4", nome: "Marcos Pinheiro", login: "esperanca", perfil: "tesoureiro", igrejaId: "ipb-esperanca", autorizado: false, autorizacaoConsultas: {} },
  { id: "u-5", nome: "Dr. Marcos Silva", login: "consultor", perfil: "consulta", autorizado: true, autorizacaoConsultas: {} }
];

const DEFAULT_STATE: DbState = {
  igreja: SEED_CHURCHES[0].igreja,
  usuarios: SEED_USERS,
  dizimistas: [],
  configuracoes: SEED_CHURCHES[0].configuracoes,
  movimentacoes: [],
  compromissos: [],
  igrejasLocais: SEED_CHURCHES
};

// ----------------------------------------------------
// DB LOAD & SAVE HELPMERS
// ----------------------------------------------------
function getDbState(): DbState {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      const initial = { ...DEFAULT_STATE };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const content = fs.readFileSync(DB_FILE_PATH, "utf-8");
    const db: DbState = JSON.parse(content);
    let changed = false;

    // Seed default churches if missing
    if (!db.igrejasLocais || db.igrejasLocais.length === 0) {
      db.igrejasLocais = [...SEED_CHURCHES];
      changed = true;
    }
    // Seed default users if missing
    if (!db.usuarios || db.usuarios.length === 0) {
      db.usuarios = [...SEED_USERS];
      changed = true;
    }

    // Ensure all churches have local ministerios
    for (const ch of db.igrejasLocais) {
      if (!ch.configuracoes.ministerios) {
        ch.configuracoes.ministerios = [...LISTA_MINISTERIOS];
        changed = true;
      }
    }

    if (changed) {
      saveDbState(db);
    }
    return db;
  } catch (err) {
    console.error("Error reading db file, falling back to default:", err);
    return { ...DEFAULT_STATE };
  }
}

function saveDbState(state: DbState): boolean {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing db file:", err);
    return false;
  }
}

// ----------------------------------------------------
// MULTI-CHURCH CONTEXT HELPERS
// ----------------------------------------------------
function getChurchState(db: DbState, req: express.Request): {
  igreja: any,
  dizimistas: any[],
  movimentacoes: any[],
  configuracoes: any,
  compromissos: any[]
} {
  const churchId = req.headers["x-church-id"] as string || req.query.churchId as string || db.igreja.id;
  
  if (db.igrejasLocais) {
    const found = db.igrejasLocais.find(c => c.id === churchId);
    if (found) {
      return {
        igreja: found.igreja,
        dizimistas: found.dizimistas || [],
        movimentacoes: found.movimentacoes || [],
        configuracoes: found.configuracoes || { igrejaId: churchId },
        compromissos: found.compromissos || []
      };
    }
  }
  
  return {
    igreja: db.igreja,
    dizimistas: db.dizimistas || [],
    movimentacoes: db.movimentacoes || [],
    configuracoes: db.configuracoes,
    compromissos: db.compromissos || []
  };
}

function updateChurchStateInDb(db: DbState, churchId: string, updates: {
  igreja?: any,
  dizimistas?: any[],
  movimentacoes?: any[],
  configuracoes?: any,
  compromissos?: any[]
}) {
  if (!db.igrejasLocais) {
    db.igrejasLocais = [
      {
        id: db.igreja.id,
        igreja: db.igreja,
        dizimistas: db.dizimistas || [],
        movimentacoes: db.movimentacoes || [],
        configuracoes: db.configuracoes,
        compromissos: db.compromissos || []
      }
    ];
  }
  
  let found = db.igrejasLocais.find(c => c.id === churchId);
  if (!found) {
    found = {
      id: churchId,
      igreja: updates.igreja || { id: churchId, nome: "Igreja Local" },
      dizimistas: updates.dizimistas || [],
      movimentacoes: updates.movimentacoes || [],
      configuracoes: updates.configuracoes || { igrejaId: churchId },
      compromissos: updates.compromissos || []
    };
    db.igrejasLocais.push(found);
  } else {
    if (updates.igreja) found.igreja = { ...found.igreja, ...updates.igreja };
    if (updates.dizimistas) found.dizimistas = updates.dizimistas;
    if (updates.movimentacoes) found.movimentacoes = updates.movimentacoes;
    if (updates.configuracoes) found.configuracoes = { ...found.configuracoes, ...updates.configuracoes };
    if (updates.compromissos) found.compromissos = updates.compromissos;
  }
  
  // Keep parent fallback synced if the current selected matches
  if (db.igreja.id === churchId) {
    if (updates.igreja) db.igreja = { ...db.igreja, ...updates.igreja };
    if (updates.dizimistas) db.dizimistas = updates.dizimistas;
    if (updates.movimentacoes) db.movimentacoes = updates.movimentacoes;
    if (updates.configuracoes) db.configuracoes = { ...db.configuracoes, ...updates.configuracoes };
    if (updates.compromissos) db.compromissos = updates.compromissos;
  }
  
  saveDbState(db);
}

// ----------------------------------------------------
// WORKBOOK CALCULATION ENGINE
// ----------------------------------------------------
export interface CompiledMonth {
  mesIndex: number;
  nome: string;
  
  // Saldo Anterior
  saldoAnteriorBanco: number;
  saldoAnteriorInvest: number;
  saldoAnteriorTotal: number;

  // Entradas values mapped by category
  entradasMap: { [key: string]: number };
  entradasTotal: number;

  // Saídas values mapped by category
  saidasMap: { [key: string]: number };
  saidasTotal: number;

  // Saldo Final
  saldoFinalBanco: number;
  saldoFinalInvest: number;
  saldoFinalTotal: number;

  // Net monthly result (Entradas - Saidas)
  resultadoMensal: number;
}

export function compileWorkbook(state: DbState) {
  const result: CompiledMonth[] = [];

  for (let m = 0; m < 12; m++) {
    // 1. Calculate Initial Balance (Saldo Anterior)
    let saldoAnteriorBanco = 0;
    let saldoAnteriorInvest = 0;

    if (m === 0) {
      saldoAnteriorBanco = state.configuracoes.saldoInicialBancoJan;
      saldoAnteriorInvest = state.configuracoes.saldoInicialInvestJan;
    } else {
      const prev = result[m - 1];
      saldoAnteriorBanco = prev.saldoFinalBanco;
      saldoAnteriorInvest = prev.saldoFinalInvest;
    }

    const saldoAnteriorTotal = saldoAnteriorBanco + saldoAnteriorInvest;

    // 2. Aggregate Entradas
    const entradasMap: { [key: string]: number } = {};
    for (const cat of CATEGORIAS_ENTRADA) {
      entradasMap[cat] = 0;
    }

    // A. Dízimos auto-calculated from active + tither contributions for month `m`
    const dizimosDoMes = state.dizimistas.reduce((sum, d) => sum + (d.contribuicoes[m] || 0), 0);
    entradasMap["Dízimos"] = dizimosDoMes;

    // B. Map general transactions for month `m` and type 'entrada'
    const inputs = state.movimentacoes.filter(mov => mov.mes === m && mov.tipo === "entrada");
    for (const mov of inputs) {
      // If categories match standard, aggregate. If not, fallback to 'Outras Entradas'
      if (CATEGORIAS_ENTRADA.includes(mov.categoria as any)) {
        entradasMap[mov.categoria] += mov.valor;
      } else {
        entradasMap["Outras Entradas"] += mov.valor;
      }
    }

    const entradasTotal = Object.values(entradasMap).reduce((sum, val) => sum + val, 0);

    // 3. Aggregate Saídas
    const saidasMap: { [key: string]: number } = {};
    for (const cat of CATEGORIAS_SAIDA) {
      saidasMap[cat] = 0;
    }

    const outputs = state.movimentacoes.filter(mov => mov.mes === m && mov.tipo === "saida");
    for (const mov of outputs) {
      if (CATEGORIAS_SAIDA.includes(mov.categoria as any)) {
        saidasMap[mov.categoria] += mov.valor;
      } else {
        saidasMap["Outras Saídas"] += mov.valor;
      }
    }

    const saidasTotal = Object.values(saidasMap).reduce((sum, val) => sum + val, 0);

    // 4. Calculate Final Balances
    // Investments Final = Initial + Aplicações (saída) - Resgate (entrada)
    const aplicacoes = saidasMap["Aplicações Financeiras"] || 0;
    const resgates = entradasMap["Resgate de Investimentos"] || 0;
    const saldoFinalInvest = saldoAnteriorInvest + aplicacoes - resgates;

    // Total Cash Flow
    const resultadoMensal = entradasTotal - saidasTotal;
    const saldoFinalTotal = saldoAnteriorTotal + resultadoMensal;

    // Bank accounts final
    const saldoFinalBanco = saldoFinalTotal - saldoFinalInvest;

    result.push({
      mesIndex: m,
      nome: MESES_NOMES[m],
      saldoAnteriorBanco,
      saldoAnteriorInvest,
      saldoAnteriorTotal,
      entradasMap,
      entradasTotal,
      saidasMap,
      saidasTotal,
      saldoFinalBanco,
      saldoFinalInvest,
      saldoFinalTotal,
      resultadoMensal
    });
  }

  // 5. Build General Consolidation (Geral)
  const geral = {
    totalAnualEntradas: result.reduce((sum, item) => sum + item.entradasTotal, 0),
    totalAnualSaidas: result.reduce((sum, item) => sum + item.saidasTotal, 0),
    resultadoAnual: result.reduce((sum, item) => sum + item.resultadoMensal, 0),
    
    // Annual sums per categories
    entradasTotaisPorCategoria: CATEGORIAS_ENTRADA.reduce((acc, cat) => {
      acc[cat] = result.reduce((sum, m) => sum + (m.entradasMap[cat] || 0), 0);
      return acc;
    }, {} as { [key: string]: number }),

    saidasTotaisPorCategoria: CATEGORIAS_SAIDA.reduce((acc, cat) => {
      acc[cat] = result.reduce((sum, m) => sum + (m.saidasMap[cat] || 0), 0);
      return acc;
    }, {} as { [key: string]: number }),
  };

  // 6. Build Dizimistas Calculations
  const tithersCount = state.dizimistas.filter(d => d.ativo).length;
  const totalDizimistasAnual = state.dizimistas.reduce((tot, d) => tot + d.contribuicoes.reduce((s, c) => s + c, 0), 0);
  
  // Total tithers who contributed at least once
  const activeTithingMembers = state.dizimistas.filter(d => d.contribuicoes.some(c => c > 0)).length;
  const participationPercent = state.igreja.membrosAtivos > 0 
    ? Math.round((activeTithingMembers / state.igreja.membrosAtivos) * 100)
    : 0;

  // Find active treasurer user from the database state
  const activeChTreasurer = state.usuarios?.find(
    (u: any) => u.perfil === 'tesoureiro' && u.igrejaId === state.igreja.id
  );

  // 7. Presbytery Report
  const relatorioPresbiterio = {
    nomeIgreja: state.igreja.nome,
    cnpj: state.igreja.cnpj,
    endereco: state.igreja.endereco,
    pastorResponsavel: state.igreja.pastor,
    pastorCpf: state.igreja.pastorCpf || "",
    tesoureiroNome: activeChTreasurer?.nome || state.igreja.tesoureiroNome || "",
    tesoureiroCpf: activeChTreasurer?.cpf || state.igreja.tesoureiroCpf || "",
    tesoureiroTelefone: activeChTreasurer?.telefone || state.igreja.tesoureiroTelefone || "",
    tesoureiroEmail: activeChTreasurer?.email || state.igreja.tesoureiroEmail || "",
    segundoTesoureiroNome: state.igreja.segundoTesoureiroNome || "",
    segundoTesoureiroTelefone: state.igreja.segundoTesoureiroTelefone || "",
    segundoTesoureiroEmail: state.igreja.segundoTesoureiroEmail || "",
    totalMembrosAtivos: state.igreja.membrosAtivos,
    dizimistasAtivosContagem: tithersCount,
    percentualParticipacaoDizimo: participationPercent,
    
    // Financial assets
    bancoInicialJan: state.configuracoes.saldoInicialBancoJan,
    investInicialJan: state.configuracoes.saldoInicialInvestJan,
    totalInicialJan: state.configuracoes.saldoInicialBancoJan + state.configuracoes.saldoInicialInvestJan,
    
    bancoFinalDez: result[11].saldoFinalBanco,
    investFinalDez: result[11].saldoFinalInvest,
    totalFinalDez: result[11].saldoFinalTotal,

    // Inflows aggregated for report
    receitaDizimos: geral.entradasTotaisPorCategoria["Dízimos"] || 0,
    receitaOfertas: geral.entradasTotaisPorCategoria["Ofertas Regulares"] || 0,
    receitaMinisterios: geral.entradasTotaisPorCategoria["Ministérios Internos"] || 0,
    receitaOutras: (geral.entradasTotaisPorCategoria["Outras Entradas"] || 0) + 
                  (geral.entradasTotaisPorCategoria["Resgate de Investimentos"] || 0) + 
                  (geral.entradasTotaisPorCategoria["Empréstimos Recebidos"] || 0),
    totalReceitas: geral.totalAnualEntradas,

    // Outflows aggregated for report
    despesaClero: geral.saidasTotaisPorCategoria["Sustento Pastoral"] || 0,
    despesaFuncionarios: geral.saidasTotaisPorCategoria["Funcionários e Encargos"] || 0,
    despesaAtividades: geral.saidasTotaisPorCategoria["Ministérios e Atividades"] || 0,
    despesaOperacionais: geral.saidasTotaisPorCategoria["Despesas Operacionais"] || 0,
    despesaConservacao: geral.saidasTotaisPorCategoria["Conservação e Patrimônio"] || 0,
    despesaContribuicaoEstatutaria: geral.saidasTotaisPorCategoria["Contribuições Estatutárias"] || 0,
    despesaOutras: (geral.saidasTotaisPorCategoria["Aplicações Financeiras"] || 0) + 
                  (geral.saidasTotaisPorCategoria["Amortização de Empréstimos"] || 0) + 
                  (geral.saidasTotaisPorCategoria["Cartão de Crédito"] || 0) + 
                  (geral.saidasTotaisPorCategoria["Outras Saídas"] || 0),
    totalDespesas: geral.totalAnualSaidas,

    superavitDeficit: geral.totalAnualEntradas - geral.totalAnualSaidas,
  };

  return {
    meses: result,
    geral,
    dizimistasStats: {
      totalMembros: state.igreja.membrosAtivos,
      contagemAtivos: tithersCount,
      contagemContribuidores: activeTithingMembers,
      mediaContribuicaoMensal: activeTithingMembers > 0 ? (totalDizimistasAnual / 12) / activeTithingMembers : 0,
      totalComprovadoDizimo: totalDizimistasAnual,
      participacaoPercent: participationPercent
    },
    relatorioPresbiterio
  };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Get full state
app.get("/api/db/state", (req, res) => {
  const db = getDbState();
  const context = getChurchState(db, req);
  res.json({
    ...db,
    igreja: context.igreja,
    dizimistas: context.dizimistas,
    movimentacoes: context.movimentacoes,
    configuracoes: context.configuracoes,
    compromissos: context.compromissos
  });
});

// 2. Get calculated workbook (real-time formulas) for selected church
app.get("/api/finance/workbook", (req, res) => {
  const db = getDbState();
  const context = getChurchState(db, req);
  const tempDb: DbState = {
    igreja: context.igreja,
    usuarios: db.usuarios,
    dizimistas: context.dizimistas,
    movimentacoes: context.movimentacoes,
    configuracoes: context.configuracoes,
    compromissos: context.compromissos,
    igrejasLocais: db.igrejasLocais
  };
  const compiled = compileWorkbook(tempDb);
  res.json(compiled);
});

// 3. Save full state
app.post("/api/db/save", (req, res) => {
  const verified = saveDbState(req.body);
  if (verified) {
    res.json({ success: true, message: "Banco de dados guardado com sucesso!" });
  } else {
    res.status(500).json({ error: "Falha ao gravar no banco de dados." });
  }
});

// 4. Dizimistas CRUD (scoped by header x-church-id)
app.get("/api/dizimistas", (req, res) => {
  const db = getDbState();
  const context = getChurchState(db, req);
  res.json(context.dizimistas);
});

app.post("/api/dizimistas/bulk", (req, res) => {
  const churchId = req.headers["x-church-id"] as string || req.query.churchId as string || "ipb-alianca";
  const db = getDbState();
  updateChurchStateInDb(db, churchId, { dizimistas: req.body });
  res.json({ success: true, count: req.body.length });
});

app.post("/api/dizimistas/create", (req, res) => {
  const churchId = req.headers["x-church-id"] as string || req.query.churchId as string || "ipb-alianca";
  const db = getDbState();
  const context = getChurchState(db, req);
  const newDizimista: Dizimista = {
    id: generateId(),
    numero: req.body.numero || (context.dizimistas.length > 0 ? Math.max(...context.dizimistas.map(d => d.numero)) + 1 : 1),
    nome: req.body.nome || "Novo Dizimista",
    ativo: req.body.ativo !== undefined ? req.body.ativo : true,
    contribuicoes: req.body.contribuicoes || Array(12).fill(0)
  };
  const newList = [...context.dizimistas, newDizimista];
  updateChurchStateInDb(db, churchId, { dizimistas: newList });
  res.json(newDizimista);
});

app.put("/api/dizimistas/:id", (req, res) => {
  const churchId = req.headers["x-church-id"] as string || req.query.churchId as string || "ipb-alianca";
  const db = getDbState();
  const context = getChurchState(db, req);
  const index = context.dizimistas.findIndex(d => d.id === req.params.id);
  if (index !== -1) {
    const updated = { ...context.dizimistas[index], ...req.body };
    const newList = [...context.dizimistas];
    newList[index] = updated;
    updateChurchStateInDb(db, churchId, { dizimistas: newList });
    res.json(updated);
  } else {
    res.status(404).json({ error: "Dizimista não localizado." });
  }
});

app.delete("/api/dizimistas/:id", (req, res) => {
  const churchId = req.headers["x-church-id"] as string || req.query.churchId as string || "ipb-alianca";
  const db = getDbState();
  const context = getChurchState(db, req);
  const filtered = context.dizimistas.filter(d => d.id !== req.params.id);
  updateChurchStateInDb(db, churchId, { dizimistas: filtered });
  res.json({ success: true });
});

// 5. Movimentacoes CRUD (scoped by header x-church-id)
app.get("/api/movimentacoes", (req, res) => {
  const db = getDbState();
  const context = getChurchState(db, req);
  res.json(context.movimentacoes);
});

app.post("/api/movimentacoes/create", (req, res) => {
  const churchId = req.headers["x-church-id"] as string || req.query.churchId as string || "ipb-alianca";
  const db = getDbState();
  const context = getChurchState(db, req);
  const newMov: Movimentacao = {
    id: generateId(),
    mes: parseInt(req.body.mes),
    tipo: req.body.tipo,
    categoria: req.body.categoria,
    descricao: req.body.descricao || "",
    valor: parseFloat(req.body.valor) || 0,
    data: req.body.data || new Date().toISOString().split("T")[0],
    ministerio: req.body.ministerio || ""
  };
  const newList = [...context.movimentacoes, newMov];
  updateChurchStateInDb(db, churchId, { movimentacoes: newList });
  res.json(newMov);
});

app.put("/api/movimentacoes/:id", (req, res) => {
  const churchId = req.headers["x-church-id"] as string || req.query.churchId as string || "ipb-alianca";
  const db = getDbState();
  const context = getChurchState(db, req);
  const index = context.movimentacoes.findIndex(m => m.id === req.params.id);
  if (index !== -1) {
    const updated = {
      ...context.movimentacoes[index],
      ...req.body,
      mes: req.body.mes !== undefined ? parseInt(req.body.mes) : context.movimentacoes[index].mes,
      valor: req.body.valor !== undefined ? parseFloat(req.body.valor) : context.movimentacoes[index].valor,
      ministerio: req.body.ministerio !== undefined ? req.body.ministerio : context.movimentacoes[index].ministerio
    };
    const newList = [...context.movimentacoes];
    newList[index] = updated;
    updateChurchStateInDb(db, churchId, { movimentacoes: newList });
    res.json(updated);
  } else {
    res.status(404).json({ error: "Movimentação não localizada." });
  }
});

app.delete("/api/movimentacoes/:id", (req, res) => {
  const churchId = req.headers["x-church-id"] as string || req.query.churchId as string || "ipb-alianca";
  const db = getDbState();
  const context = getChurchState(db, req);
  const filtered = context.movimentacoes.filter(m => m.id !== req.params.id);
  updateChurchStateInDb(db, churchId, { movimentacoes: filtered });
  res.json({ success: true });
});

// 6. Iglesia/Config CRUD (scoped by header x-church-id)
app.get("/api/igreja-config", (req, res) => {
  const db = getDbState();
  const context = getChurchState(db, req);
  res.json({ igreja: context.igreja, configuracoes: context.configuracoes });
});

app.post("/api/igreja-config", (req, res) => {
  const churchId = req.headers["x-church-id"] as string || req.query.churchId as string || "ipb-alianca";
  const db = getDbState();
  const context = getChurchState(db, req);
  
  let updatedIgreja = { ...context.igreja };
  if (req.body.igreja) {
    updatedIgreja = { ...updatedIgreja, ...req.body.igreja };
  }
  
  let updatedConfig = { ...context.configuracoes };
  if (req.body.configuracoes) {
    updatedConfig = { 
      ...updatedConfig, 
      ...req.body.configuracoes,
      saldoInicialBancoJan: parseFloat(req.body.configuracoes.saldoInicialBancoJan) || 0,
      saldoInicialInvestJan: parseFloat(req.body.configuracoes.saldoInicialInvestJan) || 0,
      fundoPresbiterialPercent: parseFloat(req.body.configuracoes.fundoPresbiterialPercent) || 0,
      metaMembrosDizimistas: parseInt(req.body.configuracoes.metaMembrosDizimistas) || 0
    };
  }
  
  updateChurchStateInDb(db, churchId, {
    igreja: updatedIgreja,
    configuracoes: updatedConfig
  });
  
  res.json({ success: true, igreja: updatedIgreja, configuracoes: updatedConfig });
});

// 7. Security & User Management (Auth)
app.post("/api/auth/login", (req, res) => {
  const { login, senha } = req.body;
  const db = getDbState();
  const user = db.usuarios.find(u => u.login.toLowerCase() === login.trim().toLowerCase());
  if (user) {
    if (!user.senha) {
      // First access, needs to set up password
      return res.json({ 
        success: true, 
        needPasswordSetup: true, 
        usuario: { 
          id: user.id, 
          nome: user.nome, 
          login: user.login, 
          perfil: user.perfil, 
          email: user.email 
        } 
      });
    }

    // Verify Password
    if (!senha) {
      return res.status(401).json({ error: "Este usuário possui login protegido por senha. Por favor, insira a senha." });
    }

    if (user.senha !== senha) {
      return res.status(401).json({ error: "Senha incorreta." });
    }

    res.json({ success: true, usuario: user });
  } else {
    res.status(401).json({ error: "Usuário não encontrado." });
  }
});

app.post("/api/auth/setup-password", (req, res) => {
  const { login, email, senha } = req.body;
  const db = getDbState();
  const user = db.usuarios.find(u => u.login.toLowerCase() === login.trim().toLowerCase());
  
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }
  if (user.senha) {
    return res.status(400).json({ error: "Este usuário já possui uma senha cadastrada." });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: "O e-mail é obrigatório para cadastrar o primeiro acesso." });
  }
  if (!senha || !senha.trim()) {
    return res.status(400).json({ error: "A senha é obrigatória." });
  }

  user.email = email.trim().toLowerCase();
  user.senha = senha;
  saveDbState(db);
  res.json({ success: true, usuario: user });
});

app.post("/api/auth/request-recovery", (req, res) => {
  const { login, email } = req.body;
  const db = getDbState();
  const user = db.usuarios.find(u => u.login.toLowerCase() === login.trim().toLowerCase());
  
  if (!user) {
    return res.status(400).json({ error: "Usuário não encontrado." });
  }
  if (!user.email || user.email.toLowerCase() !== email.trim().toLowerCase()) {
    return res.status(400).json({ error: "E-mail informado não confere com o cadastrado." });
  }

  // Generates a 6-digit numeric recovery code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.recoveryCode = code;
  user.recoveryExpires = Date.now() + 15 * 60 * 1000; // 15 mins
  
  saveDbState(db);
  res.json({ 
    success: true, 
    message: "Código de recuperação gerado.", 
    codeSimulated: code 
  });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { login, code, novaSenha } = req.body;
  const db = getDbState();
  const user = db.usuarios.find(u => u.login.toLowerCase() === login.trim().toLowerCase());
  
  if (!user) {
    return res.status(400).json({ error: "Usuário não encontrado." });
  }
  if (!user.recoveryCode || user.recoveryCode !== code.trim()) {
    return res.status(400).json({ error: "Código de recuperação incorreto." });
  }
  if (!user.recoveryExpires || user.recoveryExpires < Date.now()) {
    return res.status(400).json({ error: "Código de recuperação expirou." });
  }
  if (!novaSenha || !novaSenha.trim()) {
    return res.status(400).json({ error: "A nova senha não pode ser vazia." });
  }

  user.senha = novaSenha;
  delete user.recoveryCode;
  delete user.recoveryExpires;
  
  saveDbState(db);
  res.json({ success: true, message: "Senha redefinida com sucesso!" });
});

app.post("/api/auth/register", (req, res) => {
  const { nome, login, perfil, igrejaId, assinaturaImg, autorizacaoConsultas, email, cpf, telefone } = req.body;
  const db = getDbState();
  if (db.usuarios.some(u => u.login.toLowerCase() === login.trim().toLowerCase())) {
    return res.status(400).json({ error: "Este nome de login já está em uso." });
  }
  const newUser = {
    id: generateId(),
    nome,
    login: login.trim().toLowerCase(),
    perfil,
    email: email ? email.trim().toLowerCase() : "",
    igrejaId: igrejaId || "ipb-alianca",
    autorizado: perfil === "admin" ? true : false, // admin starts as authorized automatically
    autorizacaoConsultas: autorizacaoConsultas || {},
    assinaturaImg: assinaturaImg || "",
    cpf: cpf || "",
    telefone: telefone || ""
  };
  db.usuarios.push(newUser);
  saveDbState(db);
  res.json({ success: true, usuario: newUser });
});

app.post("/api/admin/users/toggle-auth", (req, res) => {
  const { userId } = req.body;
  const db = getDbState();
  const user = db.usuarios.find(u => u.id === userId);
  if (user) {
    user.autorizado = !user.autorizado;
    saveDbState(db);
    res.json({ success: true, usuario: user });
  } else {
    res.status(404).json({ error: "Usuário não encontrado" });
  }
});

app.post("/api/admin/users/delete", (req, res) => {
  const { userId } = req.body;
  const db = getDbState();
  db.usuarios = db.usuarios.filter(u => u.id !== userId);
  saveDbState(db);
  res.json({ success: true });
});

app.post("/api/admin/churches/create", (req, res) => {
  const { nome, cnpj, endereco, pastor } = req.body;
  const db = getDbState();
  const id = generateId();
  const newChurchLocal = {
    id,
    igreja: {
      id,
      nome,
      cnpj: cnpj || "",
      endereco: endereco || "",
      pastor: pastor || "",
      pastorCpf: "",
      membrosAtivos: 100
    },
    dizimistas: [],
    movimentacoes: [],
    configuracoes: {
      igrejaId: id,
      saldoInicialBancoJan: 0,
      saldoInicialInvestJan: 0,
      fundoPresbiterialPercent: 10,
      metaMembrosDizimistas: 80,
      ministerios: LISTA_MINISTERIOS
    },
    compromissos: []
  };
  if (!db.igrejasLocais) db.igrejasLocais = [];
  db.igrejasLocais.push(newChurchLocal);
  saveDbState(db);
  res.json({ success: true, church: newChurchLocal });
});

app.post("/api/admin/churches/delete", (req, res) => {
  const { churchId } = req.body;
  const db = getDbState();
  if (db.igrejasLocais) {
    db.igrejasLocais = db.igrejasLocais.filter(c => c.id !== churchId);
    saveDbState(db);
  }
  res.json({ success: true });
});

app.post("/api/admin/churches/update", (req, res) => {
  const { id, nome, cnpj, endereco, pastor } = req.body;
  const db = getDbState();
  const churchLocal = db.igrejasLocais?.find(c => c.id === id);
  if (churchLocal) {
    churchLocal.igreja.nome = nome || churchLocal.igreja.nome;
    churchLocal.igreja.cnpj = cnpj !== undefined ? cnpj : churchLocal.igreja.cnpj;
    churchLocal.igreja.endereco = endereco !== undefined ? endereco : churchLocal.igreja.endereco;
    churchLocal.igreja.pastor = pastor !== undefined ? pastor : churchLocal.igreja.pastor;
    saveDbState(db);
    res.json({ success: true, church: churchLocal });
  } else {
    res.status(404).json({ error: "Igreja não encontrada" });
  }
});

app.post("/api/admin/users/update", (req, res) => {
  const { id, nome, login, perfil, igrejaId, autorizacaoConsultas, email, senha, cpf, telefone } = req.body;
  const db = getDbState();
  const user = db.usuarios.find(u => u.id === id);
  if (user) {
    if (login && login.trim().toLowerCase() !== user.login.toLowerCase()) {
      const loginTaken = db.usuarios.some(u => u.login.toLowerCase() === login.trim().toLowerCase() && u.id !== id);
      if (loginTaken) {
        return res.status(400).json({ error: "Este login já está em uso por outro usuário." });
      }
      user.login = login.trim().toLowerCase();
    }
    user.nome = nome || user.nome;
    user.perfil = perfil || user.perfil;
    user.igrejaId = perfil === 'tesoureiro' ? (igrejaId || "") : "";
    if (email !== undefined) {
      user.email = email.trim().toLowerCase();
    }
    if (senha !== undefined) {
      user.senha = senha;
    }
    if (req.body.assinaturaImg !== undefined) {
      user.assinaturaImg = req.body.assinaturaImg;
    }
    if (autorizacaoConsultas !== undefined) {
      user.autorizacaoConsultas = autorizacaoConsultas;
    }
    if (cpf !== undefined) {
      user.cpf = cpf;
    }
    if (telefone !== undefined) {
      user.telefone = telefone;
    }
    saveDbState(db);
    res.json({ success: true, usuario: user });
  } else {
    res.status(404).json({ error: "Usuário não encontrado" });
  }
});

app.post("/api/users/update-signature", (req, res) => {
  const { userId, signatureImg } = req.body;
  const db = getDbState();
  const user = db.usuarios.find(u => u.id === userId);
  if (user) {
    user.assinaturaImg = signatureImg;
    saveDbState(db);
    res.json({ success: true, usuario: user });
  } else {
    res.status(404).json({ error: "Usuário não encontrado" });
  }
});

// Authorize consultant access for a church
app.post("/api/users/authorize-consultant", (req, res) => {
  const { consultantId, churchId, authorized } = req.body;
  const db = getDbState();
  const consultant = db.usuarios.find(u => u.id === consultantId);
  if (consultant) {
    if (!consultant.autorizacaoConsultas) {
      consultant.autorizacaoConsultas = {};
    }
    consultant.autorizacaoConsultas[churchId] = !!authorized;
    saveDbState(db);
    res.json({ success: true, usuario: consultant });
  } else {
    res.status(404).json({ error: "Consultor não encontrado." });
  }
});

// ----------------------------------------------------
// VITE OR STATIC RUNTIME MIDDLEWARE
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Church Treasury Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
