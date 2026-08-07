import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buscarTenant } from './api';

export function exportarExcel(linhas: Record<string, string | number>[], nomeArquivo: string) {
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Dados');
  XLSX.writeFile(livro, `${nomeArquivo}.xlsx`);
}

async function carregarImagemComoDataUrl(url: string): Promise<string | null> {
  try {
    const resposta = await fetch(url);
    const blob = await resposta.blob();
    return await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result as string);
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportarPdf(titulo: string, colunas: string[], linhas: (string | number)[][], nomeArquivo: string) {
  const doc = new jsPDF();
  const larguraPagina = doc.internal.pageSize.getWidth();

  let nomeEscritorio: string | undefined;
  let logoUrl: string | undefined;
  try {
    const tenant = await buscarTenant();
    nomeEscritorio = tenant.nome_escritorio;
    logoUrl = tenant.logo_url;
  } catch {
    nomeEscritorio = undefined;
  }
  const logoDataUrl = logoUrl ? await carregarImagemComoDataUrl(logoUrl) : null;

  let cursorY = 16;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 14, 8, 14, 14);
    } catch {
      // formato de imagem que o jsPDF nao reconhece (ex.: webp) - segue sem logo
    }
  }
  const inicioTextoX = logoDataUrl ? 32 : 14;
  if (nomeEscritorio) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(nomeEscritorio, larguraPagina - 14, 12, { align: 'right' });
    doc.setTextColor(0);
  }

  doc.setFontSize(14);
  doc.text(titulo, inicioTextoX, cursorY);
  cursorY += 6;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleDateString('pt-BR'), inicioTextoX, cursorY);
  doc.setTextColor(0);

  autoTable(doc, {
    head: [colunas],
    body: linhas,
    startY: cursorY + 5,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [31, 102, 100] },
  });

  const totalPaginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    doc.setPage(pagina);
    const alturaPagina = doc.internal.pageSize.getHeight();

    if (nomeEscritorio) {
      try {
        doc.saveGraphicsState();
        doc.setFontSize(60);
        doc.setTextColor(230);
        // @ts-expect-error GState existe em runtime no jspdf mas nao no tipo instalado
        doc.setGState(new doc.GState({ opacity: 0.15 }));
        doc.text(nomeEscritorio, larguraPagina / 2, alturaPagina / 2, { align: 'center', angle: 35 });
        doc.restoreGraphicsState();
      } catch {
        // marca d'agua e' cosmetica - nunca deve impedir o download do PDF
      }
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${pagina} de ${totalPaginas}`, larguraPagina - 14, alturaPagina - 8, { align: 'right' });
    doc.setTextColor(0);
  }

  doc.save(`${nomeArquivo}.pdf`);
}

/** Monta um PDF de texto corrido (para minutas geradas pelo Copiloto IA), com o
 * mesmo cabeçalho/marca d'água usados nos demais exports. Retorna o jsPDF pronto
 * para .save() ou .output('blob') - quem chama decide o destino. */
export async function montarPdfTexto(titulo: string, texto: string): Promise<jsPDF> {
  const doc = new jsPDF();
  const larguraPagina = doc.internal.pageSize.getWidth();
  const alturaPagina = doc.internal.pageSize.getHeight();
  const margem = 18;

  let nomeEscritorio: string | undefined;
  let logoUrl: string | undefined;
  try {
    const tenant = await buscarTenant();
    nomeEscritorio = tenant.nome_escritorio;
    logoUrl = tenant.logo_url;
  } catch {
    nomeEscritorio = undefined;
  }
  const logoDataUrl = logoUrl ? await carregarImagemComoDataUrl(logoUrl) : null;

  let cursorY = 16;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 14, 8, 14, 14);
    } catch {
      // formato que o jsPDF nao reconhece - segue sem logo
    }
  }
  const inicioTextoX = logoDataUrl ? 32 : 14;
  if (nomeEscritorio) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(nomeEscritorio, larguraPagina - 14, 12, { align: 'right' });
    doc.setTextColor(0);
  }

  doc.setFontSize(14);
  doc.text(titulo, inicioTextoX, cursorY);
  cursorY += 6;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleDateString('pt-BR'), inicioTextoX, cursorY);
  doc.setTextColor(0);
  cursorY += 8;

  doc.setFontSize(10);
  const linhas = doc.splitTextToSize(texto, larguraPagina - margem * 2);
  const alturaLinha = 5.2;
  for (const linha of linhas) {
    if (cursorY > alturaPagina - margem) {
      doc.addPage();
      cursorY = margem;
    }
    doc.text(linha, margem, cursorY);
    cursorY += alturaLinha;
  }

  const totalPaginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    doc.setPage(pagina);
    if (nomeEscritorio) {
      try {
        doc.saveGraphicsState();
        doc.setFontSize(60);
        doc.setTextColor(230);
        // @ts-expect-error GState existe em runtime no jspdf mas nao no tipo instalado
        doc.setGState(new doc.GState({ opacity: 0.15 }));
        doc.text(nomeEscritorio, larguraPagina / 2, alturaPagina / 2, { align: 'center', angle: 35 });
        doc.restoreGraphicsState();
      } catch {
        // marca d'agua e' cosmetica - nunca deve impedir o PDF
      }
    }
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${pagina} de ${totalPaginas}`, larguraPagina - 14, alturaPagina - 8, { align: 'right' });
    doc.setTextColor(0);
  }

  return doc;
}
