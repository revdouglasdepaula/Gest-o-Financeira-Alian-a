import React, { useState } from 'react';
import { WorkbookPayload } from '../api';
import { formatCurrency, formatPercent, computeMinistriesBalances } from '../utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Landmark, 
  Receipt, 
  CirclePercent, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRightLeft, 
  Calendar, 
  BarChart2, 
  AreaChart as AreaIcon, 
  Layers, 
  Target, 
  CheckCircle2,
  AlertTriangle,
  Bell,
  Clock,
  Trash2,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShoppingCart,
  Info,
  Check,
  Search
} from 'lucide-react';
import { MESES_NOMES, DbState, CompromissoFinanceiro, Movimentacao } from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  LineChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';

interface DashboardProps {
  workbook: WorkbookPayload | null;
  dbState: DbState | null;
  onNavigateToMonth: (monthIndex: number) => void;
  onAddMovimentacao?: (mov: Partial<Movimentacao>) => Promise<void>;
  onSaveFullDB?: (state: DbState) => Promise<void>;
  userRole?: string;
}

const defaultCompromissos: CompromissoFinanceiro[] = [
  {
    id: "comp-1",
    descricao: "Parcela Notebook Secretaria",
    valor: 450.00,
    dataVencimento: "2026-06-20",
    parcelaAtual: 2,
    totalParcelas: 5,
    categoria: "Conservação e Patrimônio",
    pago: false,
  },
  {
    id: "comp-2",
    descricao: "Revisão Filtro Ar Condicionado Templo",
    valor: 280.00,
    dataVencimento: "2026-06-18",
    categoria: "Despesas Operacionais",
    pago: false,
  },
  {
    id: "comp-3",
    descricao: "Fogão Industrial Cozinha Social",
    valor: 320.00,
    dataVencimento: "2026-06-12",
    parcelaAtual: 6,
    totalParcelas: 6,
    categoria: "Conservação e Patrimônio",
    pago: false,
  },
  {
    id: "comp-4",
    descricao: "Seguro Mensal do Templo Porto",
    valor: 1800.00,
    dataVencimento: "2026-06-25",
    categoria: "Despesas Operacionais",
    pago: false,
  },
  {
    id: "comp-5",
    descricao: "Assinatura Zoom Mensal EBD",
    valor: 89.90,
    dataVencimento: "2026-06-10",
    categoria: "Despesas Operacionais",
    pago: true,
  }
];

