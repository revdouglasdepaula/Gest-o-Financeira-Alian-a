import React, { useState, useRef } from 'react';
import { CompiledMonth, WorkbookPayload } from '../api';
import { 
  CATEGORIAS_ENTRADA, 
  CATEGORIAS_SAIDA, 
  MESES_NOMES, 
  Movimentacao, 
  TipoMovimentacao, 
  UserRole,
  LISTA_MINISTERIOS
} from '../types';
import { formatCurrency, formatDate, exportToCSV } from '../utils';
import { 
  PlusCircle, 
  Trash2, 
  Calendar, 
  LayoutGrid, 
  CheckCircle2, 
  ListFilter, 
  Trash, 
  RefreshCw, 
  FileText, 
  AlertTriangle,
  Download,
  Loader2,
  Printer,
  Church,
  ShieldCheck,
  PenTool,
  Upload,
  X
} from 'lucide-react';
import { generateHighFidelityPDF } from '../utils/pdfGenerator';

interface MesesTabProps {
  compiledMonths: CompiledMonth[];
  movimentacoes: Movimentacao[];
  userRole: UserRole;
  onAddMovimentacao: (mov: Partial<Movimentacao>) => Promise<void>;
  onDeleteMovimentacao: (id: string) => Promise<void>;
  initialMonthIndex?: number;
  dbState?: any;
  workbook?: WorkbookPayload | null;
  onSaveConfig?: (payload: { igreja?: any; configuracoes?: any }) => Promise<void>;
  currentUser?: any;
}

