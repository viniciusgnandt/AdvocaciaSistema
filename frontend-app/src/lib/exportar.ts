import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
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

const FONTE = 'Times New Roman';
const TAMANHO_CORPO = 24; // 12pt (docx usa meios-pontos)
const TAMANHO_TITULO = 32; // 16pt

/** Considera "titulo de secao" uma linha curta e majoritariamente em maiusculas
 * (convencao usada em pecas processuais brasileiras, ex.: "DOS PEDIDOS"). */
function pareceTituloDeSecao(linha: string): boolean {
  const texto = linha.trim();
  if (texto.length < 3 || texto.length > 100) return false;
  const letras = texto.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letras.length < 3) return false;
  return letras === letras.toUpperCase();
}

/** Enderecamento (ex.: "EXCELENTISSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A)...") -
 * convencionalmente em negrito e sem recuo, igual a um titulo de secao. */
function pareceEnderecamento(linha: string): boolean {
  return /^EXCELENT[ÍI]SSIMO/i.test(linha.trim());
}

/** Fecho da peca (ex.: "Nestes termos, pede deferimento.", "Termos em que...") -
 * sem recuo de primeira linha, mas sem negrito. */
function pareceFecho(linha: string): boolean {
  return /^(nestes termos|termos em que|pede deferimento)/i.test(linha.trim());
}

/** Linha de assinatura (nome do advogado, OAB, "(assinado digitalmente)") -
 * centralizada e em italico, como no rodape de uma peca protocolada. */
function pareceAssinatura(linha: string): boolean {
  const texto = linha.trim();
  return /assinado digitalmente|^OAB\/|OAB[\s/-]*n[ºo°]/i.test(texto);
}

/** Monta um .docx de texto corrido (minutas geradas pelo Copiloto IA), editavel
 * pelo advogado - sem marca d'agua e sem cabecalho de identidade visual do
 * escritorio, ja que o destino e edicao/protocolo e nao apresentacao. Usa fonte e
 * corpo de texto no padrao de pecas processuais (Times New Roman 12, 1,5 linha,
 * paragrafo justificado com recuo de primeira linha); titulos de secao,
 * enderecamento e fecho/assinatura recebem tratamento proprio. */
export async function montarDocxTexto(titulo: string, texto: string): Promise<Blob> {
  const paragrafosTexto = texto.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  const paragrafos = [
    new Paragraph({
      children: [new TextRun({ text: titulo, bold: true, font: FONTE, size: TAMANHO_TITULO })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    ...paragrafosTexto.map((linha) => {
      if (pareceTituloDeSecao(linha) || pareceEnderecamento(linha)) {
        return new Paragraph({
          children: [new TextRun({ text: linha, bold: true, font: FONTE, size: TAMANHO_CORPO })],
          spacing: { before: 300, after: 150, line: 360 },
        });
      }
      if (pareceAssinatura(linha)) {
        return new Paragraph({
          children: [new TextRun({ text: linha, italics: true, font: FONTE, size: TAMANHO_CORPO })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100, line: 360 },
        });
      }
      if (pareceFecho(linha)) {
        return new Paragraph({
          children: [new TextRun({ text: linha, font: FONTE, size: TAMANHO_CORPO })],
          spacing: { before: 300, after: 200, line: 360 },
        });
      }
      return new Paragraph({
        children: [new TextRun({ text: linha, font: FONTE, size: TAMANHO_CORPO })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200, line: 360 },
        indent: { firstLine: 700 },
      });
    }),
  ];

  const documento = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONTE, size: TAMANHO_CORPO },
        },
      },
    },
    sections: [{ children: paragrafos }],
  });

  return Packer.toBlob(documento);
}
