/**
 * Utilities for formatting, exporting and helpers
 */

// Format value as BRL currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value || 0);
}

// Format percent
export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format((value || 0) / 100);
}

// Format date to locale string YYYY-MM-DD -> DD/MM/YYYY
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

// Export array of objects to Excel-Compatible CSV
export function exportToCSV(filename: string, headers: string[], rows: any[][]) {
  // UTF-8 BOM so Excel opens letters and accents correctly in PT-BR
  const BOM = "\uFEFF";
  let csvContent = BOM;

  // Header row
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(";") + "\r\n";

  // Data rows
  rows.forEach(row => {
    const rowStr = row.map(cell => {
      if (cell === null || cell === undefined) return '""';
      const cellStr = String(cell);
      // Escape quotes
      return `"${cellStr.replace(/"/g, '""')}"`;
    }).join(";");
    csvContent += rowStr + "\r\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

import { LISTA_MINISTERIOS, Movimentacao, MinisterioItem } from './types';

export interface MinisterioBalance {
  sigla: string;
  nome: string;
  saldoInicial: number;
  entradas: number;
  saidas: number;
  saldoAtual: number;
}

export function computeMinistriesBalances(
  movimentacoes: Movimentacao[],
  saldosIniciais: { [sigla: string]: number } = {},
  atMonthIndex?: number, // 0 to 11
  listaMinisterios: MinisterioItem[] = LISTA_MINISTERIOS
): {
  ministerios: MinisterioBalance[];
  totalMinisterios: number;
} {
  const result: MinisterioBalance[] = (listaMinisterios || LISTA_MINISTERIOS).map(m => {
    const sigla = m.sigla;
    const saldoInicial = saldosIniciais[sigla] || 0;
    
    // Filter transactions for this ministry up to the selected month (or all)
    const filteredMovs = movimentacoes.filter(mov => {
      const matchMin = mov.ministerio === sigla;
      const matchMonth = atMonthIndex !== undefined ? mov.mes <= atMonthIndex : true;
      return matchMin && matchMonth;
    });

    const entradas = filteredMovs
      .filter(mov => mov.tipo === 'entrada')
      .reduce((sum, mov) => sum + mov.valor, 0);

    const saidas = filteredMovs
      .filter(mov => mov.tipo === 'saida')
      .reduce((sum, mov) => sum + mov.valor, 0);

    const saldoAtual = saldoInicial + entradas - saidas;

    return {
      sigla,
      nome: m.nome,
      saldoInicial,
      entradas,
      saidas,
      saldoAtual
    };
  });

  const totalMinisterios = result.reduce((sum, m) => sum + m.saldoAtual, 0);

  return {
    ministerios: result,
    totalMinisterios
  };
}
