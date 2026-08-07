import jsPDF from 'jspdf';
import { buscarTenant, type Cliente, type Processo } from './api';

function qualificacaoCurta(cliente: Cliente): string {
  if (cliente.tipo === 'pf') {
    return cliente.cpf ? `${cliente.nome}, CPF nº ${cliente.cpf}` : cliente.nome;
  }
  const nome = cliente.razao_social || cliente.nome;
  return cliente.cnpj ? `${nome}, CNPJ nº ${cliente.cnpj}` : nome;
}

export async function gerarCertidaoNadaConsta(cliente: Cliente, processosVinculados: Processo[]) {
  const tenant = await buscarTenant();

  const ativos = processosVinculados.filter((p) => p.status === 'ativo' || p.status === 'suspenso');
  const nadaConsta = ativos.length === 0;

  const doc = new jsPDF();
  const margem = 20;
  const largura = doc.internal.pageSize.getWidth() - margem * 2;
  const centro = doc.internal.pageSize.getWidth() / 2;
  let y = 28;

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(tenant.nome_escritorio, centro, 16, { align: 'center' });
  doc.setTextColor(0);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIDÃO INTERNA', centro, y, { align: 'center' });
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(nadaConsta ? 'NADA CONSTA' : 'PROCESSOS EM ANDAMENTO', centro, y, { align: 'center' });
  y += 16;

  const escreverParagrafo = (texto: string) => {
    const linhas = doc.splitTextToSize(texto, largura);
    linhas.forEach((linha: string) => {
      doc.text(linha, margem, y);
      y += 6.5;
    });
    y += 4;
  };

  doc.setFontSize(11);
  escreverParagrafo(
    `Certificamos, para os devidos fins, que ${qualificacaoCurta(cliente)} ${
      nadaConsta
        ? 'não possui, nos registros deste escritório, nenhum processo ativo ou suspenso em tramitação até a presente data.'
        : `possui ${ativos.length} processo${ativos.length === 1 ? '' : 's'} ativo${ativos.length === 1 ? '' : 's'} ou suspenso${ativos.length === 1 ? '' : 's'} em tramitação nos registros deste escritório, conforme relação abaixo.`
    }`,
  );

  if (!nadaConsta) {
    y += 2;
    ativos.forEach((p) => {
      const linha = `• ${p.numero_cnj} — ${p.classe ?? 'classe não identificada'} — ${p.status === 'ativo' ? 'ativo' : 'suspenso'}`;
      const linhas = doc.splitTextToSize(linha, largura);
      linhas.forEach((l: string) => {
        doc.text(l, margem, y);
        y += 6;
      });
    });
    y += 8;
  }

  escreverParagrafo(
    'Esta certidão tem caráter meramente interno e informativo, refletindo exclusivamente os dados cadastrados neste escritório — não substitui certidões emitidas por tribunais ou órgãos oficiais.',
  );

  y += 6;
  const dataExtenso = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  escreverParagrafo(`Emitida em ${dataExtenso}.`);

  y += 20;
  doc.text('_______________________________________________', margem, y);
  y += 6;
  doc.setFontSize(9);
  doc.text(tenant.nome_escritorio, margem, y);

  doc.save(`certidao-${nadaConsta ? 'nada-consta' : 'processos'}-${cliente.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.pdf`);
}