export default function Dashboard({ 
  workbook, 
  dbState, 
  onNavigateToMonth,
  onAddMovimentacao,
  onSaveFullDB,
  userRole = "admin"
}: DashboardProps) {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(() => {
    // Current month or default to Jan (0) or June (5)
    return 5; // Junho has active mock transactions
  });
  const [chartViewMode, setChartViewMode] = useState<'mixed' | 'bars' | 'area'>('mixed');

  // React state for the visual notification system and financial commitments
  const [compromissos, setCompromissos] = useState<CompromissoFinanceiro[]>(() => {
    return dbState?.compromissos || defaultCompromissos;
  });

  const [newDesc, setNewDesc] = useState('');
  const [newVal, setNewVal] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-06-20');
  const [newCategory, setNewCategory] = useState('Despesas Operacionais');
  const [isInstallments, setIsInstallments] = useState(false);
  const [installmentNum, setInstallmentNum] = useState('2');
  const [installmentTotal, setInstallmentTotal] = useState('5');
  const [showManageSection, setShowManageSection] = useState(false);
  const [paymentSuccessId, setPaymentSuccessId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTabCompromissos, setActiveTabCompromissos] = useState<'pending' | 'paid' | 'all'>('pending');

  const compromissosSerialized = dbState?.compromissos ? JSON.stringify(dbState.compromissos) : '';

  React.useEffect(() => {
    if (dbState?.compromissos) {
      setCompromissos(dbState.compromissos);
    }
  }, [compromissosSerialized]);

  const handleAddCompromisso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim() || !newVal || !newDueDate) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const valueNum = parseFloat(newVal);
    if (isNaN(valueNum) || valueNum <= 0) {
      alert("Por favor, insira um valor válido positivo.");
      return;
    }

    const newComp: CompromissoFinanceiro = {
      id: "comp-" + Date.now().toString(36),
      descricao: newDesc.trim(),
      valor: valueNum,
      dataVencimento: newDueDate,
      categoria: newCategory,
      pago: false,
    };

    if (isInstallments) {
      newComp.parcelaAtual = parseInt(installmentNum) || 1;
      newComp.totalParcelas = parseInt(installmentTotal) || 1;
    }

    const updatedList = [...compromissos, newComp];
    setCompromissos(updatedList);

    if (onSaveFullDB && dbState) {
      setIsSyncing(true);
      try {
        await onSaveFullDB({
          ...dbState,
          compromissos: updatedList
        });
      } catch (err) {
        console.error("Erro ao salvar compromisso:", err);
      } finally {
        setIsSyncing(false);
      }
    }

    // Reset fields
    setNewDesc('');
    setNewVal('');
    setIsInstallments(false);
  };

  const handleDeleteCompromisso = async (id: string) => {
    if (userRole === 'consulta') {
      alert("Seu perfil de consulta não autoriza exclusão de compromissos.");
      return;
    }
    if (!window.confirm("Deseja realmente remover esse compromisso financeiro?")) return;

    const updatedList = compromissos.filter(c => c.id !== id);
    setCompromissos(updatedList);

    if (onSaveFullDB && dbState) {
      setIsSyncing(true);
      try {
        await onSaveFullDB({
          ...dbState,
          compromissos: updatedList
        });
      } catch (err) {
        console.error("Erro ao deletar compromisso:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handlePayCompromisso = async (id: string, launchAsExpense: boolean = true) => {
    if (userRole === 'consulta') {
      alert("Seu perfil de consulta não autoriza registrar pagamentos.");
      return;
    }

    const item = compromissos.find(c => c.id === id);
    if (!item) return;

    setPaymentSuccessId(id);
    setTimeout(() => {
      setPaymentSuccessId(null);
    }, 1500);

    const updatedList = compromissos.map(c => {
      if (c.id === id) return { ...c, pago: true };
      return c;
    });

    setCompromissos(updatedList);

    if (launchAsExpense && onAddMovimentacao) {
      try {
        const dateParts = item.dataVencimento.split('-');
        let mIdx = 5; // Default June
        if (dateParts.length === 3) {
          mIdx = parseInt(dateParts[1]) - 1; // 0-based
        }
        
        await onAddMovimentacao({
          mes: mIdx,
          tipo: 'saida',
          categoria: item.categoria,
          descricao: item.parcelaAtual && item.totalParcelas 
            ? `${item.descricao} (Parc. ${item.parcelaAtual}/${item.totalParcelas})`
            : item.descricao,
          valor: item.valor,
          data: item.dataVencimento
        });
      } catch (err) {
        console.error("Erro ao registrar no fluxo de saídas:", err);
      }
    }

    if (onSaveFullDB && dbState) {
      setIsSyncing(true);
      try {
        await onSaveFullDB({
          ...dbState,
          compromissos: updatedList
        });
      } catch (err) {
        console.error("Erro ao salvar pagamento:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Helper date calculations relative to fixed snapshot today (2026-06-16)
  const refDate = "2026-06-16";

  const getDaysDiff = (dueStr: string) => {
    const dueObj = new Date(dueStr + "T00:00:00");
    const refObj = new Date(refDate + "T00:00:00");
    const diffTime = dueObj.getTime() - refObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Preparar os dados dos últimos 6 meses para dízimos e ofertas (Declared here to respect Rules of Hooks)
  const trendData6Months = React.useMemo(() => {
    if (!workbook || !workbook.meses) return [];
    // Define a 6-month window ending on selectedMonthIndex
    const endIndex = Math.max(5, selectedMonthIndex);
    const startIndex = Math.max(0, endIndex - 5);
    
    return workbook.meses.slice(startIndex, endIndex + 1).map((m) => {
      const dizimos = m.entradasMap["Dízimos"] || 0;
      const ofertas = m.entradasMap["Ofertas Regulares"] || 0;
      return {
        name: m.nome,
        shortName: m.nome.substring(0, 3),
        "Dízimos": dizimos,
        "Ofertas": ofertas,
        "Total": dizimos + ofertas,
      };
    });
  }, [workbook, selectedMonthIndex]);

  if (!workbook) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600 font-medium">Carregando dados financeiros...</span>
      </div>
    );
  }

  const { meses, geral, dizimistasStats } = workbook;
  const curMonth = meses[selectedMonthIndex] || meses[0];

  // Calculate overall balance at end of June (or current total)
  const currentTotalBanco = curMonth.saldoFinalBanco;
  const currentTotalInvest = curMonth.saldoFinalInvest;
  const currentTotalGeral = curMonth.saldoFinalTotal;

  // Calculo de saldos de ministérios para o mês selecionado
  const { ministerios, totalMinisterios } = computeMinistriesBalances(
    dbState?.movimentacoes || [],
    dbState?.configuracoes?.saldosIniciaisMinisterios || {},
    selectedMonthIndex,
    dbState?.configuracoes?.ministerios
  );

  const saldoIgrejaExclusivo = currentTotalGeral - totalMinisterios;

  // Find max value in monthly inflows/outflows to scale the chart beautifully
  const maxFinance = Math.max(
    ...meses.map(m => Math.max(m.entradasTotal || 1, m.saidasTotal || 1)),
    10000
  );

  // Convert months to Recharts-friendly data
  const chartData = meses.map((m, idx) => ({
    name: m.nome.substring(0, 3),
    fullMonthName: m.nome,
    monthIndex: idx,
    "Entradas": m.entradasTotal,
    "Saídas": m.saidasTotal,
    "Saldo Líquido": m.resultadoMensal,
    "Saldo Acumulado": m.saldoFinalTotal,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl shadow-2xl text-[11px] font-mono text-white space-y-2 w-48 z-50">
          <p className="font-bold text-blue-405 font-sans text-xs">{data.fullMonthName}</p>
          <div className="space-y-1">
            <p className="text-emerald-400 flex justify-between">
              <span>Entradas:</span>
              <span className="font-semibold">{formatCurrency(data.Entradas)}</span>
            </p>
            <p className="text-rose-455 flex justify-between">
              <span>Saídas:</span>
              <span className="font-semibold">{formatCurrency(data.Saídas)}</span>
            </p>
            <hr className="border-slate-800/80 my-1" />
            <p className={`flex justify-between ${data["Saldo Líquido"] >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
              <span>Líquido:</span>
              <span className="font-bold">{data["Saldo Líquido"] >= 0 ? "+" : ""}{formatCurrency(data["Saldo Líquido"])}</span>
            </p>
            <p className="text-indigo-400 flex justify-between border-t border-slate-900 pt-1 mt-1">
              <span>Acumulado:</span>
              <span className="font-semibold">{formatCurrency(data["Saldo Acumulado"])}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Process member records for the scatter coordinates
  const dizimistasList = dbState?.dizimistas || [];
  
  const scatterData = dizimistasList.map((d) => {
    const contribs = Array.isArray(d.contribuicoes) ? d.contribuicoes : [];
    const monthsCount = contribs.filter(v => v > 0).length;
    const totalAmount = contribs.reduce((sum, val) => sum + val, 0);
    const averageAmount = monthsCount > 0 ? totalAmount / monthsCount : 0;
    
    return {
      id: d.id,
      nome: d.nome,
      numero: d.numero,
      frequencia: monthsCount, // X axis (0 - 12)
      totalContribuido: totalAmount, // Y axis
      valorMedio: averageAmount, // diameter proxy
      statusLabel: d.ativo ? "Ativo" : "Inativo"
    };
  }).filter(item => item.frequencia > 0 || item.totalContribuido > 0); // focus on actual contributors

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl shadow-2xl text-[11px] font-mono text-white space-y-2 w-56 z-50">
          <p className="font-bold text-blue-400 font-sans text-xs">#{data.numero} - {data.nome}</p>
          <div className="space-y-1">
            <p className="text-slate-300 flex justify-between">
              <span>Status:</span>
              <span className={`font-semibold ${data.statusLabel === 'Ativo' ? 'text-emerald-400' : 'text-slate-400'}`}>{data.statusLabel}</span>
            </p>
            <p className="text-slate-300 flex justify-between">
              <span>Frequência:</span>
              <span className="font-semibold text-white">{data.frequencia} {data.frequencia === 1 ? 'mês' : 'meses'} / 12</span>
            </p>
            <p className="text-emerald-400 flex justify-between">
              <span>Média Mensal:</span>
              <span className="font-semibold">{formatCurrency(data.valorMedio)}</span>
            </p>
            <hr className="border-slate-800/80 my-1" />
            <p className="text-blue-400 flex justify-between">
              <span>Total Anual:</span>
              <span className="font-bold text-white">{formatCurrency(data.totalContribuido)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Hero Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 id="dashboard-welcome-heading" className="text-2xl font-bold text-slate-900 tracking-tight">
            Gestão Financeira & Caixa Consolidado
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Replicação fiel de fórmulas e fluxos das finanças da sua igreja.
          </p>
        </div>
        
        {/* Month Selector for quick overview */}
        <div className="flex items-center space-x-2 shrink-0">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium font-sans">Visualizar Mês:</span>
          <select
            id="dash-month-selector"
            value={selectedMonthIndex}
            onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg font-medium py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MESES_NOMES.map((nome, idx) => (
              <option key={idx} value={idx}>{nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* VISUAL MONITORING: COMPROMISSOS E NOTIFICAÇÃO DE VENCIMENTOS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <Bell className="w-5 h-5 animate-swing" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight flex items-center gap-1.5">
                Central de Contas a Pagar & Parcelas de Compras
                {isSyncing && <span className="text-[10px] bg-blue-50 text-blue-600 font-mono font-medium px-2 py-0.5 rounded animate-pulse">salvando...</span>}
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                Aviso automático de prazos de compras parceladas e obrigações mensais (Hoje: 16 de Junho de 2026).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowManageSection(prev => !prev)}
            className="text-xs bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 px-3.5 py-1.5 rounded-xl font-semibold flex items-center space-x-1.5 cursor-pointer select-none shrink-0 transition-all focus:outline-none"
          >
            <span>{showManageSection ? "Recolher Painel" : "Gerenciar Contas"}</span>
            {showManageSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Dynamic Alerts notification list */}
        <div className="space-y-3">
          {(() => {
            const overdue = compromissos.filter(c => !c.pago && c.dataVencimento < refDate);
            const dueSoon = compromissos.filter(c => !c.pago && c.dataVencimento >= refDate && getDaysDiff(c.dataVencimento) <= 7);
            const totalAlertsCount = overdue.length + dueSoon.length;

            if (totalAlertsCount === 0) {
              return (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center space-x-3.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                    <Check className="w-4 h-4 font-bold" />
                  </div>
                  <div>
                    <span className="font-sans font-bold text-emerald-900 text-xs block">Nenhum alerta de vencimento para os próximos 7 dias!</span>
                    <span className="text-[11px] text-emerald-700 font-sans block mt-0.5">Todos os compromissos cadastrados e parcelamentos estão rigorosamente quitados ou agendados com segurança.</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-2.5">
                {/* Red warning bar for Overdue items */}
                {overdue.length > 0 && (
                  <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 space-y-3 text-left">
                    <div className="flex items-center space-x-2 text-rose-800">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 animate-pulse" />
                      <span className="text-xs font-bold tracking-tight font-sans">Compromissos Financeiros VENCIDOS ({overdue.length}) - Necessita Atenção Urgente</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {overdue.map((c) => {
                        const daysLate = Math.abs(getDaysDiff(c.dataVencimento));
                        return (
                          <div key={c.id} className="bg-white border border-rose-100 rounded-lg p-3 flex justify-between items-center gap-3 shadow-xs">
                            <div className="space-y-1 text-left min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-rose-100 text-rose-800 font-mono text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">
                                  VENCIDO
                                </span>
                                {c.parcelaAtual && c.totalParcelas && (
                                  <span className="text-[10px] font-semibold text-slate-500 font-mono">
                                    ({c.parcelaAtual}/{c.totalParcelas}a Parc.)
                                  </span>
                                )}
                              </div>
                              <p className="font-bold text-slate-800 text-[11px] truncate" title={c.descricao}>{c.descricao}</p>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                <Clock className="w-3 h-3 text-rose-500" />
                                <span className="text-rose-600 font-medium font-sans">Atrasado há {daysLate} {daysLate === 1 ? 'dia' : 'dias'}</span>
                                <span className="text-slate-300 select-none">•</span>
                                <span className="truncate">{c.categoria}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              <p className="font-mono font-bold text-rose-700 text-xs">{formatCurrency(c.valor)}</p>
                              <button
                                type="button"
                                onClick={() => handlePayCompromisso(c.id, true)}
                                className="bg-emerald-500 hover:bg-emerald-600 border border-emerald-400 text-white font-sans text-[10px] font-bold py-1 px-2.5 rounded-md flex items-center space-x-0.5 cursor-pointer"
                              >
                                {paymentSuccessId === c.id ? <Check className="w-3 h-3 animate-ping" /> : <span>Pagar Agora</span>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Orange warning bar for Soon Overdue items */}
                {dueSoon.length > 0 && (
                  <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4 space-y-3 text-left">
                    <div className="flex items-center space-x-2 text-amber-800">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span className="text-xs font-bold tracking-tight font-sans">Contas a Vencer nos Próximos Dias ({dueSoon.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dueSoon.map((c) => {
                        const daysLeft = getDaysDiff(c.dataVencimento);
                        const labelDays = daysLeft === 0 ? "Vence hoje!" : `Vence em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`;
                        const isToday = daysLeft === 0;
                        return (
                          <div key={c.id} className="bg-white border border-amber-100 rounded-lg p-3 flex justify-between items-center gap-3 shadow-xs">
                            <div className="space-y-1 text-left min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-mono text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  isToday ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800"
                                }`}>
                                  {isToday ? "HOJE" : "A VENCER"}
                                </span>
                                {c.parcelaAtual && c.totalParcelas && (
                                  <span className="text-[10px] font-semibold text-slate-500 font-mono">
                                    ({c.parcelaAtual}/{c.totalParcelas}a Parc.)
                                  </span>
                                )}
                              </div>
                              <p className="font-bold text-slate-800 text-[11px] truncate" title={c.descricao}>{c.descricao}</p>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                <Calendar className="w-3 h-3 text-amber-500" />
                                <span className={`${isToday ? "text-amber-600 font-bold" : "text-amber-700 font-medium"} font-sans`}>
                                  {labelDays}
                                </span>
                                <span className="text-slate-300 select-none">•</span>
                                <span className="truncate">{c.categoria}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              <p className="font-mono font-bold text-slate-800 text-xs">{formatCurrency(c.valor)}</p>
                              <button
                                type="button"
                                onClick={() => handlePayCompromisso(c.id, true)}
                                className="bg-emerald-500 hover:bg-emerald-600 border border-emerald-400 text-white font-sans text-[10px] font-bold py-1 px-2.5 rounded-md flex items-center space-x-0.5 cursor-pointer"
                              >
                                {paymentSuccessId === c.id ? <Check className="w-3 h-3 animate-ping" /> : <span>Quitar</span>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Expandable form and list section to fully manage everything */}
        {showManageSection && (
          <div className="pt-4 border-t border-slate-100 space-y-6 animate-fade-in text-xs font-sans">
            
            {/* Split layout: Add Compromisso vs All list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form to add a commitment */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-left">
                <span className="font-bold text-slate-800 tracking-tight flex items-center gap-1">
                  <PlusCircle className="w-4 h-4 text-indigo-500" />
                  <span>Cadastrar Conta ou Parcela</span>
                </span>
                
                <form onSubmit={handleAddCompromisso} className="space-y-3.5 text-left">
                  <div className="space-y-1 block">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Descrição do Compromisso</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Parcela Mesa Secretaria ou Conta Telefônica"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1 block">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="R$ 0,00"
                        value={newVal}
                        onChange={(e) => setNewVal(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono text-slate-800"
                      />
                    </div>
                    
                    <div className="space-y-1 block">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Vencimento</label>
                      <input
                        type="date"
                        required
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 block">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Categoria de Saída</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
                    >
                      <option value="Despesas Operacionais">Despesas Operacionais</option>
                      <option value="Conservação e Patrimônio">Conservação e Patrimônio</option>
                      <option value="Ministérios e Atividades">Ministérios e Atividades</option>
                      <option value="Sustento Pastoral">Sustento Pastoral</option>
                      <option value="Funcionários e Encargos">Funcionários e Encargos</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Outras Saídas">Outras Saídas</option>
                    </select>
                  </div>

                  {/* Installments Checkbox & Options */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center space-x-2 text-slate-700 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInstallments}
                        onChange={(e) => setIsInstallments(e.target.checked)}
                        className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="text-[11px]">Esta compra é parcelada</span>
                    </label>

                    {isInstallments && (
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-white border border-slate-200 rounded-lg animate-fade-in text-slate-800">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Parc. Atual</label>
                          <input
                            type="number"
                            min="1"
                            value={installmentNum}
                            onChange={(e) => setInstallmentNum(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 text-xs font-mono text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Parc. Totais</label>
                          <input
                            type="number"
                            min="1"
                            value={installmentTotal}
                            onChange={(e) => setInstallmentTotal(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 text-xs font-mono text-slate-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {userRole === 'consulta' ? (
                    <div className="text-[10px] text-rose-600 font-medium italic text-center">
                      Apenas administradores ou tesoureiros podem adicionar compromissos.
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-sans py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Adicionar Controle</span>
                    </button>
                  )}
                </form>
              </div>

              {/* List of all commitments (by filtered tabs) */}
              <div className="lg:col-span-2 space-y-3.5 text-left">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex space-x-1 bg-slate-100 p-0.5 rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setActiveTabCompromissos('pending')}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        activeTabCompromissos === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Em aberto ({compromissos.filter(c => !c.pago).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTabCompromissos('paid')}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        activeTabCompromissos === 'paid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Quitados ({compromissos.filter(c => c.pago).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTabCompromissos('all')}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        activeTabCompromissos === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Todos ({compromissos.length})
                    </button>
                  </div>
                  
                  <span className="text-[10px] text-slate-400 font-mono">
                    Snapshot Atualizado
                  </span>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[300px] border border-slate-100 rounded-xl bg-white">
                  {(() => {
                    const filtered = compromissos.filter(c => {
                      if (activeTabCompromissos === 'pending') return !c.pago;
                      if (activeTabCompromissos === 'paid') return c.pago;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-400 italic font-sans">
                          Nenhum compromisso financeiro cadastrado para esse critério de filtro.
                        </div>
                      );
                    }

                    return filtered.map((c) => {
                      const daysDiff = getDaysDiff(c.dataVencimento);
                      return (
                        <div key={c.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                          <div className="space-y-1 block min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`font-mono text-[8.5px] font-bold px-2 py-0.5 rounded ${
                                c.pago 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : daysDiff < 0 
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {c.pago ? 'PAGO' : daysDiff < 0 ? 'VENCIDO' : `VENCE EM ${daysDiff} DIAS`}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                                {c.categoria}
                              </span>
                              {c.parcelaAtual && c.totalParcelas && (
                                <span className="bg-slate-100 text-slate-600 font-mono text-[8.5px] font-semibold px-2 py-0.5 rounded">
                                  Parc. {c.parcelaAtual}/{c.totalParcelas}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-800 text-[12px] truncate" title={c.descricao}>
                              {c.descricao}
                            </h4>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Vencimento: {c.dataVencimento.split('-').reverse().join('/')}</span>
                            </p>
                          </div>

                          <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                            <span className="font-mono font-bold text-slate-800 text-[13px] mr-2">
                              {formatCurrency(c.valor)}
                            </span>
                            
                            <div className="flex space-x-1.5">
                              {!c.pago && (
                                <button
                                  type="button"
                                  onClick={() => handlePayCompromisso(c.id, true)}
                                  className="bg-emerald-500 hover:bg-emerald-600 border border-emerald-400 text-white font-sans text-[10.5px] font-bold py-1 px-3 rounded-lg flex items-center space-x-0.5 cursor-pointer shadow-xs transition-colors"
                                >
                                  {paymentSuccessId === c.id ? <Check className="w-3.5 h-3.5 animate-ping" /> : <span>Quitar</span>}
                                </button>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => handleDeleteCompromisso(c.id)}
                                title="Excluir controle"
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Saldo Consolidado */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-850 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Caixa Consolidado</span>
            <span className="p-1.5 bg-slate-800 rounded-lg text-blue-400"><Landmark className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <h3 id="current-general-balance" className="text-3xl font-bold tracking-tight font-sans">
              {formatCurrency(currentTotalGeral)}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Reflete o fechamento completo do mês de <strong>{curMonth.nome}</strong>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-2 text-xs font-mono">
            <div>
              <span className="text-slate-500 block">Investimentos</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(currentTotalInvest)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Conta Bancária</span>
              <span className="text-blue-400 font-semibold">{formatCurrency(currentTotalBanco)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Fluxo Mensal (selected month) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Fluxo - {curMonth.nome}</span>
            <span className="p-1.5 bg-slate-50 rounded-lg text-slate-500"><Receipt className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Entradas</span>
              <div className="flex items-center text-slate-800 mt-0.5">
                <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-0.5 shrink-0" />
                <span className="text-lg font-bold font-sans">{formatCurrency(curMonth.entradasTotal)}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Saídas</span>
              <div className="flex items-center text-slate-800 mt-0.5">
                <ArrowDownRight className="w-4 h-4 text-rose-500 mr-0.5 shrink-0" />
                <span className="text-lg font-bold font-sans">{formatCurrency(curMonth.saidasTotal)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Resultado Líquido</span>
              <span className={`text-sm font-semibold font-mono ${curMonth.resultadoMensal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {curMonth.resultadoMensal >= 0 ? '+' : ''}{formatCurrency(curMonth.resultadoMensal)}
              </span>
            </div>
            <button
              onClick={() => onNavigateToMonth(selectedMonthIndex)}
              className="text-xs text-blue-600 font-semibold hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>Detalhar Mês</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Estatísticas de Membros */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Dizimistas & Membros</span>
            <span className="p-1.5 bg-slate-50 rounded-lg text-blue-500"><Users className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider font-sans">Cadastrados Ativos</span>
              <span className="text-2xl font-bold text-slate-800 block mt-0.5">{dizimistasStats.contagemAtivos} mem.</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider font-sans">Participação Anual</span>
              <span className="text-2xl font-bold text-slate-800 block mt-0.5">{formatPercent(dizimistasStats.participacaoPercent)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Média Contribuição Mensal:</span>
            <span className="text-slate-800 font-semibold">{formatCurrency(dizimistasStats.mediaContribuicaoMensal)}</span>
          </div>
        </div>

      </div>

      {/* SEÇÃO MINISTÉRIOS INTERNOS E SEPARAÇÃO DE SALDO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-50 pb-4 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Balanço de Ministérios & Recursos Separados ({curMonth.nome})</span>
            </h3>
            <p className="text-xs text-slate-400">
              Separação transparente de capitais: o saldo consolidado da Igreja vs. o saldo livre (fora dos ministérios) e os recursos vinculados dos Ministérios Internos.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full self-start">
            Fórmulas de Sub-caixas Ativas
          </span>
        </div>

        {/* Triple Card comparison group */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">1. Saldo Geral Consolidado</span>
            <span className="text-2xl font-bold text-slate-900 block mt-1 font-mono">{formatCurrency(currentTotalGeral)}</span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Patrimônio bruto total líquido em conta + investimentos (100%).
            </span>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-105">
            <span className="text-[10px] uppercase font-mono tracking-wider text-blue-500 font-bold block">2. Saldo FORA Ministérios (Igreja Livre)</span>
            <span className="text-2xl font-bold text-blue-700 block mt-1 font-mono">{formatCurrency(saldoIgrejaExclusivo)}</span>
            <span className="text-[11px] text-blue-600 block mt-1">
              Recursos próprios livres da Igreja, excluindo o saldo dos ministérios internos.
            </span>
          </div>

          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-150">
            <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-505 font-bold block">3. Saldo Total dos Ministérios</span>
            <span className="text-2xl font-bold text-indigo-700 block mt-1 font-mono">{formatCurrency(totalMinisterios)}</span>
            <span className="text-[11px] text-indigo-600 block mt-1">
              Soma reservada vinculada a todos os {ministerios.length} ministérios.
            </span>
          </div>
        </div>

        {/* Visual progress bar representation of funds allocation */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-sans font-semibold">
            <span className="text-slate-505 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2"></span>
              Livre / Igreja ({((saldoIgrejaExclusivo / (currentTotalGeral || 1)) * 100).toFixed(1)}%)
            </span>
            <span className="text-slate-505 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-2"></span>
              Especial / Ministérios ({((totalMinisterios / (currentTotalGeral || 1)) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden flex">
            <div 
              style={{ width: `${Math.max(0, Math.min(100, (saldoIgrejaExclusivo / (currentTotalGeral || 1)) * 100))}%` }} 
              className="bg-blue-500 transition-all duration-500" 
            />
            <div 
              style={{ width: `${Math.max(0, Math.min(100, (totalMinisterios / (currentTotalGeral || 1)) * 100))}%` }} 
              className="bg-indigo-500 transition-all duration-500" 
            />
          </div>
        </div>

        {/* Small Table / detail cards of each ministry balance */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="py-3 px-4">Ministérios Internos</th>
                <th className="py-3 px-4 text-right">Saldo Inicial (01/Jan)</th>
                <th className="py-3 px-4 text-right text-emerald-600">Entradas acumuladas</th>
                <th className="py-3 px-4 text-right text-rose-500">Saídas acumuladas</th>
                <th className="py-3 px-4 text-right bg-slate-50 font-bold text-slate-800">Saldo atual ({curMonth.nome})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650">
              {ministerios.map((item) => (
                <tr key={item.sigla} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-800 text-[13px]">{item.nome}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">
                    {formatCurrency(item.saldoInicial)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-600 font-medium">
                    +{formatCurrency(item.entradas)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600 font-medium font-sans">
                    -{formatCurrency(item.saidas)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-bold bg-slate-50/50 ${
                    item.saldoAtual >= 0 ? "text-slate-900" : "text-rose-600"
                  }`}>
                    {formatCurrency(item.saldoAtual)}
                  </td>
                </tr>
              ))}
              {/* Table Total footer of ministries balance */}
              <tr className="bg-slate-50 border-t font-semibold">
                <td className="py-3 px-4 font-bold text-slate-800 text-xs">SOMA TOTAL DOS MINISTÉRIOS</td>
                <td className="py-3 px-4 text-right font-mono text-slate-500 text-[11px]">
                  {formatCurrency(ministerios.reduce((sum, item) => sum + item.saldoInicial, 0))}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-600 text-[11px]">
                  +{formatCurrency(ministerios.reduce((sum, item) => sum + item.entradas, 0))}
                </td>
                <td className="py-3 px-4 text-right font-mono text-rose-600 text-[11px]">
                  -{formatCurrency(ministerios.reduce((sum, item) => sum + item.saidas, 0))}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600 bg-indigo-50/20 text-xs border-l border-indigo-100">
                  {formatCurrency(totalMinisterios)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Evolution Chart Row */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 gap-2">
          <div>
            <h3 id="chart-evolution-title" className="text-base font-semibold text-slate-900 tracking-tight">Evolução Mensal & Fluxo Anual</h3>
            <p className="text-xs text-slate-400">Acompanhamento consolidado do fluxo financeiro da Igreja através de gráficos interativos Recharts</p>
          </div>
          
          {/* Chart View Selection controls */}
          <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-xl space-x-1">
            <button
              type="button"
              onClick={() => setChartViewMode('mixed')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                chartViewMode === 'mixed'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Misto (Fluxo vs Acumulado)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('bars')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                chartViewMode === 'bars'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Barras</span>
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('area')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                chartViewMode === 'area'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <AreaIcon className="w-3.5 h-3.5" />
              <span>Áreas</span>
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: '400px' }} className="mt-2">
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              onClick={(state) => {
                if (state && state.activeTooltipIndex !== undefined) {
                  setSelectedMonthIndex(state.activeTooltipIndex);
                }
              }}
            >
              <defs>
                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(val) => `R$ ${(val / 1000).toLocaleString('pt-BR')}k`}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.5 }} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}
              />

              {chartViewMode === 'mixed' && (
                <>
                  <Bar dataKey="Entradas" name="Entradas (Dízimos/Ofertas)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="Saídas" name="Saídas (Operacionais)" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Line 
                    type="monotone" 
                    dataKey="Saldo Acumulado" 
                    name="Caixa Acumulado" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, stroke: '#3b82f6', strokeWidth: 1.5, fill: '#fff' }} 
                    activeDot={{ r: 5 }} 
                  />
                </>
              )}

              {chartViewMode === 'bars' && (
                <>
                  <Bar dataKey="Entradas" name="Entradas (Inflows)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Saídas" name="Saídas (Outflows)" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Line 
                    type="monotone" 
                    dataKey="Saldo Líquido" 
                    name="Resultado Líquido" 
                    stroke="#8b5cf6" 
                    strokeWidth={2} 
                    dot={{ r: 3, stroke: '#8b5cf6', strokeWidth: 1.5, fill: '#fff' }} 
                  />
                </>
              )}

              {chartViewMode === 'area' && (
                <>
                  <Area type="monotone" dataKey="Saldo Acumulado" name="Acumulado" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAcumulado)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Entradas" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Saídas" name="Saídas" stroke="#f43f5e" fillOpacity={1} fill="url(#colorSaidas)" strokeWidth={1.5} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-slate-400 font-semibold text-center mt-3 uppercase tracking-wider font-mono">
          💡 Dica: Clique nas colunas do gráfico para carregar o mês correspondente no card "Resumo Contábil" abaixo
        </p>
      </div>

      {/* Gráfico de Linhas: Tendência de Entrada de Dízimos e Ofertas (Últimos 6 Meses) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm no-print">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 gap-2 border-b border-slate-50 mb-6">
          <div className="space-y-1 flex-1">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span>Tendência de Entrada de Dízimos e Ofertas (Últimos 6 Meses)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Análise comparativa e de crescimento das receitas recorrentes de dízimos e ofertas nos últimos 6 meses, considerando o mês de {curMonth.nome} como ponto final.
            </p>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 font-sans shrink-0">
            Média do Período: <span className="font-bold text-slate-950">
              {formatCurrency(
                trendData6Months.reduce((sum, d) => sum + d.Total, 0) / (trendData6Months.length || 1)
              )}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chart visual area */}
          <div className="lg:col-span-3 space-y-2">
            <div style={{ width: '100%', height: '320px' }}>
              {trendData6Months.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full bg-slate-50 border border-dashed border-slate-150 rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-slate-400">Dados insuficientes para gerar a tendência.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData6Months} margin={{ top: 15, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="shortName"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(val) => `R$ ${(val / 1000).toLocaleString('pt-BR')}k`}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl shadow-2xl text-[11px] font-mono text-white space-y-2 w-48 z-50">
                              <p className="font-bold text-blue-400 font-sans text-xs">{data.name}</p>
                              <div className="space-y-1">
                                <p className="text-emerald-400 flex justify-between">
                                  <span>Dízimos:</span>
                                  <span className="font-semibold">{formatCurrency(data["Dízimos"])}</span>
                                </p>
                                <p className="text-blue-405 flex justify-between">
                                  <span>Ofertas:</span>
                                  <span className="font-semibold">{formatCurrency(data["Ofertas"])}</span>
                                </p>
                                <hr className="border-slate-800/80 my-1" />
                                <p className="text-purple-400 flex justify-between font-bold">
                                  <span>Total:</span>
                                  <span>{formatCurrency(data["Total"])}</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Dízimos"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: '#10b981', strokeWidth: 1.5, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Ofertas"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 1.5, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Total"
                      name="Dízimos + Ofertas"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, stroke: '#8b5cf6', strokeWidth: 1, fill: '#fff' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Stats Column */}
          <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-150 text-xs font-sans flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block font-mono">Resumo do Período</span>
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500">Total Dízimos:</span>
                  <span className="font-semibold text-slate-850 font-mono">
                    {formatCurrency(trendData6Months.reduce((sum, d) => sum + d["Dízimos"], 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500">Total Ofertas:</span>
                  <span className="font-semibold text-slate-850 font-mono">
                    {formatCurrency(trendData6Months.reduce((sum, d) => sum + d["Ofertas"], 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-indigo-700">
                  <span>Soma Total:</span>
                  <span className="font-mono">
                    {formatCurrency(trendData6Months.reduce((sum, d) => sum + d["Total"], 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-[11px] text-blue-750">
              <span className="font-bold block mb-1">💡 Indicador de Saúde</span>
              A estabilidade do dízimo e das ofertas regulares permite à Igreja planejar investimentos em atividades missionárias de forma previsível e segura.
            </div>
          </div>
        </div>
      </div>

      {/* Visualização de Frequência de Distribuição (Scatter Plot) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm no-print">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 gap-2 border-b border-slate-50 mb-6">
          <div className="space-y-1 flex-1">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Target className="w-5 h-5 text-indigo-500" />
              <span>Análise de Frequência de Contribuição dos Membros</span>
            </h3>
            <p className="text-xs text-slate-400">
              Mapeamento de consistência anual: Cruzamento entre a frequência de contribuições (número de meses com dízimo) e o valor total acumulado.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono font-bold">
            <span className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Excelente (10-12 meses)</span>
            </span>
            <span className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Regular (6-9 meses)</span>
            </span>
            <span className="flex items-center space-x-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Ocasional (1-5 meses)</span>
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Chart column */}
          <div className="space-y-2">
            <div style={{ width: '100%', height: '350px' }}>
              {scatterData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full bg-slate-50 border border-dashed border-slate-150 rounded-xl p-4 text-center" style={{ height: '350px' }}>
                  <p className="text-xs font-medium text-slate-400">Nenhum registro de dízimo disponível no estado atual do banco de dados.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={290}>
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      type="number"
                      dataKey="frequencia"
                      name="Frequência"
                      unit=" meses"
                      domain={[0, 12]}
                      ticks={[0, 2, 4, 6, 8, 10, 12]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="totalContribuido"
                      name="Total Contribuído"
                      tickFormatter={(v) => `${v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <ZAxis type="number" dataKey="valorMedio" range={[80, 500]} />
                    <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Dizimistas" data={scatterData}>
                      {scatterData.map((entry, index) => {
                        let fill = '#f59e0b';
                        if (entry.frequencia >= 10) fill = '#10b981';
                        else if (entry.frequencia >= 6) fill = '#3b82f6';
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={fill} 
                            stroke="#ffffff" 
                            strokeWidth={1.5} 
                            fillOpacity={0.8} 
                            className="transition-all duration-300 hover:fill-opacity-100 cursor-pointer"
                          />
                        );
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div className="text-[10px] text-slate-400 flex justify-between font-mono bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <span>⬅️ Menor Frequência (Esporádica)</span>
              <span>O tamanho da bolha representa a média mensal de contribuição 🔵</span>
              <span>Maior Frequência (Fiel / Acumulada) ➡️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Summary Table for the selected month */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
          <h3 id="summary-month-ledgers-title" className="text-base font-semibold text-slate-900 tracking-tight">
            Resumo Contábil - Mês de <strong>{curMonth.nome}</strong>
          </h3>
          <div className="text-xs text-slate-500">
            Todos os totais atualizam automaticamente via fórmulas Excel integradas.
          </div>
        </div>

        {/* Layout details of Saldo Anterior, Movimentos, Saldo Final */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 text-sm font-sans">
          
          {/* Section A: Saldo Anterior */}
          <div className="p-6">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 font-mono mb-4">Saldo Anterior</h4>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Contas Bancárias:</span>
                <span className="text-slate-700 font-mono font-medium">{formatCurrency(curMonth.saldoAnteriorBanco)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Investimentos:</span>
                <span className="text-slate-700 font-mono font-medium">{formatCurrency(curMonth.saldoAnteriorInvest)}</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-dashed border-slate-100 font-bold">
                <span className="text-slate-800">Total Inicial:</span>
                <span className="text-blue-600 font-mono">{formatCurrency(curMonth.saldoAnteriorTotal)}</span>
              </div>
            </div>
          </div>

          {/* Section B: Movimentação consolidada do mês */}
          <div className="p-6">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 font-mono mb-4">Movimentação do Mês</h4>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Dízimos Cadastrados:</span>
                <span className="text-emerald-600 font-mono font-medium">+{formatCurrency(curMonth.entradasMap["Dízimos"])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outras Entradas:</span>
                <span className="text-emerald-600 font-mono font-medium">+{formatCurrency(curMonth.entradasTotal - curMonth.entradasMap["Dízimos"])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Saídas:</span>
                <span className="text-rose-600 font-mono font-medium">-{formatCurrency(curMonth.saidasTotal)}</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-dashed border-slate-100 font-bold">
                <span className="text-slate-800">Resultado Líquido:</span>
                <span className={`font-mono ${curMonth.resultadoMensal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {curMonth.resultadoMensal >= 0 ? "+" : ""}{formatCurrency(curMonth.resultadoMensal)}
                </span>
              </div>
            </div>
          </div>

          {/* Section C: Saldo Final */}
          <div className="p-6">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 font-mono mb-4">Saldo Final</h4>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Contas Bancárias:</span>
                <span className="text-slate-700 font-mono font-medium">{formatCurrency(curMonth.saldoFinalBanco)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Investimentos:</span>
                <span className="text-slate-700 font-mono font-medium">{formatCurrency(curMonth.saldoFinalInvest)}</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-dashed border-slate-100 font-bold">
                <span className="text-slate-800">Total Final do Mês:</span>
                <span className="text-blue-600 font-mono">{formatCurrency(curMonth.saldoFinalTotal)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
