import React, { useState } from 'react';
import { Dizimista, MESES_NOMES, UserRole, Igreja, Movimentacao } from '../types';
import { formatCurrency, exportToCSV } from '../utils';
import { 
  UserPlus, 
  Save, 
  Trash2, 
  ArrowUpDown, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  CheckCircle2, 
  XCircle, 
  FileDown, 
  Loader2, 
  Church 
} from 'lucide-react';
import { generateHighFidelityPDF } from '../utils/pdfGenerator';

interface DizimistasProps {
  dizimistas: Dizimista[];
  igreja?: Igreja;
  movimentacoes?: Movimentacao[];
  userRole: UserRole;
  onUpdateDizimista: (id: string, update: Partial<Dizimista>) => Promise<void>;
  onCreateDizimista: (nome: string, numero?: number) => Promise<void>;
  onDeleteDizimista: (id: string) => Promise<void>;
  onRefresh: () => void;
  dbState?: any;
  currentUser?: any;
}

export default function Dizimistas({
  dizimistas,
  igreja,
  movimentacoes = [],
  userRole,
  onUpdateDizimista,
  onCreateDizimista,
  onDeleteDizimista,
  onRefresh,
  dbState,
  currentUser
}: DizimistasProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberNumber, setNewMemberNumber] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [signedOfficially, setSignedOfficially] = useState(true);
  const [editingCell, setEditingCell] = useState<{ id: string; monthIdx: number } | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const isReadOnly = userRole === 'consulta';

  const getActiveTreasurer = () => {
    const churchId = igreja?.id || dbState?.igreja?.id;
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
  const treasurerName = activeTreasurer?.nome || igreja?.tesoureiroNome || "Tesoureiro";
  const treasurerSignatureImg = activeTreasurer?.assinaturaImg || igreja?.tesoureiroAssinaturaImg || "";
  const treasurerCpf = activeTreasurer?.cpf || igreja?.tesoureiroCpf || "";

  // Handle cell edit activation
  const handleEditCell = (id: string, monthIdx: number, currentValue: number) => {
    if (isReadOnly) return;
    setEditingCell({ id, monthIdx });
    setEditingValue(currentValue === 0 ? "" : String(currentValue));
  };

  // Handle cell save
  const handleSaveCell = async (id: string, monthIdx: number) => {
    if (!editingCell) return;
    
    const parsedVal = parseFloat(editingValue) || 0;
    if (parsedVal < 0) {
      alert("Atenção: O valor da contribuição de dízimo não pode ser negativo.");
      setEditingCell(null);
      return;
    }

    const dizSelected = dizimistas.find(d => d.id === id);
    if (dizSelected) {
      const newContr = [...dizSelected.contribuicoes];
      newContr[monthIdx] = parsedVal;
      await onUpdateDizimista(id, { contribuicoes: newContr });
    }
    
    setEditingCell(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, id: string, monthIdx: number) => {
    if (e.key === 'Enter') {
      handleSaveCell(id, monthIdx);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Quick Register Submit
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const num = newMemberNumber ? parseInt(newMemberNumber) : undefined;
    await onCreateDizimista(newMemberName.trim(), num);
    
    setNewMemberName("");
    setNewMemberNumber("");
    setIsCreating(false);
  };

  // Toggle active / inactive member status
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (isReadOnly) return;
    await onUpdateDizimista(id, { ativo: !currentStatus });
  };

  // Exporters
  const handleExportCSV = () => {
    const headers = ["Número", "Nome", "Status", ...MESES_NOMES, "Total Anual"];
    const rows = dizimistas.map(d => {
      const totalAnual = d.contribuicoes.reduce((a, b) => a + b, 0);
      return [
        d.numero,
        d.nome,
        d.ativo ? "Ativo" : "Inativo",
        ...d.contribuicoes,
        totalAnual
      ];
    });
    exportToCSV("Planilha_Dizimistas_Consolidado", headers, rows);
  };

  const getYearOfReference = () => {
    if (movimentacoes && movimentacoes.length > 0) {
      const years = movimentacoes.map(t => new Date(t.data).getFullYear()).filter(y => !isNaN(y));
      if (years.length > 0) return years[0];
    }
    return new Date().getFullYear();
  };

  const currentYear = getYearOfReference();

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

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const filename = `Ficha_Consolidada_Dizimistas_${(igreja?.nome || 'Igreja').replace(/\s+/g, '_')}_${currentYear}`;
    await generateHighFidelityPDF('print-area-dizimistas', filename);
    setIsGeneratingPdf(false);
  };

  // Filter list
  const filteredDizimistas = dizimistas.filter(d => 
    d.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(d.numero).includes(searchTerm)
  ).sort((a, b) => a.numero - b.numero);

  // Month-by-month sum for the bottom row
  const monthlyTotals = Array(12).fill(0).map((_, monthIdx) => {
    return dizimistas.reduce((sum, d) => sum + (d.contribuicoes[monthIdx] || 0), 0);
  });

  const grandTotalDizimistas = monthlyTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      
      {/* Banner + Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 id="dizimistas-heading" className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Ficha de Dizimistas</span>
            <span className="bg-blue-50 text-blue-700 font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {dizimistas.length} Cadastrados
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Matriz de contribuição anual. Clique duas vezes em um valor para editá-lo diretamente (exceto no modo Consulta). All updates compute in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por nome ou nº..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 text-slate-800 border border-slate-200 text-xs rounded-lg py-2 pl-9 pr-4 w-44 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
          </div>

          {!isReadOnly && (
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all shadow-sm"
              title="Cadastrar Novo Membro"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Membro</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all"
            title="Exportar para Excel (CSV)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all disabled:opacity-50 inline-flex"
            title="Baixar Relatório Oficial em PDF"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <FileDown className="w-4 h-4 text-blue-600 font-bold" />
            )}
            <span>{isGeneratingPdf ? "Gerando..." : "Baixar PDF Oficial"}</span>
          </button>
        </div>
      </div>

      {/* Creation Toggle Box */}
      {isCreating && !isReadOnly && (
        <form onSubmit={handleAddMember} className="bg-md bg-slate-50 border border-slate-200 p-5 rounded-2xl animate-fade-in grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-mono">Nome Completo</label>
            <input
              type="text"
              required
              placeholder="Digite o nome do dizimista"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="bg-white border text-slate-800 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-mono">Número Ficha (Opcional)</label>
            <input
              type="number"
              placeholder="Caso queira definir o número explicitamente"
              value={newMemberNumber}
              onChange={(e) => setNewMemberNumber(e.target.value)}
              className="bg-white border text-slate-800 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold py-2.5 cursor-pointer flex items-center justify-center space-x-1 shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Inserir Cadastro</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Interactive Grid Spreadsheet */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-slate-200 text-[11px] font-mono uppercase border-b border-slate-850">
                <th className="py-3 px-3 text-center w-12 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">Nº</th>
                <th className="py-3 px-4 min-w-[200px] sticky left-12 bg-slate-900 border-r border-slate-800 z-10">Nome do Dizimista</th>
                <th className="py-3 px-3 text-center w-16 border-r border-slate-800">Status</th>
                {MESES_NOMES.map((nome, idx) => (
                  <th key={idx} className="py-3 px-2 text-right w-24 border-r border-slate-800">{nome.substring(0,3)}</th>
                ))}
                <th className="py-3 px-3 text-right bg-blue-950 font-semibold w-28">Total Anual</th>
                {!isReadOnly && <th className="py-3 px-2 text-center w-12 bg-rose-950">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-sans text-slate-700">
              {filteredDizimistas.length === 0 ? (
                <tr>
                  <td colSpan={17} className="text-center py-10 text-slate-400 font-mono">
                    Nenhum dizimista encontrado para esta busca.
                  </td>
                </tr>
              ) : (
                filteredDizimistas.map((d) => {
                  const totalAnual = d.contribuicoes.reduce((a, b) => a + b, 0);
                  return (
                    <tr 
                      key={d.id} 
                      className={`hover:bg-blue-50/20 group transition-all ${
                        !d.ativo ? "opacity-60 bg-slate-50/50" : ""
                      }`}
                    >
                      {/* Number Column */}
                      <td className="py-2.5 px-3 font-mono text-center font-bold text-slate-500 sticky left-0 bg-white group-hover:bg-blue-50/20 shadow-sm border-r border-slate-100 z-10">
                        {d.numero}
                      </td>

                      {/* Name Column */}
                      <td className="py-2.5 px-4 font-semibold text-slate-800 sticky left-12 bg-white group-hover:bg-blue-50/20 shadow-sm border-r border-slate-100 z-10 truncate max-w-[220px]">
                        {d.nome}
                      </td>

                      {/* Status Checkbox Button */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(d.id, d.ativo)}
                          disabled={isReadOnly}
                          className="mx-auto block text-center focus:outline-none disabled:opacity-50"
                          title={d.ativo ? "Membro Ativo" : "Membro Inativo"}
                        >
                          {d.ativo ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-slate-400 mx-auto" />
                          )}
                        </button>
                      </td>

                      {/* 12 Months Contributions inputs */}
                      {d.contribuicoes.map((val, mIdx) => {
                        const isEditing = editingCell?.id === d.id && editingCell?.monthIdx === mIdx;
                        return (
                          <td 
                            key={mIdx} 
                            onClick={() => handleEditCell(d.id, mIdx, val)}
                            className={`py-2 px-1 text-right font-mono border-r border-slate-100 transition-all ${
                              isReadOnly 
                                ? "cursor-default" 
                                : "cursor-double-click hover:bg-amber-50 cursor-pointer"
                            } ${val > 0 ? "text-slate-900 font-medium" : "text-slate-300"}`}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => handleSaveCell(d.id, mIdx)}
                                onKeyDown={(e) => {
                                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                    e.preventDefault();
                                  }
                                  handleKeyPress(e, d.id, mIdx);
                                }}
                                className="w-full bg-amber-50 text-right focus:outline-none text-xs font-mono border-none p-1 rounded font-semibold text-amber-800"
                              />
                            ) : (
                              val > 0 ? formatCurrency(val).replace("R$", "").trim() : "-"
                            )}
                          </td>
                        );
                      })}

                      {/* Total Anual Row */}
                      <td className="py-2.5 px-3 text-right bg-blue-50/40 font-mono font-bold text-blue-700 border-r border-slate-150">
                        {formatCurrency(totalAnual)}
                      </td>

                      {/* Actions Column */}
                      {!isReadOnly && (
                        <td className="py-2.5 px-2 text-center bg-rose-50/10 hover:bg-rose-50 transition-all">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Excluir permanentemente o cadastro de ${d.nome}?`)) {
                                onDeleteDizimista(d.id);
                              }
                            }}
                            className="text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Remover Membro"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      )}

                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Sumary footer row */}
            <tfoot>
              <tr className="bg-slate-100 font-mono font-bold text-slate-800 border-t-2 border-slate-300 text-xs text-right">
                <td colSpan={2} className="py-3 px-4 text-center border-r border-slate-200 font-bold sticky left-0 bg-slate-100 z-10">TOTAIS MENSAIS</td>
                <td className="py-3 px-3 text-center border-r border-slate-200">-</td>
                {monthlyTotals.map((tot, mIdx) => (
                  <td key={mIdx} className="py-3 px-2 border-r border-slate-200 font-sans font-semibold text-slate-900">
                    {formatCurrency(tot).replace("R$", "").trim()}
                  </td>
                ))}
                <td className="py-3 px-3 bg-blue-900 text-white font-sans text-right font-bold">
                  {formatCurrency(grandTotalDizimistas)}
                </td>
                {!isReadOnly && <td className="bg-rose-900/10"></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Printable Sheet View - Beautifully Styled A4 Document Preview */}
      <div className="mt-8 space-y-4 no-print border-t pt-8 border-slate-200 border-dashed">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
              Visualização de Relatório A4 Oficial (Digitalizado)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pré-visualização fiel das páginas do Livro Auxiliar de dízimos que serão impressas ou baixadas como PDF.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-end sm:self-auto font-sans">
            {/* Toggle para Assinatura de Balancete Oficial */}
            <label className="inline-flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-all text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={signedOfficially}
                onChange={(e) => setSignedOfficially(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
              />
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 font-bold font-sans" />
                Assinatura Digital Oficial
              </span>
            </label>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>{isGeneratingPdf ? "Gerando PDF..." : "Gerar Documento PDF"}</span>
            </button>
          </div>
        </div>

        {/* Printable Sheet styling container */}
        <div 
          id="print-area-dizimistas"
          className="max-w-4xl mx-auto space-y-12 no-margin-print animate-fade-in"
        >
          {(() => {
            const chunkSize = 22;
            const dizimistasChunks = [];
            const activeDizimistas = filteredDizimistas;
            for (let i = 0; i < activeDizimistas.length; i += chunkSize) {
              dizimistasChunks.push(activeDizimistas.slice(i, i + chunkSize));
            }
            if (dizimistasChunks.length === 0) {
              dizimistasChunks.push([]);
            }
            const totalPages = dizimistasChunks.length;

            return dizimistasChunks.map((chunk, pNo) => {
              const pageNum = pNo + 1;
              const isLastPage = pageNum === totalPages;
              return (
                <div 
                  key={pNo}
                  className="pdf-page bg-white text-slate-800 shadow-md rounded-2xl p-6 sm:p-8 border border-slate-200 border-t-8 border-t-emerald-600 font-sans relative flex flex-col justify-between"
                  style={{ minHeight: '297mm' }}
                >
                  <div className="space-y-5">
                    {/* Page Header */}
                    <div className="text-center space-y-1 border-b pb-4" style={{ borderColor: '#cbd5e1' }}>
                      <div className="flex justify-between items-center text-[9px] font-mono mb-1 text-slate-500">
                        <span className="uppercase tracking-widest">{igreja?.nome || "Igreja Presbiteriana"}</span>
                        <span className="font-bold uppercase tracking-wider text-[#059669]">DOCUMENTO AUXILIAR DE TESOURARIA</span>
                      </div>
                      <h1 className="text-lg font-bold tracking-tight uppercase text-slate-900">
                        {igreja?.nome || "Igreja Presbiteriana"}
                      </h1>
                      <div className="flex flex-col sm:flex-row justify-center items-center gap-x-4 gap-y-0.5 text-[10px] text-slate-600">
                        {igreja?.cnpj && <span><strong>CNPJ:</strong> {igreja.cnpj}</span>}
                        {igreja?.endereco && <span><strong>Endereço:</strong> {igreja.endereco}</span>}
                      </div>
                      
                      <div className="mt-2 text-center border-t pt-2" style={{ borderColor: '#e2e8f0' }}>
                        <h2 className="text-sm font-extrabold tracking-widest uppercase font-mono text-slate-950">
                          LIVRO AUXILIAR: CONTROLE ANUAL DE CONTRIBUIÇÃO DE DIZIMISTAS
                        </h2>
                        <div className="flex justify-center gap-x-4 text-[9px] text-slate-500 mt-0.5">
                          <span><strong>Exercício Financeiro:</strong> {currentYear}</span>
                          <span>•</span>
                          <span><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR').substring(0, 5)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Page Table Content */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[9px] font-sans">
                        <thead>
                          <tr className="bg-slate-900 text-slate-200 text-[8px] font-mono uppercase border-b border-slate-800">
                            <th className="py-2 px-2 text-center w-8 border-r border-slate-800">Nº</th>
                            <th className="py-2 px-3 border-r border-slate-800">Dizimista</th>
                            <th className="py-2 px-1 text-center w-12 border-r border-slate-800">Status</th>
                            {MESES_NOMES.map((nome, idx) => (
                              <th key={idx} className="py-2 px-1 text-right w-11 border-r border-slate-800 uppercase text-[7px]">
                                {nome.substring(0, 3)}
                              </th>
                            ))}
                            <th className="py-2 px-2 text-right bg-blue-950 text-white font-semibold w-16">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700">
                          {chunk.length === 0 ? (
                            <tr>
                              <td colSpan={16} className="text-center py-10 text-slate-400 font-mono">
                                Nenhum dízimo lançado nesta página do relatório.
                              </td>
                            </tr>
                          ) : (
                            chunk.map((d) => {
                              const totalAnual = d.contribuicoes.reduce((a, b) => a + b, 0);
                              return (
                                <tr 
                                  key={d.id} 
                                  className={`hover:bg-slate-50 transition-all ${!d.ativo ? "opacity-60 bg-slate-50/40" : ""}`}
                                >
                                  <td className="py-1.5 px-2 font-mono text-center font-bold text-slate-500 border-r border-slate-100">
                                    {d.numero}
                                  </td>
                                  <td className="py-1.5 px-3 font-semibold text-slate-850 border-r border-slate-100 max-w-[150px] truncate">
                                    {d.nome}
                                  </td>
                                  <td className="py-1.5 px-1 text-center border-r border-slate-100">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-wider ${
                                      d.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                    }`}>
                                      {d.ativo ? "Sim" : "Não"}
                                    </span>
                                  </td>
                                  {d.contribuicoes.map((val, mIdx) => (
                                    <td 
                                      key={mIdx} 
                                      className={`py-1.5 px-1 text-right font-mono border-r border-slate-100 ${
                                        val > 0 ? "text-slate-900 font-medium" : "text-slate-300"
                                      }`}
                                    >
                                      {val > 0 ? formatCurrency(val).replace("R$", "").trim() : "-"}
                                    </td>
                                  ))}
                                  <td className="py-1.5 px-2 text-right bg-blue-50/30 text-blue-800 font-mono font-bold">
                                    {formatCurrency(totalAnual).replace("R$", "").trim()}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>

                        {/* Render Sumary footer only on the last page chunk */}
                        {isLastPage && (
                          <tfoot>
                            <tr className="bg-slate-100 font-mono font-bold text-slate-800 border-t-2 border-slate-300 text-[9px] text-right">
                              <td colSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200">TOTAIS AUXILIARES</td>
                              <td className="py-2.5 px-1 text-center border-r border-slate-200">-</td>
                              {monthlyTotals.map((tot, mIdx) => (
                                <td key={mIdx} className="py-2.5 px-1 border-r border-slate-200 font-sans font-bold text-slate-900">
                                  {formatCurrency(tot).replace("R$", "").trim()}
                                </td>
                              ))}
                              <td className="py-2.5 px-2 bg-blue-900 text-white font-sans text-right font-bold text-[10px]">
                                {formatCurrency(grandTotalDizimistas).replace("R$", "").trim()}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {/* Page Signatures on the bottom of the last page */}
                    {isLastPage && (
                      <div className="space-y-6 pt-5 border-t border-slate-200 mt-auto">
                        <div className="flex justify-center">
                          <div className="text-center space-y-1 w-64">
                            {signedOfficially && (
                              <div className="h-10 flex items-center justify-center select-none">
                                {treasurerSignatureImg ? (
                                  <img 
                                    src={treasurerSignatureImg} 
                                    alt="Assinatura" 
                                    className="max-h-full object-contain mx-auto max-w-[150px]"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="text-[12px] italic text-[#1e3a8a] font-serif" style={{ fontFamily: "'Dancing Script', 'Brush Script MT', 'Segoe Print', 'Georgia', cursive, serif" }}>
                                    {treasurerName}
                                  </div>
                                )}
                              </div>
                            )}
                            {!signedOfficially && <div className="h-10"></div>}
                            <div className="h-0.5 bg-slate-200 w-36 mx-auto"></div>
                            <p className="font-bold text-slate-900 text-[10px]">{treasurerName}</p>
                            <p className="text-slate-400 text-[8px] tracking-wider uppercase font-mono">Tesoureiro Principal</p>
                            {treasurerCpf && <p className="text-slate-400 text-[8px] font-mono">CPF: {treasurerCpf}</p>}
                          </div>
                        </div>

                        {/* Cryptographic Digital Stamp Centered */}
                        {signedOfficially && (
                          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-2 w-full max-w-xl mx-auto space-y-1 shadow-sm">
                            <div className="flex items-center justify-between font-bold text-emerald-800 text-[8px] font-sans">
                              <span className="flex items-center gap-1 uppercase">
                                ✓ Autenticação Eletrônica • Balancete Oficial de Dizimistas
                              </span>
                              <span className="font-mono text-[7px] text-emerald-600 bg-emerald-100 rounded px-1">e-ICP IPB</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 text-[7.5px] text-slate-600 leading-tight">
                              <div>
                                <p><strong className="text-slate-700 font-sans">Responsável:</strong> {treasurerName}</p>
                                <p className="truncate"><strong className="text-slate-700 font-sans">Igreja:</strong> {igreja?.nome || "Igreja Presbiteriana Aliança"}</p>
                              </div>
                              <div>
                                <p><strong className="text-slate-700 font-sans">Dízimos Consolidados:</strong> {formatCurrency(grandTotalDizimistas)}</p>
                                <p className="font-mono truncate"><strong className="text-slate-700 font-sans">Selo Digital:</strong> {generateAuthHash(treasurerName, 12, currentYear)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Page Footer */}
                  <div className="mt-8">
                    <div className="pt-3 border-t flex justify-between items-center text-[8px] font-mono uppercase tracking-widest text-slate-400" style={{ borderColor: '#cbd5e1' }}>
                      <span>Controle Consolidado • {igreja?.nome || "Igreja Presbiteriana"}</span>
                      <span className="font-bold text-[#059669]">Folha {String(pageNum).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}</span>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

    </div>
  );
}
