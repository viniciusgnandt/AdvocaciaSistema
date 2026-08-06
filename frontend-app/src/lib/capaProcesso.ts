import jsPDF from 'jspdf';
import { buscarTenant, type Processo } from './api';

function formatarNumeroCnj(numero: string): string {
  if (numero.length !== 20) return numero;
  return `${numero.slice(0, 7)}-${numero.slice(7, 9)}.${numero.slice(9, 13)}.${numero.slice(13, 14)}.${numero.slice(14, 16)}.${numero.slice(16)}`;
}

function formatarMoeda(valor?: number | null) {
  if (valor === undefined || valor === null) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function gerarCapaProcesso(processo: Processo) {
  const tenant = await buscarTenant().catch(() => null);

  const doc = new jsPDF();
  const margem = 18;
  const largura = doc.internal.pageSize.getWidth();
  const largoUtil = largura - margem * 2;
  let y = 26;

  doc.setDrawColor(30);
  doc.setLineWidth(0.8);
  doc.rect(margem - 4, margem - 8, largoUtil + 8, doc.internal.pageSize.getHeight() - (margem - 8) * 2);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(tenant?.nome_escritorio ?? 'Escritório', largura / 2, y, { align: 'center' });
  y += 14;

  doc.setFontSize(13);
  doc.text('CAPA DE PROCESSO', largura / 2, y, { align: 'center' });
  y += 16;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(formatarNumeroCnj(processo.numero_cnj), largura / 2, y, { align: 'center' });
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const linha = (label: string, valor: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margem, y);
    doc.setFont('helvetica', 'normal');
    const linhas = doc.splitTextToSize(valor, largoUtil - 45);
    doc.text(linhas, margem + 45, y);
    y += 7 * Math.max(1, linhas.length) + 3;
  };

  if (processo.parte_ativa) linha('Parte ativa', processo.parte_ativa);
  if (processo.parte_passiva) linha('Parte passiva', processo.parte_passiva);
  linha('Classe', processo.classe ?? '—');
  linha('Tribunal', processo.tribunal ?? '—');
  if (processo.orgao_julgador) linha('Órgão julgador', processo.orgao_julgador);
  linha('Fase processual', processo.fase_processual ?? '—');
  linha(
    'Ajuizado em',
    processo.data_ajuizamento ? new Date(processo.data_ajuizamento).toLocaleDateString('pt-BR') : '—',
  );
  linha('Valor da causa', formatarMoeda(processo.valor_causa));
  linha('Status', processo.status);

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Observações / localização física:', margem, y);
  y += 8;
  doc.setDrawColor(180);
  for (let i = 0; i < 4; i++) {
    doc.line(margem, y, margem + largoUtil, y);
    y += 9;
  }

  doc.save(`capa-${processo.numero_cnj}.pdf`);
}
