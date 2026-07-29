import { createHash } from 'crypto';
import { DjenComunicacaoItem } from './connectors/djen.types';
import { classificarPublicacao } from './classificador.util';
import { normalizarTituloCase } from '../../common/texto.util';

/**
 * Hash de deduplicacao: a mesma publicacao pode chegar por mais de uma fonte
 * (ex.: DJEN + scraper de tribunal especifico). O hash e estavel por
 * fonte + processo + data + trecho inicial do texto, para que reprocessar o
 * mesmo periodo nao gere duplicidade nem notificacoes repetidas.
 */
export function hashDedupe(fonte: string, numeroProcesso: string, dataDisponibilizacao: string, texto = ''): string {
  const base = `${fonte}|${numeroProcesso}|${dataDisponibilizacao}|${texto.slice(0, 200)}`;
  return createHash('sha256').update(base).digest('hex');
}

const ROTULOS_ATIVO = ['RECLAMANTE', 'AUTOR', 'REQUERENTE', 'EXEQUENTE', 'AGRAVANTE', 'APELANTE'];
const ROTULOS_PASSIVO = ['RECLAMADO', 'R[ÉE]U', 'REQUERIDO', 'EXECUTADO', 'AGRAVADO', 'APELADO'];
// qualquer um desses rotulos - seja o nome da proxima parte ou um cabecalho de secao do
// documento (INTIMAÇÃO, DESPACHO...) - marca o fim do nome da parte anterior, ja que o
// teor da publicacao nao usa quebra de linha real entre os "blocos" do texto
const TODOS_ROTULOS = [
  ...ROTULOS_ATIVO,
  ...ROTULOS_PASSIVO,
  'DESTINAT[ÁA]RIOS?',
  'ADVOGADOS?',
  'INTIMA[ÇC][ÃA]O',
  'CITA[ÇC][ÃA]O',
  'NOTIFICA[ÇC][ÃA]O',
  'CONCLUS[ÃA]O',
  'DESPACHO',
  'DECIS[ÃA]O',
  'SENTEN[ÇC]A',
  'CERTID[ÃA]O',
];

function extrairParte(texto: string, rotulos: string[]): string | undefined {
  const padraoInicio = new RegExp(`\\b(?:${rotulos.join('|')})S?:\\s*(.+)`, 'i');
  const match = texto.match(padraoInicio);
  if (!match) return undefined;

  // corta tanto em "PROXIMO ROTULO:" quanto em cabecalhos de secao sem dois-pontos
  // (ex.: "...SANTOS 05061998510  INTIMAÇÃO  Fica V. Sa..."). O espacamento entre
  // blocos varia entre documentos (1 ou 2+ espacos), entao aceita qualquer espaco,
  // com \b para nao cortar no meio de uma palavra do nome.
  const padraoFim = new RegExp(`\\s+\\b(?:${TODOS_ROTULOS.join('|')})S?\\b`, 'i');
  const valor = match[1].split(padraoFim)[0].trim().slice(0, 150);
  return valor.length > 0 ? valor : undefined;
}

/**
 * O DJE do TJSP nao usa rotulos "RECLAMANTE:/RECLAMADO:" - o teor comeca no formato
 * fixo "Processo <numero> - <classe> - <assunto> - <parte ativa> -  - <parte passiva>  -
 * <texto da decisao>". As partes costumam vir abreviadas em iniciais (ex.: "M.C.S.J.G.")
 * quando o processo tem algum grau de sigilo (familia, menores) - isso vem assim da
 * propria fonte oficial, nao e uma limitacao da extracao.
 */
function extrairPartesTJSP(texto: string): { parte_ativa?: string; parte_passiva?: string } {
  if (!/^Processo\s+[\d./-]+\s+-\s+/i.test(texto)) return {};

  const campos = texto.split(' - ');
  if (campos.length < 6) return {};

  const campoIntermediario = campos[4]?.trim();
  if (campoIntermediario) return {}; // formato diferente do esperado - nao arrisca um palpite

  const valido = (v?: string) => {
    const limpo = v?.trim();
    return limpo && limpo.length > 0 && limpo.length < 60 ? limpo : undefined;
  };

  return {
    parte_ativa: valido(campos[3]),
    parte_passiva: valido(campos[5]),
  };
}

/** Le "RECLAMANTE: Fulano  RECLAMADO: Beltrano" (ou AUTOR/REU, REQUERENTE/REQUERIDO...) do
 * teor; se nao achar (formato do TJSP, por exemplo), tenta o parser posicional do TJSP. */
export function extrairPartes(texto: string | undefined): { parte_ativa?: string; parte_passiva?: string } {
  if (!texto) return {};
  const porRotulo = {
    parte_ativa: extrairParte(texto, ROTULOS_ATIVO),
    parte_passiva: extrairParte(texto, ROTULOS_PASSIVO),
  };
  if (porRotulo.parte_ativa || porRotulo.parte_passiva) return porRotulo;
  return extrairPartesTJSP(texto);
}

export function mapDjenItemToPublicacao(item: DjenComunicacaoItem) {
  const texto = item.texto ?? '';
  const dataDisponibilizacao = new Date(item.data_disponibilizacao);
  const tipoComunicacao = item.tipoComunicacao ?? item.tipo_comunicacao;
  const classificacao = classificarPublicacao(texto, tipoComunicacao, dataDisponibilizacao);

  return {
    fonte: 'djen',
    tribunal: item.siglaTribunal ?? item.tribunal ?? 'desconhecido',
    numero_processo: item.numero_processo,
    data_disponibilizacao: dataDisponibilizacao,
    tipo_comunicacao: tipoComunicacao,
    nome_orgao: item.nomeOrgao ?? item.nome_orgao,
    classificacao: classificacao.classificacao,
    prazo_dias: classificacao.prazo_dias,
    prazo_data_limite: classificacao.prazo_data_limite,
    audiencia_data: classificacao.audiencia_data,
    inteiro_teor_texto: texto,
    inteiro_teor_pdf_url: item.link,
    classe_processual: normalizarTituloCase(item.nomeClasse),
    numero_comunicacao: item.numeroComunicacao,
    meio: item.meio,
    ...extrairPartes(texto),
    advogados_destinatarios: (item.destinatarioadvogados ?? item.destinatarios_advogados ?? []).map((a) => {
      const dados = a.advogado ?? a;
      return {
        nome: dados.nome ?? '',
        numero_oab: dados.numero_oab !== undefined ? String(dados.numero_oab) : undefined,
        uf_oab: dados.uf_oab,
      };
    }),
    hash_dedupe: hashDedupe('djen', item.numero_processo, item.data_disponibilizacao, texto),
    raw: item as unknown as Record<string, unknown>,
  };
}
