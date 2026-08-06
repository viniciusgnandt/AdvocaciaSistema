/**
 * Classificador de publicacoes por ato processual, baseado em regras/keywords sobre
 * o texto (inteiro teor) e o tipo de comunicacao vindo da fonte. E um primeiro corte
 * deliberadamente simples (regex, sem ML) - evolui para NLP/modelo treinado quando
 * houver volume/rotulos suficientes para justificar a complexidade extra.
 */

import { somarDiasUteis } from '../../common/calendario-forense.util';

export type ClassificacaoPublicacao =
  | 'audiencia'
  | 'sentenca'
  | 'decisao'
  | 'despacho'
  | 'citacao'
  | 'prazo'
  | 'embargos'
  | 'recurso'
  | 'penhora_bloqueio'
  | 'outro';

export interface ResultadoClassificacao {
  classificacao: ClassificacaoPublicacao;
  prazo_dias?: number;
  prazo_data_limite?: Date;
  audiencia_data?: Date;
}

const REGRAS: { classificacao: ClassificacaoPublicacao; padrao: RegExp }[] = [
  { classificacao: 'sentenca', padrao: /\bsenten[çc]a\b|julgo (procedente|improcedente|parcialmente procedente)|resolvo o m[ée]rito/i },
  { classificacao: 'embargos', padrao: /embargos de declara[çc][ãa]o|embargos [àa] execu[çc][ãa]o/i },
  { classificacao: 'recurso', padrao: /\brecurso (de apela[çc][ãa]o|especial|extraordin[áa]rio|inominado)\b|contrarraz[õo]es/i },
  { classificacao: 'penhora_bloqueio', padrao: /\bpenhora\b|bloqueio (via )?sisbajud|indisponibilidade de (bens|valores)|renajud/i },
  { classificacao: 'citacao', padrao: /\bcite-se\b|\bcita[çc][ãa]o\b/i },
  { classificacao: 'decisao', padrao: /\bdecis[ãa]o\b|defiro|indefiro|nos termos da decis[ãa]o/i },
  { classificacao: 'despacho', padrao: /\bdespacho\b/i },
  { classificacao: 'prazo', padrao: /prazo de \d+\s*(dias|dia)|manifeste-se no prazo|intime-se.{0,40}prazo/i },
];

const PADRAO_PRAZO_DIAS = /prazo de (\d+)\s*(dias|dia)/i;
const PADRAO_AUDIENCIA_PALAVRA = /audi[êe]ncia/gi;
// hora aceita tanto "13:30" quanto "13h30" (ou só "13h"), as duas formas comuns nas intimacoes
const PADRAO_DATA_HORA = /(\d{2})\/(\d{2})\/(\d{4})(?:[^\d]{0,20}?(\d{2})[:h](\d{2})?)?/g;
const DISTANCIA_MAXIMA_CHARS = 200;

/**
 * A JT/TJ usa dezenas de redacoes diferentes para designar/redesignar audiencia
 * ("designo a audiência", "designe-se audiência", "fica designada", "cientificada da
 * audiência que se realizará", "para a realização de audiência" etc.) - listar cada
 * frase e uma corrida sem fim. Em vez disso: qualquer data (DD/MM/AAAA, com ou sem
 * hora) que apareca fisicamente perto da palavra "audiência" no texto e um forte sinal
 * de que aquele trecho esta marcando uma audiencia para aquela data. Trechos que so
 * mencionam "audiência" de passagem (ex.: "retire-se da pauta de audiência", correcao
 * de ata) naturalmente nao tem uma data por perto e ficam de fora.
 */
function encontrarAudienciaMaisProxima(texto: string): Date | undefined {
  const indicesAudiencia = [...texto.matchAll(PADRAO_AUDIENCIA_PALAVRA)].map((m) => m.index ?? -1);
  if (indicesAudiencia.length === 0) return undefined;

  const datasEncontradas = [...texto.matchAll(PADRAO_DATA_HORA)];
  if (datasEncontradas.length === 0) return undefined;

  let melhorDistancia = Infinity;
  let melhorData: Date | undefined;

  for (const matchData of datasEncontradas) {
    const posicaoData = matchData.index ?? -1;
    if (posicaoData < 0) continue;

    const distancia = Math.min(...indicesAudiencia.map((posAudiencia) => Math.abs(posAudiencia - posicaoData)));
    if (distancia > DISTANCIA_MAXIMA_CHARS || distancia >= melhorDistancia) continue;

    const [, diaStr, mesStr, anoStr, horaStr, minutoStr] = matchData;
    const dia = Number(diaStr);
    const mes = Number(mesStr);
    const ano = Number(anoStr);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) continue;

    const data = new Date(ano, mes - 1, dia, Number(horaStr ?? 0), Number(minutoStr ?? 0));
    if (Number.isNaN(data.getTime())) continue;

    melhorDistancia = distancia;
    melhorData = data;
  }

  return melhorData;
}

export function classificarPublicacao(
  texto: string | undefined,
  tipoComunicacao: string | undefined,
  dataReferencia: Date,
): ResultadoClassificacao {
  const base = `${tipoComunicacao ?? ''} ${texto ?? ''}`;

  const audienciaData = encontrarAudienciaMaisProxima(base);
  const regra = REGRAS.find((r) => r.padrao.test(base));
  const classificacao: ClassificacaoPublicacao = audienciaData ? 'audiencia' : (regra?.classificacao ?? 'outro');

  const resultado: ResultadoClassificacao = { classificacao };
  if (audienciaData) resultado.audiencia_data = audienciaData;

  const matchPrazo = base.match(PADRAO_PRAZO_DIAS);
  if (matchPrazo) {
    const dias = Number(matchPrazo[1]);
    resultado.prazo_dias = dias;
    resultado.prazo_data_limite = somarDiasUteis(dataReferencia, dias);
  }

  return resultado;
}