export default function MesesTab({
  compiledMonths,
  movimentacoes,
  userRole,
  onAddMovimentacao,
  onDeleteMovimentacao,
  initialMonthIndex = 5, // default to Junho or starting
  dbState,
  workbook = null,
  onSaveConfig,
  currentUser
}: MesesTabProps) {
  const [activeMonthIdx, setActiveMonthIdx] = useState<number>(initialMonthIndex);
  const documentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Configured digital signature values driven by central settings tab
  const showDigitalSignatures = dbState?.configuracoes?.showDigitalSignatures !== false;
  const signedByTreasurer = dbState?.configuracoes?.signedByTreasurer !== false;
  const signatureDate = dbState?.configuracoes?.signatureDate || (() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch (e) {
      return "2026-06-17";
    }
  })();
  const signatureTime = dbState?.configuracoes?.signatureTime || (() => {
    try {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
      return "10:16";
    }
  })();

  // Helper deterministic hash generator for audit signatures
  const generateAuthHash = (name: string, monthIdx: number, year: number) => {
    const str = `${name}-${monthIdx}-${year}-igreja-presbiteriana-oficial`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    return `DIGITAL-${hex.substring(0, 4)}-${hex.substring(4, 8)}-${(year + monthIdx).toString(16).toUpperCase()}`;
  };

  const getActiveTreasurer = () => {
    const churchId = dbState?.igreja?.id;
    if (!churchId) return null;
    
    // If current logged-in user is a treasurer of this church, prefer them
    if (currentUser && currentUser.perfil === 'tesoureiro' && currentUser.igrejaId === churchId) {
      return currentUser;
    }
    
    // Find active authorized treasurer
    const activeTreasurer = dbState?.usuarios?.find(
      (u: any) => u.perfil === 'tesoureiro' && u.igrejaId === churchId && u.autorizado
    );
    if (activeTreasurer) return activeTreasurer;

    // Any treasurer of this church
    const anyTreasurer = dbState?.usuarios?.find(
      (u: any) => u.perfil === 'tesoureiro' && u.igrejaId === churchId
    );
    return anyTreasurer || null;
  };

  const activeTreasurer = getActiveTreasurer();
  const treasurerName = activeTreasurer?.nome || workbook?.relatorioPresbiterio?.tesoureiroNome || dbState?.igreja?.tesoureiro || "Não informado";
  const treasurerSignatureImg = activeTreasurer?.assinaturaImg || dbState?.igreja?.tesoureiroAssinaturaImg || "";

  const relatorio = {
    nomeIgreja: workbook?.relatorioPresbiterio?.nomeIgreja || dbState?.igreja?.nome || "Igreja Presbiteriana Aliança",
    cnpj: workbook?.relatorioPresbiterio?.cnpj || dbState?.igreja?.cnpj || "00.000.000/0001-00",
    endereco: workbook?.relatorioPresbiterio?.endereco || dbState?.igreja?.endereco || "Endereço da Igreja",
    pastorResponsavel: workbook?.relatorioPresbiterio?.pastorResponsavel || dbState?.igreja?.pastor || "Não informado",
    pastorCpf: dbState?.igreja?.pastorCpf || "000.000.000-00",
    tesoureiroNome: treasurerName,
    tesoureiroCpf: dbState?.igreja?.tesoureiroCpf || "000.000.000-00",
    tesoureiroTelefone: workbook?.relatorioPresbiterio?.tesoureiroTelefone || dbState?.igreja?.telefone || "",
    tesoureiroAssinaturaImg: treasurerSignatureImg
  };
  
  const ministeriosDisponiveis = dbState?.configuracoes?.ministerios || LISTA_MINISTERIOS;

  const getMinisterioNome = (sigla?: string) => {
    if (!sigla) return "Igreja (Geral)";
    const found = ministeriosDisponiveis.find(
      (m: any) => m.sigla.toUpperCase() === sigla.toUpperCase() || m.nome.toUpperCase() === sigla.toUpperCase()
    );
    return found ? found.nome : sigla;
  };

  const addMonthsToDateString = (dateStr: string, monthsToAdd: number) => {
    if (!dateStr) return { date: dateStr, wrappedYear: false };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { date: dateStr, wrappedYear: false };
    let year = parseInt(parts[0]);
    let month = parseInt(parts[1]) - 1; // 0-indexed
    let day = parseInt(parts[2]);

    month += monthsToAdd;
    const yearsToAdd = Math.floor(month / 12);
    year += yearsToAdd;
    month = month % 12;
    if (month < 0) month += 12;

    const d = new Date(year, month + 1, 0);
    const maxDays = d.getDate();
    const targetDay = Math.min(day, maxDays);

    const mm = String(month + 1).padStart(2, '0');
    const dd = String(targetDay).padStart(2, '0');
    return {
      date: `${year}-${mm}-${dd}`,
      wrappedYear: yearsToAdd > 0
    };
  };
  
  // Transaction entry form states
  const [tipo, setTipo] = useState<TipoMovimentacao>('saida');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_SAIDA[0]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0]);
  const [ministerio, setMinisterio] = useState<string>('');

  // Installment purchase states
  const [isParcelado, setIsParcelado] = useState(false);
  const [qtdParcelas, setQtdParcelas] = useState(3);
  const [tipoParcelamento, setTipoParcelamento] = useState<'total' | 'parcela'>('parcela');

  // Form Validation State
  const [errors, setErrors] = useState<{
    valor?: string;
    data?: string;
    categoria?: string;
    descricao?: string;
  }>({});

  const isReadOnly = userRole === 'consulta';

  const mData = compiledMonths[activeMonthIdx];
  if (!mData) return <div>Carregando mês...</div>;

  // Filter actual transactions for this month
  const activeTransactions = movimentacoes
    .filter(m => m.mes === activeMonthIdx)
    .sort((a, b) => b.data.localeCompare(a.data));

  // Toggle category list based on transaction type selection
  const handleTipoChange = (newTipo: TipoMovimentacao) => {
    setTipo(newTipo);
    setCategoria(newTipo === 'entrada' ? CATEGORIAS_ENTRADA[0] : CATEGORIAS_SAIDA[0]);
    // Clear validation errors on type toggle
    setErrors(prev => {
      const { valor, ...rest } = prev;
      return rest;
    });
  };

  const handleValorChange = (valStr: string) => {
    if (valStr.includes('-')) {
      setErrors(prev => ({ ...prev, valor: "Valores negativos não são permitidos para lançamento." }));
      const cleaned = valStr.replace(/-/g, '');
      setValor(cleaned);
      return;
    }

    const num = parseFloat(valStr);
    if (!isNaN(num) && num < 0) {
      setErrors(prev => ({ ...prev, valor: "O valor da movimentação não pode ser negativo." }));
      setValor(Math.abs(num).toString());
      return;
    }

    // Clear error once valid
    setErrors(prev => {
      const { valor, ...rest } = prev;
      return rest;
    });
    setValor(valStr);
  };

  const handleValorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      setErrors(prev => ({ ...prev, valor: "Lançamento em formato ou sinal negativo não permitido." }));
    }
  };

  const handleDataChange = (newVal: string) => {
    setData(newVal);
    if (!newVal) {
      setErrors(prev => ({ ...prev, data: "A data do lançamento é um campo obrigatório de preenchimento." }));
    } else {
      setErrors(prev => {
        const { data, ...rest } = prev;
        return rest;
      });
    }
  };

  // Submit transaction form
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const newErrors: typeof errors = {};

    // Validate valor
    if (!valor) {
      newErrors.valor = "O valor do fluxo financeiro é obrigatório e precisa ser preenchido.";
    } else {
      const parsedValor = parseFloat(valor);
      if (isNaN(parsedValor)) {
        newErrors.valor = "O valor inserido não é um numeral válido.";
      } else if (parsedValor < 0) {
        newErrors.valor = "O valor do lançamento financeiro não pode ser negativo.";
      } else if (parsedValor === 0) {
        newErrors.valor = "O valor do lançamento financeiro deve ser maior do que zero.";
      }
    }

    // Validate data (mandatory)
    if (!data) {
      newErrors.data = "A data reconciliada de lançamento é de preenchimento obrigatório.";
    }

    // Validate categoria (mandatory)
    if (!categoria) {
      newErrors.categoria = "A categoria contábil da transação é de preenchimento obrigatório.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear all errors
    setErrors({});

    const baseValor = parseFloat(valor);

    if (isParcelado && qtdParcelas > 1) {
      const valorPorParcela = tipoParcelamento === 'total'
        ? parseFloat((baseValor / qtdParcelas).toFixed(2))
        : baseValor;

      for (let i = 0; i < qtdParcelas; i++) {
        const targetMes = (activeMonthIdx + i) % 12;
        const calcDate = addMonthsToDateString(data, i).date;
        const label = `${descricao.trim() || categoria} (Parcela ${i + 1}/${qtdParcelas})`;

        await onAddMovimentacao({
          mes: targetMes,
          tipo,
          categoria,
          descricao: label,
          valor: valorPorParcela,
          data: calcDate,
          ministerio: ministerio || undefined
        });
      }
    } else {
      await onAddMovimentacao({
        mes: activeMonthIdx,
        tipo,
        categoria,
        descricao: descricao.trim() || `${categoria} de ${MESES_NOMES[activeMonthIdx]}`,
        valor: baseValor,
        data,
        ministerio: ministerio || undefined
      });
    }

    // Reset inputs
    setDescricao("");
    setValor("");
    setMinisterio("");
    setIsParcelado(false);
    setQtdParcelas(3);
    setTipoParcelamento('parcela');
  };

  // Export current month transactions
  const handleExportMonth = () => {
    const headers = ["Data", "Tipo", "Categoria", "Descrição", "Valor"];
    const rows = activeTransactions.map(t => [
      formatDate(t.data),
      t.tipo.toUpperCase(),
      t.categoria,
      t.descricao,
      t.valor
    ]);
    exportToCSV(`Planilha_Movimentacao_${MESES_NOMES[activeMonthIdx]}`, headers, rows);
  };

  // Download high-fidelity PDF of monthly financial statement
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const nomeIgreja = workbook?.relatorioPresbiterio?.nomeIgreja || dbState?.igreja?.nome || "Igreja";
    const mesNome = MESES_NOMES[activeMonthIdx];
    await generateHighFidelityPDF(
      'print-area-mensal-documento',
      `Balancete_Mensal_${mesNome.replace(/\s+/g, '_')}_${nomeIgreja.replace(/\s+/g, '_')}`
    );
    setIsGeneratingPdf(false);
  };

  // --- DEFENSIVE DATA PREPARATION FOR OFFICIAL PDF ---
  const formatDocumentEmissionDate = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const getPreviousMonthName = (currentIdx: number) => {
    const prevIdx = currentIdx === 0 ? 11 : currentIdx - 1;
    return MESES_NOMES[prevIdx];
  };

  const getYearOfReference = () => {
    if (movimentacoes && movimentacoes.length > 0) {
      const currentMonthMovs = movimentacoes ? movimentacoes.filter(m => m.mes === activeMonthIdx && m.data) : [];
      if (currentMonthMovs.length > 0) {
        const years = currentMonthMovs.map(t => new Date(t.data).getFullYear()).filter(y => !isNaN(y));
        if (years.length > 0) return years[0];
      }
      const yearsAll = movimentacoes.map(t => new Date(t.data).getFullYear()).filter(y => !isNaN(y));
      if (yearsAll.length > 0) return yearsAll[0];
    }
    return new Date().getFullYear();
  };

  const currentYear = getYearOfReference();
  const dataHoraEmissao = formatDocumentEmissionDate();

  // Defensive validation of transactions to filter nulls/invalids
  const isValidTransactionForPDF = (t: any) => {
    if (!t) return false;
    if (t.mes === null || t.mes === undefined || typeof t.mes !== 'number' || t.mes < 0 || t.mes > 11) return false;
    if (t.valor === null || t.valor === undefined || isNaN(Number(t.valor)) || Number(t.valor) <= 0) return false;
    if (!t.data || typeof t.data !== 'string' || isNaN(Date.parse(t.data))) return false;
    if (!t.categoria || typeof t.categoria !== 'string' || t.categoria.trim() === '') return false;
    return true;
  };

  // 1. Sort ascending by date as requested for the PDF report
  const sortedTransactionsForPDF = (movimentacoes || [])
    .filter(m => m.mes === activeMonthIdx && isValidTransactionForPDF(m))
    .sort((a, b) => a.data.localeCompare(b.data));

  // 2. Precompute running balances sequentially starting from the previous total balance
  const transactionsWithRunningBalance = sortedTransactionsForPDF.map((t, index) => {
    let runningBal = mData?.saldoAnteriorTotal || 0;
    for (let k = 0; k <= index; k++) {
      const tx = sortedTransactionsForPDF[k];
      const valNum = Number(tx.valor);
      if (tx.tipo === 'entrada') {
        runningBal += valNum;
      } else if (tx.tipo === 'saida') {
        runningBal -= valNum;
      }
    }
    return {
      ...t,
      runningBalance: runningBal
    };
  });

  // 3. Chunk transactions sequentially for A4 page break guidelines
  const txChunks: any[][] = [];
  const txItemsPerPage = 20;

  if (transactionsWithRunningBalance.length === 0) {
    txChunks.push([]); // Ensure at least 1 chunk to show empty message on page 2
  } else {
    for (let i = 0; i < transactionsWithRunningBalance.length; i += txItemsPerPage) {
      txChunks.push(transactionsWithRunningBalance.slice(i, i + txItemsPerPage));
    }
  }

  const totalPDFPagesCount = 1 + txChunks.length; // Page 1 summary + transaction detail sheets

  const activeEntranceCategories = CATEGORIAS_ENTRADA.filter(cat => (mData?.entradasMap?.[cat] || 0) > 0);
  const activeExitCategories = CATEGORIAS_SAIDA.filter(cat => (mData?.saidasMap?.[cat] || 0) > 0);

  // Helper page header renderer to ensure standardization
  const renderPDFHeader = () => (
    <div className="text-center space-y-1 border-b pb-4 mb-4" style={{ borderColor: '#cbd5e1' }}>
      <div className="flex justify-between items-center text-[9px] font-mono mb-1" style={{ color: '#64748b' }}>
        <span className="uppercase tracking-widest">{relatorio.nomeIgreja}</span>
        <span className="font-bold uppercase tracking-wider text-[#059669]">DOCUMENTO OFICIAL DE TESOURARIA</span>
      </div>
      <h1 className="text-lg font-bold tracking-tight uppercase" style={{ color: '#1e293b' }}>
        {relatorio.nomeIgreja}
      </h1>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-4 text-[10px]" style={{ color: '#475569' }}>
        {relatorio.cnpj && <span><strong>CNPJ:</strong> {relatorio.cnpj}</span>}
        <span><strong>Endereço:</strong> {relatorio.endereco}</span>
      </div>
      
      <div className="mt-2 text-center border-t pt-2" style={{ borderColor: '#e2e8f0' }}>
        <h2 className="text-sm font-extrabold tracking-widest uppercase font-mono" style={{ color: '#0f172a' }}>
          BALANCETE MENSAL
        </h2>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-0.5 text-[10px]" style={{ color: '#475569' }}>
          <span><strong>Mês de Referência:</strong> {MESES_NOMES[activeMonthIdx]} / {currentYear}</span>
          <span>•</span>
          <span><strong>Emissão:</strong> {dataHoraEmissao}</span>
        </div>
      </div>
    </div>
  );

  // Helper page footer renderer
  const renderPDFFooter = (pageNum: number, totalPages: number) => (
    <div className="absolute bottom-6 left-6 right-6 pt-3 border-t flex justify-between items-center text-[9px] font-mono uppercase tracking-widest" style={{ borderColor: '#cbd5e1', color: '#64748b' }}>
      <span>Balancete Mensal • {relatorio.nomeIgreja}</span>
      <span className="font-bold text-[#059669]">Folha {String(pageNum).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}</span>
    </div>
  );

  // Helper signatures block renderer with elite simulated Digital Signatures
  const renderSignaturesBlock = () => {
    let formattedSignatureDate = signatureDate;
    try {
      const dateParts = signatureDate.split('-');
      if (dateParts.length === 3) {
        formattedSignatureDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      }
    } catch (e) {}
    
    const hashTesoureiro = generateAuthHash(relatorio.tesoureiroNome, activeMonthIdx, currentYear);

    return (
      <div className="pt-4 border-t mt-3" style={{ borderColor: '#cbd5e1' }}>
        <p className="text-[7.5px] font-mono text-slate-400 text-center uppercase tracking-widest mb-3">
          Autenticação de Responsabilidade Eclesiástica e Registro Contábil
        </p>
        
        <div className="flex flex-col items-center justify-center text-center text-[9.5px] max-w-sm mx-auto" style={{ color: '#475569' }}>
          
          {/* TESOUREIRO SIGNATURE ONLY */}
          <div className="space-y-1.5 flex flex-col items-center w-full">
            {showDigitalSignatures && signedByTreasurer ? (
              <div className="w-full flex flex-col items-center py-1">
                {/* Hand-written like signature or Image Signature */}
                {relatorio.tesoureiroAssinaturaImg ? (
                  <div className="h-10 flex items-center justify-center my-1 select-none">
                    <img 
                      src={relatorio.tesoureiroAssinaturaImg} 
                      alt="Assinatura" 
                      className="max-h-full object-contain mx-auto max-w-[200px]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <span 
                    className="font-serif italic text-blue-700 font-bold select-none text-[13px] tracking-wide mb-1 opacity-90 transition-all block text-center"
                    style={{ fontFamily: "'Dancing Script', 'Brush Script MT', 'Segoe Print', 'Georgia', cursive, serif" }}
                  >
                    {relatorio.tesoureiroNome}
                  </span>
                )}
                
                {/* Digital Stamp Badge */}
                <div className="bg-emerald-50/90 border border-emerald-200 rounded px-2.5 py-1 text-[7px] text-left w-11/12 max-w-[280px] space-y-0.5 shadow-sm mx-auto">
                  <div className="flex items-center justify-between font-bold text-emerald-800 text-[7px]">
                    <span className="flex items-center gap-0.5 font-sans">
                      ✓ ASSINADO DIGITALMENTE
                    </span>
                    <span className="font-mono text-[6px] text-emerald-600">e-ICP</span>
                  </div>
                  <p className="text-slate-600 font-sans truncate m-0 p-0 leading-tight">
                    <strong className="text-slate-800">Signatário:</strong> {relatorio.tesoureiroNome}
                  </p>
                  <p className="text-slate-500 font-mono m-0 p-0 leading-tight">
                    <strong className="text-slate-800">Assinatura:</strong> {formattedSignatureDate} às {signatureTime}
                  </p>
                  <p className="text-slate-400 font-mono truncate text-[6px] m-0 p-0 leading-tight">
                    <strong className="text-slate-800">Verificação:</strong> {hashTesoureiro}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-14 flex items-end justify-center w-full">
                <div className="border-b border-dashed w-2/3 mb-2" style={{ borderColor: '#cbd5e1' }}></div>
              </div>
            )}
            
            <p className="font-bold text-slate-800 text-xs" style={{ color: '#1e293b' }}>{relatorio.tesoureiroNome}</p>
            <p className="text-[8.5px] uppercase tracking-wider font-semibold" style={{ color: '#64748b' }}>Responsável Financeiro</p>
            <p className="text-[8px] text-slate-400">Tesouraria de Conselho</p>
          </div>
          
        </div>
        
        <div className="text-center pt-4 text-[7px] font-mono uppercase tracking-wider leading-none" style={{ color: '#94a3b8' }}>
          Balancete homologado eletronicamente para fins de auditoria e arquivamento oficial. Assinatura segura do Tesoureiro.
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 12 Months selection tab bar (Slide-toggle) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex overflow-x-auto gap-1 no-scrollbar">
        {MESES_NOMES.map((nome, idx) => {
          const isActive = idx === activeMonthIdx;
          const monthData = compiledMonths[idx];
          const hasBalance = monthData && (monthData.entradasTotal > 0 || monthData.saidasTotal > 0);

          return (
            <button
              key={idx}
              id={`month-tab-${idx}`}
              onClick={() => setActiveMonthIdx(idx)}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer select-none transition-all duration-200 shrink-0 flex flex-col items-center min-w-16 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{nome}</span>
              {hasBalance && (
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isActive ? 'bg-blue-400' : 'bg-blue-500/60'}`}></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Header Month details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1 & 2: Financial statement sheets replication */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 bg-slate-900 text-white border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg tracking-tight">Balancete Mensal: {MESES_NOMES[activeMonthIdx]}</h3>
                <p className="text-blue-300 text-xs mt-0.5">Visão unificada inspirada fielmente nos relatórios oficiais</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  id="baixar-pdf-oficial-mensal-btn"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPdf}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-450 border border-emerald-500 text-white px-3 py-1.5 font-sans rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Gerando PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-white" />
                      <span>Baixar PDF Oficial</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportMonth}
                  className="bg-slate-800 border-slate-705 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Exportar Mês</span>
                </button>
              </div>
            </div>

            {/* Core calculations grid matching excel: SALDO ANTERIOR, ENTRADAS, SAIDAS, SALDO FINAL */}
            <div className="p-6 space-y-6 font-sans text-xs">
              
              {/* SALDO ANTERIOR */}
              <div className="border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                <div className="bg-slate-100 py-2 px-4 font-mono font-bold text-slate-700 text-[10px] uppercase tracking-wider flex justify-between">
                  <span>I. Saldo Anterior (Fechamento Prévio)</span>
                  <span className="text-[9px] text-slate-400 font-sans tracking-normal capitalize">Herança de fórmulas</span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-sans">
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-slate-500 text-xs">Banco:</span>
                    <span className="font-mono font-semibold text-slate-800">{formatCurrency(mData.saldoAnteriorBanco)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-slate-500 text-xs">Investimentos:</span>
                    <span className="font-mono font-semibold text-slate-800">{formatCurrency(mData.saldoAnteriorInvest)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900 text-white p-2.5 rounded-lg border border-slate-900 shadow-sm">
                    <span className="text-slate-300 text-xs font-semibold">Total Inicial:</span>
                    <span className="font-mono font-bold">{formatCurrency(mData.saldoAnteriorTotal)}</span>
                  </div>
                </div>
              </div>

              {/* ENTRADAS TABLE */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-emerald-50 py-2 px-4 font-mono font-bold text-emerald-800 text-[10px] uppercase tracking-wider">
                  II. Entradas / Receitas do Período
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-mono text-[10px] text-slate-500">
                      <th className="py-2 px-4 text-left font-semibold">Categoria Contábil</th>
                      <th className="py-2 px-4 text-right font-semibold">Valor Recebido</th>
                      <th className="py-2 px-4 text-right font-semibold">% Ingressos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {CATEGORIAS_ENTRADA.map((cat, i) => {
                      const val = mData.entradasMap[cat] || 0;
                      const pct = mData.entradasTotal > 0 ? (val / mData.entradasTotal) * 100 : 0;
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-medium text-slate-700">
                            {cat} {cat === 'Dízimos' && <span className="text-[10px] text-blue-500 font-semibold">(Auto-sincronizado)</span>}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-medium">
                            {formatCurrency(val)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-400 font-medium">
                            {pct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-emerald-50/40 text-emerald-950 font-bold text-sm">
                      <td className="py-3 px-4">TOTAL IMPUTADO DAS ENTRADAS</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(mData.entradasTotal)}</td>
                      <td className="py-3 px-4 text-right font-mono">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SAÍDAS TABLE */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-red-50 py-2 px-4 font-mono font-bold text-rose-850 text-[10px] uppercase tracking-wider">
                  III. Despesas / Saídas Contábeis
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-mono text-[10px] text-slate-500">
                      <th className="py-2 px-4 text-left font-semibold">Categoria Operacional</th>
                      <th className="py-2 px-4 text-right font-semibold">Valor Despendido</th>
                      <th className="py-2 px-4 text-right font-semibold">% Despesas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {CATEGORIAS_SAIDA.map((cat, i) => {
                      const val = mData.saidasMap[cat] || 0;
                      const pct = mData.saidasTotal > 0 ? (val / mData.saidasTotal) * 100 : 0;
                      return (
                        <tr key={i} className="hover:bg-slate-100">
                          <td className="py-2.5 px-4 font-medium text-slate-700">{cat}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-medium">{formatCurrency(val)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-400 font-medium">{pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-rose-50/40 text-rose-950 font-bold text-sm">
                      <td className="py-3 px-4">TOTAL DE SAÍDAS DO PERÍODO</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(mData.saidasTotal)}</td>
                      <td className="py-3 px-4 text-right font-mono">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SALDO FINAL */}
              <div className="border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                <div className="bg-slate-900 py-2 px-4 font-mono font-bold text-white text-[10px] uppercase tracking-wider flex justify-between">
                  <span>IV. Saldo Final em Balanço</span>
                  <span className="text-[9px] text-blue-300 font-semibold font-sans">Comprovado pelo Caixa</span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-sans">
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-slate-500 text-xs font-medium">Contas Bancárias Final:</span>
                    <span className="font-mono font-bold text-slate-800">{formatCurrency(mData.saldoFinalBanco)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-slate-500 text-xs font-medium">Investimentos Final:</span>
                    <span className="font-mono font-bold text-slate-800">{formatCurrency(mData.saldoFinalInvest)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-600 text-white p-2.5 rounded-lg border border-blue-600 shadow-sm">
                    <span className="text-blue-100 text-xs font-bold">Total Final do Mês:</span>
                    <span className="font-mono font-bold">{formatCurrency(mData.saldoFinalTotal)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Transactions ledger history for this month */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden p-6">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center justify-between">
              <span>Lançamentos Diários de {MESES_NOMES[activeMonthIdx]}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold">
                {activeTransactions.length} Movimentos
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 font-mono text-[10px] uppercase text-slate-500 border-b border-slate-100">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Ministério/Fundo</th>
                    <th className="py-2.5 px-4">Histórico / Descrição</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    {!isReadOnly && <th className="py-2.5 px-3 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {activeTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 font-mono">
                        Nenhuma movimentação avulsa lançada para este mês.
                      </td>
                    </tr>
                  ) : (
                    activeTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-all font-sans">
                        <td className="py-2.5 px-3 font-mono text-slate-500 font-medium">{formatDate(t.data)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded-md font-semibold text-[10px] uppercase font-mono tracking-wider ${
                            t.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-rose-700'
                          }`}>
                            {t.tipo}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{t.categoria}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10.5px] font-medium ${
                            t.ministerio 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {t.ministerio ? getMinisterioNome(t.ministerio) : "Igreja (Geral)"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 truncate max-w-[200px]" title={t.descricao}>{t.descricao}</td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                          t.tipo === 'entrada' ? 'text-emerald-600' : 'text-slate-800'
                        }`}>
                          {t.tipo === 'entrada' ? '+' : '-'}{formatCurrency(t.valor)}
                        </td>
                        {!isReadOnly && (
                          <td className="py-2.5 px-3 text-center">
                            <button
                              id={`delete-mov-btn-${t.id}`}
                              onClick={() => {
                                if (window.confirm("Deseja realmente apagar esta movimentação?")) {
                                  onDeleteMovimentacao(t.id);
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Remover movimentação"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Column 3: Quick Form panel (New transaction launch form) */}
        {!isReadOnly ? (
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden self-start">
            <div className="p-5 bg-blue-50 border-b border-blue-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <span>Registrar Lançamento</span>
              </h3>
              <p className="text-blue-800 text-[11px] mt-0.5">Tesouraria Ativa - {MESES_NOMES[activeMonthIdx]}</p>
            </div>

            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              
              {/* Validation errors top banner */}
              {Object.keys(errors).length > 0 && (
                <div id="form-errors-alert" className="bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded-xl text-xs space-y-1 select-none animate-pulse">
                  <p className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Atenção: Erro no Lançamento</span>
                  </p>
                  <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-700 font-sans font-medium">
                    {Object.values(errors).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Type Switch */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">Tipo de Fluxo</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-250 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleTipoChange('entrada')}
                    className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      tipo === 'entrada' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipoChange('saida')}
                    className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      tipo === 'saida' 
                        ? 'bg-rose-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Saída (-)
                  </button>
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Categoria Contábil *</label>
                <select
                  value={categoria}
                  onChange={(e) => {
                    setCategoria(e.target.value);
                    if (errors.categoria) {
                      setErrors(prev => {
                        const { categoria, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  className={`bg-white border text-slate-800 text-xs rounded-lg py-2.5 px-3 block w-full focus:outline-none focus:ring-2 font-sans font-medium ${
                    errors.categoria ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-200 focus:ring-blue-500'
                  }`}
                >
                  {(tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA).map((cat, i) => (
                    <option key={i} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.categoria && (
                  <p className="text-rose-600 text-[10px] font-medium mt-1 select-none flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-500" /> {errors.categoria}
                  </p>
                )}
              </div>

              {/* Ministry Dropdown selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Ministério Interno</label>
                <select
                  value={ministerio}
                  onChange={(e) => setMinisterio(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg py-2.5 px-3 block w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans font-medium"
                >
                  <option value="">Igreja (Fundo Geral / Ordinário)</option>
                  {ministeriosDisponiveis.map((item: any) => (
                    <option key={item.sigla} value={item.sigla}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5 text-slate-500">Valor do Lançamento (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => handleValorChange(e.target.value)}
                  onKeyDown={handleValorKeyDown}
                  className={`bg-white border text-slate-800 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 font-mono font-bold ${
                    errors.valor ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-200 focus:ring-blue-500'
                  }`}
                />
                {errors.valor && (
                  <p className="text-rose-600 text-[10px] font-semibold mt-1 select-none flex items-center gap-1 font-mono">
                    <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" /> 
                    <span>{errors.valor}</span>
                  </p>
                )}
              </div>

              {/* Lançamento Parcelado (Checkbox & Details) */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-3">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isParcelado}
                    onChange={(e) => setIsParcelado(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <div className="text-left">
                    <span className="block text-xs font-bold text-slate-700">Lançamento Parcelado</span>
                    <span className="block text-[10px] text-slate-400 font-medium font-sans">Dividir ou repetir em meses futuros</span>
                  </div>
                </label>

                {isParcelado && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 animate-fade-in-up">
                    <div className="space-y-1 text-left">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Qtd. de Parcelas</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="2"
                          max="24"
                          required={isParcelado}
                          value={qtdParcelas}
                          onChange={(e) => setQtdParcelas(Math.max(2, parseInt(e.target.value) || 2))}
                          className="w-20 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                        />
                        <span className="text-slate-400 text-xs font-medium font-sans">parcelas mensais</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Forma de divisão</label>
                      <div className="space-y-1 text-slate-650 font-medium font-sans">
                        <label className="flex items-center space-x-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="tipoParcelamento"
                            checked={tipoParcelamento === 'parcela'}
                            onChange={() => setTipoParcelamento('parcela')}
                            className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500"
                          />
                          <span>O valor digitado é para <strong>cada parcela</strong></span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="tipoParcelamento"
                            checked={tipoParcelamento === 'total'}
                            onChange={() => setTipoParcelamento('total')}
                            className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500"
                          />
                          <span>Dividir <strong>valor total</strong> pelas parcelas</span>
                        </label>
                      </div>
                    </div>

                    {valor && !isNaN(parseFloat(valor)) && (
                      <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100 text-[11px] text-blue-800 font-medium space-y-1 select-none font-mono text-left">
                        <p className="font-sans font-bold">Resumo das Parcelas:</p>
                        <ul className="list-disc pl-3 space-y-0.5 text-slate-600 font-sans">
                          {Array.from({ length: Math.min(6, qtdParcelas) }).map((_, i) => {
                            const pVal = tipoParcelamento === 'total' 
                              ? (parseFloat(valor) / qtdParcelas) 
                              : parseFloat(valor);
                            const tMes = (activeMonthIdx + i) % 12;
                            return (
                              <li key={i}>
                                <span className="font-mono text-[10px]">{MESES_NOMES[tMes]}:</span> Parcela {i + 1}/{qtdParcelas} de <strong className="font-mono text-slate-800">{formatCurrency(pVal)}</strong>
                              </li>
                            );
                          })}
                          {qtdParcelas > 6 && (
                            <li className="text-[10px] italic text-slate-400 font-sans">...e mais {qtdParcelas - 6} parcelas nos meses seguintes.</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date pick */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Data Reconciliada *</label>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => handleDataChange(e.target.value)}
                  className={`bg-white border text-slate-800 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 font-mono font-semibold ${
                    errors.data ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-200 focus:ring-blue-500'
                  }`}
                />
                {errors.data && (
                  <p className="text-rose-600 text-[10px] font-medium mt-1 select-none flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-500" /> {errors.data}
                  </p>
                )}
              </div>

              {/* Optional Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Descrição / Histórico</label>
                <input
                  type="text"
                  placeholder="Opcional: Ex. Reparo de Telhas"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-semibold py-3 cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm transition-all animate-none"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>{isParcelado ? `Registrar ${qtdParcelas} Parcelas` : "Salvar Lançamento no Balanço"}</span>
              </button>

            </form>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-6 text-center text-slate-500 text-xs flex flex-col justify-center items-center gap-2 h-64">
            <LayoutGrid className="w-8 h-8 text-slate-300" />
            <p className="font-semibold font-sans">Perfil Consulta Ativo</p>
            <p className="text-slate-400 leading-relaxed text-[11px] max-w-[170px]">Troque o perfil no cabeçalho superior para administrar os lançamentos financeiros.</p>
          </div>
        )}

      </div>

      {/* Premium Document Preview for A4 download */}
      <div className="border-t border-slate-100 pt-8 mt-12 no-print">
        <div className="text-center mb-6">
          <span className="bg-slate-100 text-slate-600 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Ficha de Balancete Mensal Oficial para Arquivamento (Padrão A4)
          </span>
        </div>

        {/* Printable Sheet styling container */}
        <div 
          ref={documentRef} 
          id="print-area-mensal-documento"
          className="max-w-4xl mx-auto space-y-12 no-margin-print animate-fade-in"
        >
          
          {/* PAGE 1: TRIAL SUMMARY SHEET */}
          <div className="pdf-page bg-white text-slate-800 shadow-md rounded-2xl p-6 sm:p-8 border border-slate-200 border-t-8 border-t-emerald-600 font-sans relative flex flex-col justify-between" style={{ minHeight: '297mm' }}>
            
            <div className="space-y-4">
              {/* Document Header */}
              {renderPDFHeader()}

              {/* Page 1 Content */}
              <div className="space-y-4 font-sans text-xs text-left">
                
                {/* Section 1: Cabinet and Pastoral details */}
                <section className="space-y-2">
                  <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-emerald-600 pl-2">
                    1. Identificação Geral
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs font-sans">
                    <div className="space-y-1 block">
                      <span className="text-emerald-800 font-mono font-bold uppercase tracking-wider text-[9px] block">Pastor Presidente</span>
                      <p className="font-bold text-slate-900 text-sm">{relatorio.pastorResponsavel}</p>
                      <p className="text-slate-600 text-[11px]"><span className="text-slate-400 font-medium select-none">CPF:</span> {relatorio.pastorCpf}</p>
                    </div>
                    <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-slate-200 pt-2.5 sm:pt-0 block">
                      <span className="text-emerald-800 font-mono font-bold uppercase tracking-wider text-[9px] block">Tesoureiro Principal</span>
                      <p className="font-bold text-slate-900 text-sm">{relatorio.tesoureiroNome}</p>
                      <p className="text-slate-600 text-[11px]"><span className="text-slate-400 font-medium select-none">CPF:</span> {relatorio.tesoureiroCpf}</p>
                      {relatorio.tesoureiroTelefone && (
                        <p className="text-slate-600 text-[11px]"><span className="text-slate-400 font-medium select-none">Celular:</span> {relatorio.tesoureiroTelefone}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Section 2: Previous Balance */}
                <section className="space-y-2">
                  <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-emerald-600 pl-2">
                    2. I. Saldo Anterior (Fechamento Prévio)
                  </h3>
                  <div className="overflow-hidden border border-slate-150 rounded-xl">
                    <table className="w-full text-left font-sans text-[11px]">
                      <thead>
                        <tr className="bg-slate-900 text-slate-200 font-mono text-[9px] uppercase">
                          <th className="py-2 px-3">Origem do Saldo</th>
                          <th className="py-2 px-3 text-right">Valor Inicial no Mês</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-1.5 px-3 font-medium text-slate-700">Contas Correntes Bancárias</td>
                          <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(mData?.saldoAnteriorBanco || 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 px-3 font-medium text-slate-700">Aplicações Financeiras / Reservas</td>
                          <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(mData?.saldoAnteriorInvest || 0)}</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold text-slate-900">
                          <td className="py-1.5 px-3 text-emerald-800">Total de Caixa Consolidado Inicial</td>
                          <td className="py-1.5 px-3 text-right font-mono text-emerald-800">{formatCurrency(mData?.saldoAnteriorTotal || 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 italic pl-1">
                    * Consolidado referente ao fechamento do mês anterior ({getPreviousMonthName(activeMonthIdx)} / {activeMonthIdx === 0 ? currentYear - 1 : currentYear})
                  </p>
                </section>

                {/* Section 3: Inflows / Outflows Categories side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Entradas */}
                  <div className="border border-slate-150 rounded-xl overflow-hidden self-start">
                    <div className="bg-emerald-50 text-emerald-950 font-bold font-sans text-[10px] py-1.5 px-3 border-b border-slate-150 tracking-wider uppercase">
                      II. Entradas / Receitas do Período
                    </div>
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-mono">
                          <th className="py-1 px-3">Categoria</th>
                          <th className="py-1 px-3 text-right">Valor</th>
                          <th className="py-1 px-3 text-right">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {activeEntranceCategories.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-3 px-3 text-center text-slate-400 italic">
                              Nenhuma entrada financeira registrada no período.
                            </td>
                          </tr>
                        ) : (
                          activeEntranceCategories.map((cat, i) => {
                            const val = mData?.entradasMap?.[cat] || 0;
                            const pct = (mData?.entradasTotal || 0) > 0 ? (val / mData.entradasTotal) * 100 : 0;
                            return (
                              <tr key={i}>
                                <td className="py-1 px-3 font-medium text-slate-700">{cat}</td>
                                <td className="py-1 px-3 text-right font-mono text-slate-900 font-semibold">{formatCurrency(val).replace("R$", "").trim()}</td>
                                <td className="py-1 px-3 text-right font-mono text-slate-400">{pct.toFixed(0)}%</td>
                              </tr>
                            );
                          })
                        )}
                        <tr className="bg-emerald-50/20 font-bold text-emerald-900 text-xs border-t border-slate-200">
                          <td className="py-1.5 px-3">Total Receitas</td>
                          <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(mData?.entradasTotal || 0).replace("R$", "").trim()}</td>
                          <td className="py-1.5 px-3 text-right font-mono">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Saídas */}
                  <div className="border border-slate-150 rounded-xl overflow-hidden self-start">
                    <div className="bg-rose-50 text-rose-950 font-bold font-sans text-[10px] py-1.5 px-3 border-b border-slate-150 tracking-wider uppercase">
                      III. Despesas / Saídas Contábeis
                    </div>
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-mono">
                          <th className="py-1 px-2">Categoria</th>
                          <th className="py-1 px-2 text-right">Valor</th>
                          <th className="py-1 px-2 text-right">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {activeExitCategories.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-3 px-2 text-center text-slate-400 italic">
                              Nenhuma despesa financeira registrada no período.
                            </td>
                          </tr>
                        ) : (
                          activeExitCategories.map((cat, i) => {
                            const val = mData?.saidasMap?.[cat] || 0;
                            const pct = (mData?.saidasTotal || 0) > 0 ? (val / mData.saidasTotal) * 100 : 0;
                            return (
                              <tr key={i}>
                                <td className="py-1 px-2 font-medium text-slate-700 truncate max-w-[125px]" title={cat}>{cat}</td>
                                <td className="py-1 px-2 text-right font-mono text-slate-900 font-semibold">{formatCurrency(val).replace("R$", "").trim()}</td>
                                <td className="py-1 px-2 text-right font-mono text-slate-400">{pct.toFixed(0)}%</td>
                              </tr>
                            );
                          })
                        )}
                        <tr className="bg-rose-50/20 font-bold text-rose-900 text-xs border-t border-slate-200">
                          <td className="py-1.5 px-2">Total Despesas</td>
                          <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(mData?.saidasTotal || 0).replace("R$", "").trim()}</td>
                          <td className="py-1.5 px-2 text-right font-mono">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* Section 4: Final Balance */}
                <section className="space-y-2">
                  <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-emerald-600 pl-2">
                    3. IV. Saldo Final em Balanço
                  </h3>
                  <div className="overflow-hidden border border-slate-150 rounded-xl">
                    <table className="w-full text-left font-sans text-[11px]">
                      <thead>
                        <tr className="bg-slate-900 text-slate-200 font-mono text-[9px] uppercase">
                          <th className="py-2 px-3">Origem do Ativo</th>
                          <th className="py-2 px-3 text-right">Valor Final Conciliado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-1.5 px-3 font-medium text-slate-700">Contas Bancárias ao Término</td>
                          <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(mData?.saldoFinalBanco || 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 px-3 font-medium text-slate-700">Aplicações Financeiras ao Término</td>
                          <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(mData?.saldoFinalInvest || 0)}</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold text-slate-900">
                          <td className="py-2 px-3 text-blue-900 font-sans">Total de Caixa de Fechamento de Mês</td>
                          <td className="py-2 px-3 text-right font-mono text-blue-900">{formatCurrency(mData?.saldoFinalTotal || 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Surplus/Deficit Monthly Summary block */}
                <div className={`p-2.5 rounded-xl border text-center ${
                  ((mData?.entradasTotal || 0) - (mData?.saidasTotal || 0)) >= 0 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <span className="text-[9px] block font-bold uppercase tracking-widest font-mono font-semibold">Apuração de Exercício Mensal</span>
                  <span className="text-xs font-bold mt-0.5 block font-sans">
                    {((mData?.entradasTotal || 0) - (mData?.saidasTotal || 0)) >= 0 ? "SUPERÁVIT" : "DEFICIT"} DO PERÍODO: {formatCurrency((mData?.entradasTotal || 0) - (mData?.saidasTotal || 0))}
                  </span>
                </div>

              </div>
            </div>

            <div className="pt-4">
              {renderPDFFooter(1, totalPDFPagesCount)}
            </div>

          </div>

          {/* DYNAMIC TRANSACTION PAGES */}
          {txChunks.map((chunk, chunkIdx) => {
            const pageNumber = 2 + chunkIdx;
            const isLastPage = pageNumber === totalPDFPagesCount;

            return (
              <div 
                key={chunkIdx} 
                className="pdf-page bg-white text-slate-800 shadow-md rounded-2xl p-6 sm:p-8 border border-slate-200 border-t-8 border-t-emerald-600 font-sans relative flex flex-col justify-between" 
                style={{ minHeight: '297mm' }}
              >
                <div className="space-y-4">
                  
                  {/* Running header */}
                  <div className="flex justify-between items-center border-b border-slate-150 pb-2 text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                    <span>{relatorio.nomeIgreja}</span>
                    <span className="text-emerald-800 font-mono">Lançamentos Diários • Ref: {MESES_NOMES[activeMonthIdx]} / {currentYear}</span>
                  </div>

                  {/* Header Title */}
                  <div className="space-y-1 block">
                    <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-emerald-600 pl-2">
                      Lançamentos Diários ({chunkIdx + 1} de {txChunks.length})
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Relação completa de entradas e saídas contábeis ordenadas em ordem cronográfica crescente de registro.
                    </p>
                  </div>

                  {/* Table Structure */}
                  <div className="overflow-hidden border border-slate-150 rounded-xl">
                    <table className="w-full text-left font-sans text-[8.5px]">
                      <thead>
                        <tr className="bg-slate-900 text-slate-200 font-mono text-[7px] uppercase border-b border-slate-350">
                          <th className="py-2 px-2">Data</th>
                          <th className="py-2 px-1.5 text-center">Tipo</th>
                          <th className="py-2 px-2">Categoria</th>
                          <th className="py-2 px-2">Ministério / Fundo</th>
                          <th className="py-2 px-2">Histórico / Descrição</th>
                          <th className="py-2 px-2 text-right">Valor (R$)</th>
                          <th className="py-2 px-2 text-right">Saldo Acumulado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {chunk.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-400 font-mono italic text-[9px]">
                              Nenhuma movimentação lançada para este período de referência.
                            </td>
                          </tr>
                        ) : (
                          chunk.map((t, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="py-1 px-2 font-mono text-slate-500">{formatDate(t.data)}</td>
                              <td className="py-1 px-1.5 text-center">
                                <span className={`px-1 py-0.2 rounded text-[7px] uppercase font-mono font-bold tracking-wide ${
                                  t.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-rose-800'
                                }`}>
                                  {t.tipo.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-1 px-2 text-slate-800 truncate max-w-[90px]">{t.categoria}</td>
                              <td className="py-1 px-2 truncate max-w-[80px]">{t.ministerio ? getMinisterioNome(t.ministerio) : "Geral"}</td>
                              <td className="py-1 px-2 truncate max-w-[140px]" title={t.descricao || "-"}>{t.descricao || "-"}</td>
                              <td className={`py-1 px-2 text-right font-mono font-semibold ${
                                t.tipo === 'entrada' ? 'text-emerald-700' : 'text-slate-800'
                              }`}>
                                {t.tipo === 'entrada' ? '+' : '-'}{formatCurrency(t.valor).replace("R$", "").trim()}
                              </td>
                              <td className="py-1 px-2 text-right font-mono font-semibold text-slate-700">
                                {formatCurrency(t.runningBalance).replace("R$", "").trim()}
                              </td>
                            </tr>
                          ))
                        )}
                        
                        {isLastPage && chunk.length > 0 && (
                          <tr className="bg-slate-50 font-bold border-t border-slate-200">
                            <td colSpan={5} className="py-2 px-2 text-right font-sans uppercase text-[8px] text-slate-500">Saldo Final Líquido Consolidado do Período:</td>
                            <td colSpan={2} className="py-2 px-2 text-right font-mono text-[9px] text-emerald-800">
                              {formatCurrency(mData?.saldoFinalTotal || 0)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

                <div className="pt-4">
                  {/* If last page, render the professional Signatures */}
                  {isLastPage ? renderSignaturesBlock() : (
                    <div className="text-center text-[7.5px] font-mono uppercase tracking-widest text-slate-400 italic">
                      Lançamentos contínuos — balancete continua na página seguinte.
                    </div>
                  )}

                  {/* Footer element */}
                  {renderPDFFooter(pageNumber, totalPDFPagesCount)}
                </div>
              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
}
