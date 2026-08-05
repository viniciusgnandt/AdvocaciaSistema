import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportarExcel(linhas: Record<string, string | number>[], nomeArquivo: string) {
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Dados');
  XLSX.writeFile(livro, `${nomeArquivo}.xlsx`);
}

export function exportarPdf(titulo: string, colunas: string[], linhas: (string | number)[][], nomeArquivo: string) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(titulo, 14, 16);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString('pt-BR'), 14, 22);
  autoTable(doc, {
    head: [colunas],
    body: linhas,
    startY: 27,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${nomeArquivo}.pdf`);
}
