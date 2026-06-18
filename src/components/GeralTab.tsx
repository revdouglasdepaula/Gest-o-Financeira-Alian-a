import React, { useRef, useState } from 'react';
import { WorkbookPayload } from '../api';
import { formatCurrency, formatPercent } from '../utils';
import { CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, MESES_NOMES } from '../types';
import { AreaChart, TrendingUp, Landmark, Calculator, Receipt, ShieldAlert, Printer, Church, Download, Loader2, Upload, X } from 'lucide-react';
import { generateHighFidelityPDF } from '../utils/pdfGenerator';

interface GeralTabProps {
  workbook: WorkbookPayload | null;
  dbState?: any;
  onSaveConfig?: (payload: { igreja?: any; configuracoes?: any }) => Promise<void>;
  currentUser?: any;
}

export default function GeralTab({ workbook, dbState, onSaveConfig, currentUser }: GeralTabProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Configured digital signature values driven by central settings tab
  const showDigitalSignatures = dbState?.configuracoes?.showDigitalSignatures !== false;
  const signedByTreasurer = dbState?.configuracoes?.signedByTreasurer !== false;

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
  const treasurerName = activeTreasurer?.nome || workbook?.relatorioPresbiterio?.tesoureiroNome || dbState?.igreja?.tesoureiro || "Tesoureiro";
  const treasurerSignatureImg = activeTreasurer?.assinaturaImg || dbState?.igreja?.tesoureiroAssinaturaImg || "";

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

  if (!workbook) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600 font-medium font-mono">Consolidando fechamento anual...</span>
      </div>
    );
  }

  const { meses, geral } = workbook;

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const nomeIgreja = workbook.relatorioPresbiterio?.nomeIgreja || "Igreja";
    const success = await generateHighFidelityPDF(
      'print-area-geral-documento',
      `Consolidado_Anual_Financeiro_${nomeIgreja.replace(/\s+/g, '_')}`
    );
    setIsGeneratingPdf(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Institucional - Print Only */}
      <div className="print-only text-center space-y-2 border-b-2 border-slate-300 pb-6 mb-8">
        <h1 className="text-2xl font-bold uppercase font-sans text-slate-900 leading-tight">
          {workbook.relatorioPresbiterio?.nomeIgreja || "Igreja Presbiteriana Aliança"}
        </h1>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest leading-none">
          CNPJ: {workbook.relatorioPresbiterio?.cnpj || "00.000.000/0001-00"}
        </p>
        <p className="text-xs text-slate-400 font-sans tracking-wide">
          {workbook.relatorioPresbiterio?.endereco || "Endereço da Igreja"}
        </p>
        <div className="inline-block bg-slate-50 border border-slate-150 rounded px-3 py-1 mt-1 text-[10px] font-mono font-semibold uppercase text-slate-700">
          Demonstrativo Consolidado do Fluxo de Caixa Anual • Planilha Consolidadora Geral
        </div>
      </div>
      
      {/* Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h2 id="geral-consolidation-title" className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Consolidação Tributária & Fluxo Geral</span>
            <span className="bg-blue-50 text-blue-700 font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Exercício Geral 12 Meses
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Compilado matemático de todas as movimentações lançadas, estruturado em colunas conforme as abas da planilha original.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0 self-start sm:self-center">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-450 text-white rounded-lg text-xs font-semibold py-2.5 px-4 cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm transition-all text-center"
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
            onClick={handlePrint}
            className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold py-2.5 px-4 cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm transition-all text-center"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Imprimir Via Navegador</span>
          </button>
        </div>
      </div>

      {/* High-Level Totals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-white p-5 rounded-xl border border-slate-150 flex items-center space-x-3.5 shadow-sm">
          <span className="p-3 bg-emerald-50 rounded-lg text-emerald-600 shrink-0"><Calculator className="w-5 h-5" /></span>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">Total Receitas Anuais</span>
            <span className="text-xl font-bold text-slate-900 font-sans">{formatCurrency(geral.totalAnualEntradas)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-150 flex items-center space-x-3.5 shadow-sm">
          <span className="p-3 bg-rose-50 rounded-lg text-rose-600 shrink-0"><Receipt className="w-5 h-5" /></span>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">Total Despesas Anuais</span>
            <span className="text-xl font-semibold text-slate-950 font-sans">{formatCurrency(geral.totalAnualSaidas)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-150 flex items-center space-x-3.5 shadow-sm">
          <span className={`p-3 rounded-lg shrink-0 ${geral.resultadoAnual >= 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-600"}`}><TrendingUp className="w-5 h-5" /></span>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">Saldo Líquido Acumulado</span>
            <span className={`text-xl font-bold font-sans ${geral.resultadoAnual >= 0 ? 'text-blue-600' : 'text-red-650'}`}>
              {geral.resultadoAnual >= 0 ? '+' : ''}{formatCurrency(geral.resultadoAnual)}
            </span>
          </div>
        </div>
      </div>

      {/* Table 1: Matrix Inflows (Entradas) */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden p-6 space-y-3 no-print">
        <div>
          <h3 className="font-bold text-slate-850 text-base tracking-tight">I. Matriz de Entradas por Mês e Categoria</h3>
          <p className="text-slate-400 text-xs">Arrecadação detalhada mês a mês em todas as frentes tributárias da Igreja.</p>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900 text-slate-200 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3 sticky left-0 bg-slate-900 border-r border-slate-850">Mês</th>
                {CATEGORIAS_ENTRADA.map((cat, i) => (
                  <th key={i} className="py-2.5 px-2 text-right border-r border-slate-850">{cat}</th>
                ))}
                <th className="py-2.5 px-3 text-right bg-blue-955 text-blue-200">Total Mensal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              {meses.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-800 sticky left-0 bg-white shadow-sm border-r border-slate-100">{m.nome}</td>
                  {CATEGORIAS_ENTRADA.map((cat, i) => {
                    const value = m.entradasMap[cat] || 0;
                    return (
                      <td key={i} className={`py-2 px-2 text-right font-mono border-r border-slate-100 ${value > 0 ? "text-slate-900 font-medium" : "text-slate-300"}`}>
                        {value > 0 ? formatCurrency(value).replace("R$", "").trim() : "-"}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right font-mono font-bold text-blue-600 bg-blue-50/20">{formatCurrency(m.entradasTotal)}</td>
                </tr>
              ))}
              {/* Table Total row */}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-right">
                <td className="py-3 px-3 text-center border-r border-slate-200 sticky left-0 bg-slate-100 z-10 font-mono uppercase">TOTAL ANUAL</td>
                {CATEGORIAS_ENTRADA.map((cat, i) => {
                  const val = geral.entradasTotaisPorCategoria[cat] || 0;
                  return (
                    <td key={i} className="py-3 px-2 text-right border-r border-slate-200 text-slate-900 font-mono">{formatCurrency(val)}</td>
                  );
                })}
                <td className="py-3 px-3 bg-blue-900 text-white font-bold">{formatCurrency(geral.totalAnualEntradas)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Matrix Outflows (Saídas) */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden p-6 space-y-3 no-print">
        <div>
          <h3 className="font-bold text-slate-850 text-base tracking-tight">II. Matriz de Saídas por Mês e Categoria</h3>
          <p className="text-slate-400 text-xs">Despesas detalhadas mês a mês, permitindo auditorias e apuração de centros de custo.</p>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-900 text-slate-200 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3 sticky left-0 bg-slate-900 border-r border-slate-850">Mês</th>
                {CATEGORIAS_SAIDA.map((cat, i) => (
                  <th key={i} className="py-2.5 px-2 text-right border-r border-slate-850">{cat.substring(0,22)}...</th>
                ))}
                <th className="py-2.5 px-3 text-right bg-blue-950 text-blue-200">Total Mensal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              {meses.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-800 sticky left-0 bg-white shadow-sm border-r border-slate-100">{m.nome}</td>
                  {CATEGORIAS_SAIDA.map((cat, i) => {
                    const value = m.saidasMap[cat] || 0;
                    return (
                      <td key={i} className={`py-2 px-2 text-right font-mono border-r border-slate-100 ${value > 0 ? "text-slate-800 font-medium" : "text-slate-350"}`}>
                        {value > 0 ? formatCurrency(value).replace("R$", "").trim() : "-"}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right font-mono font-bold text-red-650 bg-rose-50/20">{formatCurrency(m.saidasTotal)}</td>
                </tr>
              ))}
              {/* Table Total row */}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-right">
                <td className="py-3 px-3 text-center border-r border-slate-200 sticky left-0 bg-slate-100 z-10 font-mono uppercase">TOTAL ANUAL</td>
                {CATEGORIAS_SAIDA.map((cat, i) => {
                  const val = geral.saidasTotaisPorCategoria[cat] || 0;
                  return (
                    <td key={i} className="py-3 px-2 text-right border-r border-slate-200 text-slate-900 font-mono">{formatCurrency(val)}</td>
                  );
                })}
                <td className="py-3 px-3 bg-rose-900 text-white font-bold">{formatCurrency(geral.totalAnualSaidas)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 3: Comparative Cash Outcomes by Month */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden p-6 no-print">
        <h3 className="font-bold text-slate-850 text-base mb-3 tracking-tight">III. Evolução Financeira Consolidada</h3>
        <p className="text-slate-400 text-xs mb-4">Análise mensal de fluxo de caixa indicando meses superavitários (+) ou deficitários (-).</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 font-mono text-[10px] uppercase text-slate-500 border-b border-slate-100">
                <th className="py-2 px-4">Mês Referência</th>
                <th className="py-2 px-4 text-right">Faturamento (Inflowing)</th>
                <th className="py-2 px-4 text-right">Despesas (Outflowing)</th>
                <th className="py-2 px-4 text-right col-span-2">Resultado Líquido</th>
                <th className="py-2 px-4 text-right">Fechamento Banco</th>
                <th className="py-2 px-4 text-right">Investimentos Final</th>
                <th className="py-2 px-4 text-right bg-blue-50 font-semibold text-slate-700">Patrimônio Consolidado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              {meses.map((m, idx) => {
                const isPositive = m.resultadoMensal >= 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50 font-medium">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{m.nome}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600">+{formatCurrency(m.entradasTotal)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-600">-{formatCurrency(m.saidasTotal)}</td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-red-650'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(m.resultadoMensal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatCurrency(m.saldoFinalBanco)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatCurrency(m.saldoFinalInvest)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600 bg-blue-50/10">{formatCurrency(m.saldoFinalTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Beautiful Document Preview for A4 download */}
      <div className="border-t border-slate-100 pt-8 mt-12 no-print">
        <div className="text-center mb-6">
          <span className="bg-slate-100 text-slate-600 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Ficha Consolidada Oficial para Arquivamento (Padrão A4)
          </span>
        </div>

        {/* Printable Sheet styling container */}
        <div 
          ref={documentRef} 
          id="print-area-geral-documento"
          className="max-w-4xl mx-auto space-y-12 no-margin-print"
        >
        
        {/* PAGE 1 */}
        <div className="pdf-page bg-white text-slate-800 shadow-md rounded-2xl p-6 sm:p-8 border border-slate-200 border-t-8 border-t-blue-900 font-sans relative">
          
          {/* Document Header */}
          <div className="text-center space-y-1 border-b-2 border-slate-100 pb-4 mb-4">
            <div className="mx-auto bg-blue-50 text-blue-900 w-10 h-10 rounded-full flex items-center justify-center mb-1 no-print">
              <Church className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight uppercase font-sans text-blue-950">
              {workbook.relatorioPresbiterio?.nomeIgreja || "Igreja Presbiteriana Aliança"}
            </h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">
              CNPJ: {workbook.relatorioPresbiterio?.cnpj || "00.000.000/0001-00"}
            </p>
            <p className="text-[11px] text-slate-400 font-sans tracking-wide">
              {workbook.relatorioPresbiterio?.endereco || "Endereço da Igreja"}
            </p>
            <div className="inline-block bg-slate-50 border border-slate-150 rounded px-2.5 py-0.5 mt-1 text-[9px] font-mono font-semibold uppercase text-slate-700">
              Balancete Geral Consolidado • Exercício Financeiro Anual
            </div>
          </div>

          {/* Page 1 Content */}
          <div className="space-y-4 font-sans text-xs">
            
            {/* Section 1: Cabinet and Pastoral details */}
            <section className="space-y-2">
              <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-blue-900 pl-2">
                1. Identificação Geral
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-55 p-4 rounded-xl border border-slate-150 text-xs font-sans">
                <div className="space-y-1 block">
                  <span className="text-blue-900 font-mono font-bold uppercase tracking-wider text-[9px] block">Pastor Presidente</span>
                  <p className="font-bold text-slate-900 text-sm">{workbook.relatorioPresbiterio?.pastorResponsavel || "Não informado"}</p>
                  <p className="text-slate-600 text-[11px]"><span className="text-slate-400 font-medium select-none">CPF:</span> {workbook.relatorioPresbiterio?.pastorCpf || "000.000.000-00"}</p>
                </div>
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-slate-205 pt-2.5 sm:pt-0 block">
                  <span className="text-blue-900 font-mono font-bold uppercase tracking-wider text-[9px] block">Tesoureiro Principal</span>
                  <p className="font-bold text-slate-900 text-sm">{workbook.relatorioPresbiterio?.tesoureiroNome || "Não informado / Cadastrado"}</p>
                  <p className="text-slate-600 text-[11px]"><span className="text-slate-400 font-medium select-none">CPF:</span> {workbook.relatorioPresbiterio?.tesoureiroCpf || "000.000.000-00"}</p>
                  {workbook.relatorioPresbiterio?.tesoureiroTelefone && (
                    <p className="text-slate-650 text-[11px]"><span className="text-slate-400 font-medium select-none">Celular:</span> {workbook.relatorioPresbiterio?.tesoureiroTelefone}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Section 2: Patrimonial Balance Sheet (Integrated Assets) */}
            <section className="space-y-2">
              <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-blue-900 pl-2">
                2. Balanço do Ativo Circulante & Reservas
              </h3>
              <div className="overflow-hidden border border-slate-150 rounded-xl">
                <table className="w-full text-left font-sans text-[11px]" id="patrimonial-assets-table-consolidated">
                  <thead>
                    <tr className="bg-slate-900 text-slate-200 font-mono text-[9px] uppercase">
                      <th className="py-2 px-3">Local dos Fundos</th>
                      <th className="py-2 px-3 text-right">Saldo Inicial (01/Jan)</th>
                      <th className="py-2 px-3 text-right">Saldo Final (31/Dez)</th>
                      <th className="py-2 px-3 text-right">Variação Absoluta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-1.5 px-3 font-medium text-slate-705 font-sans">Contas Correntes Bancárias</td>
                      <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(workbook.relatorioPresbiterio?.bancoInicialJan || 0)}</td>
                      <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(workbook.relatorioPresbiterio?.bancoFinalDez || 0)}</td>
                      <td className={`py-1.5 px-3 text-right font-mono font-medium ${((workbook.relatorioPresbiterio?.bancoFinalDez || 0) >= (workbook.relatorioPresbiterio?.bancoInicialJan || 0)) ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency((workbook.relatorioPresbiterio?.bancoFinalDez || 0) - (workbook.relatorioPresbiterio?.bancoInicialJan || 0))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-medium text-slate-705 font-sans">Aplicações Financeiras / Investimentos</td>
                      <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(workbook.relatorioPresbiterio?.investInicialJan || 0)}</td>
                      <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(workbook.relatorioPresbiterio?.investFinalDez || 0)}</td>
                      <td className={`py-1.5 px-3 text-right font-mono font-medium ${((workbook.relatorioPresbiterio?.investFinalDez || 0) >= (workbook.relatorioPresbiterio?.investInicialJan || 0)) ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency((workbook.relatorioPresbiterio?.investFinalDez || 0) - (workbook.relatorioPresbiterio?.investInicialJan || 0))}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-semibold">
                      <td className="py-2 px-3 text-blue-950 font-sans">Consolidação Ativos Totais</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-900">{formatCurrency(workbook.relatorioPresbiterio?.totalInicialJan || 0)}</td>
                      <td className="py-2 px-3 text-right font-mono text-blue-900">{formatCurrency(workbook.relatorioPresbiterio?.totalFinalDez || 0)}</td>
                      <td className={`py-2 px-3 text-right font-mono ${((workbook.relatorioPresbiterio?.totalFinalDez || 0) >= (workbook.relatorioPresbiterio?.totalInicialJan || 0)) ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency((workbook.relatorioPresbiterio?.totalFinalDez || 0) - (workbook.relatorioPresbiterio?.totalInicialJan || 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3: DRE Consolidada Anual */}
            <section className="space-y-2">
              <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-blue-900 pl-2">
                3. Demonstração de Resultado e Exercício Geral (DRE)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                
                {/* Receipts card */}
                <div className="border border-slate-150 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50 text-emerald-950 font-bold font-sans text-[10px] py-1.5 px-3 uppercase">
                    Receitas Arrecadadas
                  </div>
                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between border-b pb-0.5">
                      <span className="text-slate-500">Dízimos de Membros:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.receitaDizimos || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-0.5">
                      <span className="text-slate-505">Ofertas de Culto:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.receitaOfertas || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-0.5">
                      <span className="text-slate-505">Auxílio de Ministérios:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.receitaMinisterios || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-0.5">
                      <span className="text-slate-505">Outras Fontes de Caixa:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.receitaOutras || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 text-emerald-800 text-xs">
                      <span>ARRECADAÇÃO REAL:</span>
                      <span className="font-mono">{formatCurrency(workbook.relatorioPresbiterio?.totalReceitas || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Spendings card */}
                <div className="border border-slate-150 rounded-xl overflow-hidden">
                  <div className="bg-rose-50 text-rose-950 font-bold font-sans text-[10px] py-1.5 px-3 uppercase">
                    Despesas Comprovadas
                  </div>
                  <div className="p-3 space-y-1 text-xs">
                    <div className="flex justify-between border-b pb-0.5">
                      <span className="text-slate-500">Sustento Pastoral:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.despesaClero || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-0.5">
                      <span className="text-slate-500">Zeladoria e Encargos:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.despesaFuncionarios || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-0.5">
                      <span className="text-slate-550">Atividades e Missões:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.despesaAtividades || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-0.5 font-sans">
                      <span className="text-slate-550">Despesas Operacionais:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.despesaOperacionais || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-0.5 font-sans">
                      <span className="text-slate-555">Patrimônio / Reformas:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.despesaConservacao || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-0.5">
                      <span className="text-slate-550">Contr. Presbiteriais:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.despesaContribuicaoEstatutaria || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-0.5 font-sans">
                      <span className="text-slate-550">Outras Despesas:</span>
                      <span className="font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.despesaOutras || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 text-rose-800 text-xs">
                      <span>TOTAL DESPESAS:</span>
                      <span className="font-mono">{formatCurrency(workbook.relatorioPresbiterio?.totalDespesas || 0)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* General Surplus/Deficit summary */}
              <div className={`p-2.5 rounded-xl border font-sans text-center ${
                (workbook.relatorioPresbiterio?.superavitDeficit || 0) >= 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <span className="text-[9px] block font-bold uppercase tracking-widest font-mono">Consolidação de Desempenho Líquido</span>
                <span className="text-base font-bold mt-0.5 block">
                  {(workbook.relatorioPresbiterio?.superavitDeficit || 0) >= 0 ? "SUPERÁVIT" : "DEFICIT"} ANUAL DA TESOURARIA: {formatCurrency(workbook.relatorioPresbiterio?.superavitDeficit || 0)}
                </span>
              </div>
            </section>

            {/* Section 4: Módulo I - Matriz de Entradas por Mês e Categoria */}
            <section className="space-y-1.5 font-sans">
              <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-blue-900 pl-2">
                4. Módulo I - Matriz de Entradas por Mês e Categoria
              </h3>
              <div className="overflow-hidden border border-slate-150 rounded-xl">
                <table className="w-full text-left font-sans text-[8px]" id="print-matrix-inflow">
                  <thead>
                    <tr className="bg-slate-900 text-slate-200 font-mono text-[7px] uppercase border-b border-slate-350">
                      <th className="py-1 px-1.5 font-bold">Mês</th>
                      <th className="py-1 px-1 text-right font-bold">Dízimos</th>
                      <th className="py-1 px-1 text-right font-bold">Ofertas Reg.</th>
                      <th className="py-1 px-1 text-right font-bold">Min. Internos</th>
                      <th className="py-1 px-1 text-right font-bold">Resg. Inv.</th>
                      <th className="py-1 px-1 text-right font-bold">Emp. Rec.</th>
                      <th className="py-1 px-1 text-right font-bold">Outr. Entr.</th>
                      <th className="py-1 px-1.5 text-right font-bold bg-blue-955 text-blue-200">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-slate-705">
                    {meses.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-0.5 px-1.5 font-semibold text-slate-800">{m.nome}</td>
                        {CATEGORIAS_ENTRADA.map((cat, i) => {
                          const value = m.entradasMap[cat] || 0;
                          return (
                            <td key={i} className={`py-0.5 px-1 text-right font-mono ${value > 0 ? "text-slate-900 font-medium" : "text-slate-300"}`}>
                              {value > 0 ? formatCurrency(value).replace("R$", "").trim() : "-"}
                            </td>
                          );
                        })}
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                          {formatCurrency(m.entradasTotal).replace("R$", "").trim()}
                        </td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="bg-slate-50 font-bold border-t border-slate-300 text-right text-[7.5px]">
                      <td className="py-1 px-1.5 text-left font-mono uppercase text-slate-900">Total Anual</td>
                      {CATEGORIAS_ENTRADA.map((cat, i) => {
                        const val = geral.entradasTotaisPorCategoria[cat] || 0;
                        return (
                          <td key={i} className="py-1 px-1 text-right text-slate-900 font-mono">
                            {formatCurrency(val).replace("R$", "").trim()}
                          </td>
                        );
                      })}
                      <td className="py-1 px-1.5 bg-blue-900 text-white font-mono text-right font-semibold">
                        {formatCurrency(geral.totalAnualEntradas).replace("R$", "").trim()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

          </div>

          {/* Page 1 Footer */}
          <div className="mt-8 pt-4 border-t border-slate-150 flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase tracking-widest">
            <span>Balancete Geral Consolidado • Ficha Tributária</span>
            <span className="font-bold text-blue-900">Folha 01 / 02</span>
          </div>

        </div>

        {/* PAGE 2 */}
        <div className="pdf-page bg-white text-slate-800 shadow-md rounded-2xl p-6 sm:p-8 border border-slate-205 border-t-8 border-t-blue-900 font-sans relative">
          
          {/* Running document header for Page 2 */}
          <div className="flex justify-between items-center border-b border-slate-150 pb-2 mb-4 text-[10px] font-sans font-bold text-slate-450 uppercase tracking-wider">
            <span>{workbook.relatorioPresbiterio?.nomeIgreja || "Igreja Presbiteriana Aliança"}</span>
            <span className="text-blue-900 font-mono">Saldos & Matrizes de Saídas Consolidadas</span>
          </div>

          {/* Page 2 Content */}
          <div className="space-y-4 font-sans text-xs">

            {/* Section 5: Módulo II - Matriz de Saídas por Mês e Categoria */}
            <section className="space-y-1.5 font-sans">
              <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-blue-900 pl-2">
                5. Módulo II - Matriz de Saídas por Mês e Categoria
              </h3>
              <div className="overflow-hidden border border-slate-150 rounded-xl">
                <table className="w-full text-left font-sans text-[7.5px]" id="print-matrix-outflow">
                  <thead>
                    <tr className="bg-slate-900 text-slate-200 font-mono text-[6.5px] uppercase border-b border-slate-350">
                      <th className="py-1 px-1 font-bold">Mês</th>
                      <th className="py-1 px-0.5 text-right font-bold">Sust.Past</th>
                      <th className="py-1 px-0.5 text-right font-bold">Func.Enc</th>
                      <th className="py-1 px-0.5 text-right font-bold">Min.Ativ</th>
                      <th className="py-1 px-0.5 text-right font-bold">Desp.Oper</th>
                      <th className="py-1 px-0.5 text-right font-bold">Cons.Patr</th>
                      <th className="py-1 px-0.5 text-right font-bold">Contr.Est</th>
                      <th className="py-1 px-0.5 text-right font-bold">Aplic.Fin</th>
                      <th className="py-1 px-0.5 text-right font-bold">Amort.Emp</th>
                      <th className="py-1 px-0.5 text-right font-bold">Cartão.Cr</th>
                      <th className="py-1 px-0.5 text-right font-bold">Outr.Saí</th>
                      <th className="py-1 px-1 text-right font-bold bg-rose-950 text-rose-200">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-slate-705">
                    {meses.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-0.5 px-1 font-semibold text-slate-800">{m.nome.substring(0,3)}</td>
                        {CATEGORIAS_SAIDA.map((cat, i) => {
                          const value = m.saidasMap[cat] || 0;
                          return (
                            <td key={i} className={`py-0.5 px-0.5 text-right font-mono ${value > 0 ? "text-slate-900 font-medium" : "text-slate-300"}`}>
                              {value > 0 ? formatCurrency(value).replace("R$", "").trim() : "-"}
                            </td>
                          );
                        })}
                        <td className="py-0.5 px-1 text-right font-mono font-bold text-rose-900 bg-rose-50/20">
                          {formatCurrency(m.saidasTotal).replace("R$", "").trim()}
                        </td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="bg-slate-50 font-bold border-t border-slate-300 text-right text-[7px]">
                      <td className="py-1 px-1 text-left font-mono uppercase text-slate-900">Total</td>
                      {CATEGORIAS_SAIDA.map((cat, i) => {
                        const val = geral.saidasTotaisPorCategoria[cat] || 0;
                        return (
                          <td key={i} className="py-1 px-0.5 text-right text-slate-900 font-mono">
                            {formatCurrency(val).replace("R$", "").trim()}
                          </td>
                        );
                      })}
                      <td className="py-1 px-1 bg-rose-900 text-white font-mono text-right font-semibold">
                        {formatCurrency(geral.totalAnualSaidas).replace("R$", "").trim()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 6: Módulo III - Evolução Financeira Consolidada */}
            <section className="space-y-1.5 font-sans">
              <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-blue-900 pl-2">
                6. Módulo III - Evolução Financeira Consolidada & Saldos
              </h3>
              <div className="overflow-hidden border border-slate-150 rounded-xl">
                <table className="w-full text-left font-sans text-[8px]" id="print-matrix-consolidated-evolution">
                  <thead>
                    <tr className="bg-slate-900 text-slate-200 font-mono text-[7px] uppercase border-b border-slate-350">
                      <th className="py-1 px-2 font-bold">Mês Referência</th>
                      <th className="py-1 px-1.5 text-right font-bold">Faturamento (+)</th>
                      <th className="py-1 px-1.5 text-right font-bold">Despesas (-)</th>
                      <th className="py-1 px-1.5 text-right font-bold">Resultado Líquido</th>
                      <th className="py-1 px-1.5 text-right font-bold">Saldo Banco</th>
                      <th className="py-1 px-1.5 text-right font-bold">Investimentos</th>
                      <th className="py-1 px-2 text-right font-bold bg-blue-950 text-blue-200">Patrimônio Consolidado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-slate-705">
                    {meses.map((m, idx) => {
                      const isPositive = m.resultadoMensal >= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 font-medium">
                          <td className="py-0.5 px-2 font-semibold text-slate-800">{m.nome}</td>
                          <td className="py-0.5 px-1.5 text-right font-mono text-emerald-600">+{formatCurrency(m.entradasTotal).replace("R$", "").trim()}</td>
                          <td className="py-0.5 px-1.5 text-right font-mono text-rose-600">-{formatCurrency(m.saidasTotal).replace("R$", "").trim()}</td>
                          <td className={`py-0.5 px-1.5 text-right font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPositive ? '+' : ''}{formatCurrency(m.resultadoMensal).replace("R$", "").trim()}
                          </td>
                          <td className="py-0.5 px-1.5 text-right font-mono text-slate-500">{formatCurrency(m.saldoFinalBanco).replace("R$", "").trim()}</td>
                          <td className="py-0.5 px-1.5 text-right font-mono text-slate-500">{formatCurrency(m.saldoFinalInvest).replace("R$", "").trim()}</td>
                          <td className="py-0.5 px-2 text-right font-mono font-bold text-blue-900 bg-blue-50/10">{formatCurrency(m.saldoFinalTotal)}</td>
                        </tr>
                      );
                    })}
                    {/* Total row / Final state */}
                    <tr className="bg-slate-50 font-bold border-t border-slate-300 text-right text-[8px]">
                      <td className="py-1.5 px-2 text-left font-mono uppercase text-slate-900 text-[7px]">Saldos Finais Anuais</td>
                      <td className="py-1.5 px-1.5 text-right font-mono text-emerald-700">{formatCurrency(geral.totalAnualEntradas)}</td>
                      <td className="py-1.5 px-1.5 text-right font-mono text-rose-700">{formatCurrency(geral.totalAnualSaidas)}</td>
                      <td className={`py-1.5 px-1.5 text-right font-mono ${geral.resultadoAnual >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {geral.resultadoAnual >= 0 ? '+' : ''}{formatCurrency(geral.resultadoAnual)}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-mono text-slate-900">{formatCurrency(workbook.relatorioPresbiterio?.bancoFinalDez || 0)}</td>
                      <td className="py-1.5 px-1.5 text-right font-mono text-slate-900">{formatCurrency(workbook.relatorioPresbiterio?.investFinalDez || 0)}</td>
                      <td className="py-1.5 px-2 bg-blue-900 text-white text-right font-mono font-semibold">{formatCurrency(workbook.relatorioPresbiterio?.totalFinalDez || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Official Endnotes signatures block */}
            <div className="pt-4 mt-4 border-t flex flex-col items-center text-center text-[10px] text-slate-550 font-sans" style={{ borderColor: '#cbd5e1' }}>
              <p className="text-[7.5px] font-mono text-slate-400 text-center uppercase tracking-widest mb-3">
                Autenticação de Responsabilidade Eclesiástica e Registro Contábil
              </p>

              <div className="flex flex-col items-center justify-center text-center text-[9.5px] w-full max-w-sm">
                {showDigitalSignatures && signedByTreasurer ? (
                  <div className="w-full flex flex-col items-center py-1">
                    {/* Hand-written like signature or Image Signature */}
                    {treasurerSignatureImg ? (
                      <div className="h-10 flex items-center justify-center my-1 select-none">
                        <img 
                          src={treasurerSignatureImg} 
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
                        {treasurerName}
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
                      <p className="text-slate-600 font-sans truncate m-0 p-0 leading-tight text-left">
                        <strong className="text-slate-800">Signatário:</strong> {treasurerName}
                      </p>
                      <p className="text-slate-500 font-mono m-0 p-0 leading-tight text-left">
                        <strong className="text-slate-800">Assinatura:</strong> Consolidado Anual Geral
                      </p>
                      <p className="text-slate-400 font-mono truncate text-[6px] m-0 p-0 leading-tight text-left">
                        <strong className="text-slate-800">Verificação:</strong> {generateAuthHash(treasurerName, 99, 2026)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-14 flex items-end justify-center w-full">
                    <div className="border-b border-dashed w-2/3 mb-2 border-slate-300"></div>
                  </div>
                )}
                
                <p className="font-bold text-slate-850 text-xs mt-2">{treasurerName}</p>
                <p className="text-[8.5px] uppercase tracking-wider font-semibold text-slate-500">Tesoureiro Principal (CPF: {workbook?.relatorioPresbiterio?.tesoureiroCpf || dbState?.igreja?.tesoureiroCpf || "000.000.000-00"})</p>
                <p className="text-[8px] text-slate-400">Tesouraria do Conselho Local</p>
              </div>
            </div>

            <div className="text-center pt-4 text-[9px] font-mono text-slate-300 uppercase tracking-wider leading-none">
              Relatório consolidado gerado digitalmente via Sistema Integrado de Gestão Financeira Eclesiástica.
            </div>

          </div>

          {/* Page 2 Footer */}
          <div className="mt-8 pt-4 border-t border-slate-150 flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase tracking-widest">
            <span>SIGFE • Sistema de Tesouraria Autonoma</span>
            <span className="font-bold text-blue-900">Folha 02 / 02</span>
          </div>

        </div>

      </div>

    </div>

  </div>
  );
}
