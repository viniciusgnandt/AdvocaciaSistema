import jsPDF from 'jspdf';
import { buscarTenant, type Cliente, type Usuario } from './api';

function qualificacaoCliente(cliente: Cliente): string {
  const partes: string[] = [];
  if (cliente.tipo === 'pf') {
    partes.push(cliente.nome);
    if (cliente.estado_civil) partes.push(cliente.estado_civil);
    if (cliente.profissao) partes.push(cliente.profissao);
    if (cliente.cpf) partes.push(`portador(a) do CPF nº ${cliente.cpf}`);
  } else {
    partes.push(cliente.razao_social || cliente.nome);
    if (cliente.cnpj) partes.push(`inscrita no CNPJ sob o nº ${cliente.cnpj}`);
  }
  if (cliente.endereco) {
    const { logradouro, numero, bairro, cidade, uf } = cliente.endereco;
    const linha = [logradouro && numero ? `${logradouro}, ${numero}` : logradouro, bairro, cidade && uf ? `${cidade}/${uf}` : cidade]
      .filter(Boolean)
      .join(', ');
    if (linha) partes.push(`residente e domiciliado(a) em ${linha}`);
  }
  return partes.join(', ');
}

export async function gerarProcuracaoPdf(params: {
  cliente: Cliente;
  advogado: Usuario;
  tipo: 'geral' | 'especifica';
  numeroCnj?: string;
  poderesExtras?: string;
}) {
  const { cliente, advogado, tipo, numeroCnj, poderesExtras } = params;
  const tenant = await buscarTenant();

  const doc = new jsPDF();
  const margem = 20;
  const largura = doc.internal.pageSize.getWidth() - margem * 2;
  let y = 25;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PROCURAÇÃO', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(11);
  doc.text(tipo === 'geral' ? '(Poderes gerais para o foro — ad judicia et extra)' : '(Poderes específicos)', doc.internal.pageSize.getWidth() / 2, y, {
    align: 'center',
  });
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const outorgante = `OUTORGANTE: ${qualificacaoCliente(cliente)}.`;
  const outorgado = `OUTORGADO: ${advogado.nome}, advogado(a) inscrito(a) na OAB sob o nº ${advogado.oab ?? '(não informada)'}, com escritório profissional em ${tenant.nome_escritorio}.`;

  const poderesGerais =
    'Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui o(a) OUTORGADO(A) acima qualificado(a) como seu bastante procurador, a quem confere amplos, gerais e ilimitados poderes para o foro em geral, com a cláusula "ad judicia et extra", podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, usando os recursos legais e acompanhando-os, conferindo-lhe ainda poderes especiais para confessar, desistir, transigir, firmar compromissos ou acordos, receber e dar quitação, agindo em conjunto ou separadamente, podendo ainda substabelecer esta a outrem, com ou sem reservas de iguais poderes, dando tudo por bom, firme e valioso.';

  const poderesEspecificos = `Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui o(a) OUTORGADO(A) acima qualificado(a) como seu bastante procurador, a quem confere poderes especiais para representá-lo(a) exclusivamente no processo de nº ${numeroCnj ?? '(número não informado)'}, podendo praticar todos os atos necessários ao bom e fiel desempenho do presente mandato, incluindo a cláusula "ad judicia et extra", podendo ainda substabelecer esta a outrem, com ou sem reservas de iguais poderes.`;

  const corpo = tipo === 'geral' ? poderesGerais : poderesEspecificos;

  const escreverParagrafo = (texto: string, negrito = false) => {
    doc.setFont('helvetica', negrito ? 'bold' : 'normal');
    const linhas = doc.splitTextToSize(texto, largura);
    linhas.forEach((linha: string) => {
      if (y > 270) {
        doc.addPage();
        y = 25;
      }
      doc.text(linha, margem, y);
      y += 6.5;
    });
    y += 4;
  };

  escreverParagrafo(outorgante, true);
  escreverParagrafo(outorgado, true);
  escreverParagrafo(corpo);
  if (poderesExtras?.trim()) {
    escreverParagrafo(`Poderes adicionais: ${poderesExtras.trim()}`);
  }

  y += 10;
  const dataExtenso = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  escreverParagrafo(`Local e data: ______________________, ${dataExtenso}.`);

  y += 20;
  doc.text('_______________________________________________', margem, y);
  y += 6;
  doc.text(cliente.tipo === 'pj' ? cliente.razao_social || cliente.nome : cliente.nome, margem, y);
  y += 4;
  doc.setFontSize(9);
  doc.text('Outorgante', margem, y);

  doc.save(`procuracao-${cliente.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.pdf`);
}
