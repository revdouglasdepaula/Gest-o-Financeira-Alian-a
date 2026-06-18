import React, { useRef, useState } from 'react';
import { WorkbookPayload } from '../api';
import { formatCurrency, formatPercent } from '../utils';
import { Printer, Receipt, FileText, Calendar, Church, FileCheck, Landmark, Download, Loader2, Upload, X, ShieldAlert } from 'lucide-react';
import { generateHighFidelityPDF } from '../utils/pdfGenerator';

interface PresbiterioTabProps {
  workbook: WorkbookPayload | null;
  dbState?: any;
  onSaveConfig?: (payload: { igreja?: any; configuracoes?: any }) => Promise<void>;
  currentUser?: any;
}

export default function PresbiterioTab({ workbook, dbState, onSaveConfig, currentUser }: PresbiterioTabProps) {
  const reportRef = useRef<HTMLDivElement>(null);
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
        <span className="ml-3 text-slate-600 font-medium font-mono">Gerando relatório institucional...</span>
      </div>
    );
  }

  const { relatorioPresbiterio } = workbook;

  // Custom trigger for printing. We styled the container with 'print-section' custom css classes
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    // Let state update render the transition
    await new Promise((resolve) => setTimeout(resolve, 300));
    const success = await generateHighFidelityPDF('print-area-documento', `Relatorio_ao_Presbiterio_${relatorioPresbiterio.nomeIgreja.replace(/\s+/g, '_')}`);
    setIsGeneratingPdf(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper informational bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4 no-print">
        <div>
          <h2 id="presbytery-report-title" className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Relatório Anual ao Presbitério</span>
            <span className="bg-blue-50 text-blue-700 font-mono text-xs font-semibold px-2 rounded-full">
              Oficial
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Geração instantânea em formato folha A4 timbrada oficial para arquivamento e prestação de contas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
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

      {/* Printable Sheet styling container */}
      <div 
        ref={reportRef} 
        className="bg-white text-slate-800 shadow-md rounded-2xl p-6 sm:p-8 border border-slate-200 border-t-8 border-t-blue-900 max-w-4xl mx-auto font-serif"
        id="print-area-documento"
      >
        
        {/* Document Header */}
        <div className="text-center space-y-1 border-b-2 border-slate-100 pb-4 mb-4">
          <div className="mx-auto bg-blue-50 text-blue-900 w-10 h-10 rounded-full flex items-center justify-center mb-1 no-print">
            <Church className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase font-sans text-blue-950">
            {relatorioPresbiterio.nomeIgreja}
          </h1>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">
            CNPJ: {relatorioPresbiterio.cnpj}
          </p>
          <p className="text-[11px] text-slate-400 font-sans tracking-wide">
            {relatorioPresbiterio.endereco}
          </p>
          <div className="inline-block bg-slate-50 border border-slate-150 rounded px-2.5 py-0.5 mt-1 text-[9px] font-mono font-semibold uppercase text-slate-700">
            Relatório de Tesouraria Geral • Exercício Financeiro Ativo
          </div>
        </div>

        {/* Dynamic content statement */}
        <div className="space-y-4 font-sans text-xs">
          
          {/* Section 1: Cabinet and Pastoral details */}
          <section className="space-y-2">
            <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-blue-900 pl-2">
              1. Identificação Geral
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
              <div className="space-y-1">
                <span className="text-blue-900 font-mono font-bold uppercase tracking-wider text-[9px] block">Pastor Presidente</span>
                <p className="font-bold text-slate-900 text-sm">{relatorioPresbiterio.pastorResponsavel || "Não informado"}</p>
                <div className="text-slate-600 font-sans space-y-0.5 pt-0.5 text-[11px]">
                  <p><span className="text-slate-400 font-medium">CPF:</span> {relatorioPresbiterio.pastorCpf || "000.000.000-00"}</p>
                  <p className="text-slate-500 text-[10px]">Presidente do Conselho</p>
                </div>
              </div>
              <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-slate-200 pt-2.5 sm:pt-0">
                <span className="text-blue-900 font-mono font-bold uppercase tracking-wider text-[9px] block">Tesoureiro Principal</span>
                <p className="font-bold text-slate-900 text-sm">{relatorioPresbiterio.tesoureiroNome || "Não informado / Cadastrado"}</p>
                <div className="text-slate-600 font-sans space-y-0.5 pt-0.5 text-[11px]">
                  <p><span className="text-slate-400 font-medium">CPF:</span> {relatorioPresbiterio.tesoureiroCpf || "000.000.000-00"}</p>
                  <p><span className="text-slate-400 font-medium">Celular:</span> {relatorioPresbiterio.tesoureiroTelefone || "Não cadastrado"}</p>
                </div>
              </div>
              <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-slate-200 pt-2.5 sm:pt-0">
                <span className="text-blue-900 font-mono font-bold uppercase tracking-wider text-[9px] block">Segundo Tesoureiro</span>
                {relatorioPresbiterio.segundoTesoureiroNome ? (
                  <>
                    <p className="font-bold text-slate-900 text-sm">{relatorioPresbiterio.segundoTesoureiroNome}</p>
                    <div className="text-slate-600 font-sans space-y-0.5 pt-0.5 text-[11px]">
                      <p><span className="text-slate-400 font-medium">Celular:</span> {relatorioPresbiterio.segundoTesoureiroTelefone || "Não cadastrado"}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-450 italic pt-1 text-[11px]">Nenhum segundo tesoureiro eleito pelo Conselho Local.</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 2: Statistical Ledger */}
          <section className="space-y-2">
            <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-blue-900 pl-2">
              2. Dados Estatísticos e Demográficos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center font-sans">
              <div className="border border-slate-150 p-2.5 rounded-xl">
                <span className="text-slate-400 text-[9px] block font-semibold uppercase tracking-wider">Membros Comungantes</span>
                <span className="text-lg font-bold text-slate-900 block mt-0.5">{relatorioPresbiterio.totalMembrosAtivos} ativos</span>
              </div>
              <div className="border border-slate-150 p-2.5 rounded-xl">
                <span className="text-slate-400 text-[9px] block font-semibold uppercase tracking-wider">Dizimistas Cadastrados</span>
                <span className="text-lg font-bold text-slate-900 block mt-0.5">{relatorioPresbiterio.dizimistasAtivosContagem} pessoas</span>
              </div>
              <div className="border border-slate-150 p-2.5 rounded-xl">
                <span className="text-slate-400 text-[9px] block font-semibold uppercase tracking-wider">Índice Fidelização</span>
                <span className="text-lg font-bold text-blue-600 block mt-0.5">{formatPercent(relatorioPresbiterio.percentualParticipacaoDizimo)}</span>
              </div>
            </div>
          </section>

          {/* Section 3: Patrimonial Balance Sheet (Integrated Assets) */}
          <section className="space-y-2">
            <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-blue-900 pl-2">
              3. Balanço do Ativo Circulante & Reservas
            </h3>
            <div className="overflow-hidden border border-slate-150 rounded-xl">
              <table className="w-full text-left font-sans text-[11px]">
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
                    <td className="py-1.5 px-3 font-medium text-slate-700">Contas Correntes Bancárias</td>
                    <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(relatorioPresbiterio.bancoInicialJan)}</td>
                    <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(relatorioPresbiterio.bancoFinalDez)}</td>
                    <td className={`py-1.5 px-3 text-right font-mono font-medium ${relatorioPresbiterio.bancoFinalDez >= relatorioPresbiterio.bancoInicialJan ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(relatorioPresbiterio.bancoFinalDez - relatorioPresbiterio.bancoInicialJan)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-medium text-slate-700">Aplicações Financeiras / Investimentos</td>
                    <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(relatorioPresbiterio.investInicialJan)}</td>
                    <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(relatorioPresbiterio.investFinalDez)}</td>
                    <td className={`py-1.5 px-3 text-right font-mono font-medium ${relatorioPresbiterio.investFinalDez >= relatorioPresbiterio.investInicialJan ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(relatorioPresbiterio.investFinalDez - relatorioPresbiterio.investInicialJan)}
                    </td>
                  </tr>
                  <tr className="bg-blue-900/5 font-bold border-t border-slate-200">
                    <td className="py-2 px-3 text-blue-950 font-semibold">Consolidação Ativos Totais</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-900">{formatCurrency(relatorioPresbiterio.totalInicialJan)}</td>
                    <td className="py-2 px-3 text-right font-mono text-blue-900">{formatCurrency(relatorioPresbiterio.totalFinalDez)}</td>
                    <td className={`py-2 px-3 text-right font-mono ${relatorioPresbiterio.totalFinalDez >= relatorioPresbiterio.totalInicialJan ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(relatorioPresbiterio.totalFinalDez - relatorioPresbiterio.totalInicialJan)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: Demonstrativo do Resultado do Exercício (Inflow vs Outflows) */}
          <section className="space-y-2">
            <h3 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider border-l-4 border-blue-900 pl-2">
              4. Demonstração de Resultado e Exercício Anual (DRE)
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
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.receitaDizimos)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span className="text-slate-500">Ofertas de Culto:</span>
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.receitaOfertas)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span className="text-slate-500">Auxílio de Ministérios:</span>
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.receitaMinisterios)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span className="text-slate-500">Outras Fontes de Caixa:</span>
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.receitaOutras)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 text-emerald-800 text-xs">
                    <span>FATURAMENTO REAL:</span>
                    <span className="font-mono">{formatCurrency(relatorioPresbiterio.totalReceitas)}</span>
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
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.despesaClero)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span className="text-slate-500">Zeladoria e Encargos:</span>
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.despesaFuncionarios)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span className="text-slate-500">Missions & Eventos:</span>
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.despesaAtividades)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span className="text-slate-500">Operacionais:</span>
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.despesaOperacionais)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span className="text-slate-500">Patrimônio / Reformas:</span>
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.despesaConservacao)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span className="text-slate-500">Contr. Presbiteriais:</span>
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.despesaContribuicaoEstatutaria)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-0.5">
                    <span className="text-slate-500">Diversas Despesas:</span>
                    <span className="font-mono font-semibold">{formatCurrency(relatorioPresbiterio.despesaOutras)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 text-rose-800 text-xs">
                    <span>SOMA DESPESAS:</span>
                    <span className="font-mono">{formatCurrency(relatorioPresbiterio.totalDespesas)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* General Surplus/Deficit summary */}
            <div className={`p-2.5 rounded-xl border font-sans text-center ${
              relatorioPresbiterio.superavitDeficit >= 0 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <span className="text-[9px] block font-bold uppercase tracking-widest font-mono">Consolidação de Desempenho Líquido</span>
              <span className="text-base font-bold mt-0.5 block">
                {relatorioPresbiterio.superavitDeficit >= 0 ? "SUPERÁVIT" : "DEFICIT"} ANUAL DA TESOURARIA: {formatCurrency(relatorioPresbiterio.superavitDeficit)}
              </span>
            </div>
          </section>

          {/* Official Endnotes signatures block */}
          <div className="pt-4 mt-4 border-t flex flex-col items-center text-center text-xs text-slate-500 font-sans" style={{ borderColor: '#cbd5e1' }}>
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
                      <strong className="text-slate-800">Assinatura:</strong> Relatório ao Presbitério
                    </p>
                    <p className="text-slate-400 font-mono truncate text-[6px] m-0 p-0 leading-tight text-left">
                      <strong className="text-slate-800">Verificação:</strong> {generateAuthHash(treasurerName, 98, 2026)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-14 flex items-end justify-center w-full">
                  <div className="border-b border-dashed w-2/3 mb-2 border-slate-300"></div>
                </div>
              )}
              
              <p className="font-bold text-slate-850 text-xs mt-2">{treasurerName}</p>
              <p className="text-[8.5px] uppercase tracking-wider font-semibold text-slate-500">Tesoureiro Principal (CPF: {relatorioPresbiterio.tesoureiroCpf || dbState?.igreja?.tesoureiroCpf || "000.000.000-00"})</p>
              <p className="text-[8px] text-slate-400">Tesouraria do Conselho Local</p>
            </div>
          </div>

          <div className="text-center pt-4 text-[9px] font-mono text-slate-300 uppercase tracking-wider leading-none">
            Relatório gerado digitalmente via Sistema Integrado de Gestão Financeira Eclesiástica.
          </div>

        </div>

      </div>

    </div>
  );
}
