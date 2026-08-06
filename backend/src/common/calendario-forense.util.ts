/**
 * Calendario forense: feriados nacionais (fixos + moveis via calculo da Pascoa) + recesso
 * forense (20/dez a 06/jan, CNJ Resolucao 244/2016 - vale pra Justica Federal/Trabalhista;
 * a maioria dos tribunais estaduais tambem suspende prazo nesse periodo). Feriados
 * municipais/estaduais especificos por comarca nao entram aqui - ficaria preciso demais
 * pra manter sem uma base de dados dedicada; o efeito pratico e o prazo calculado ser,
 * na pior hipotese, um pouco mais curto do que o real (nunca mais longo).
 */

function pascoa(ano: number): Date {
  // algoritmo de Gauss/Meeus pra domingo de Pascoa
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function somarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

function chaveData(data: Date): string {
  return `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
}

function feriadosNacionais(ano: number): Date[] {
  const pascoaAno = pascoa(ano);
  return [
    new Date(ano, 0, 1), // confraternizacao universal
    somarDias(pascoaAno, -47), // carnaval (segunda)
    somarDias(pascoaAno, -46), // carnaval (terca)
    somarDias(pascoaAno, -2), // sexta-feira santa
    somarDias(pascoaAno, 60), // corpus christi
    new Date(ano, 3, 21), // tiradentes
    new Date(ano, 4, 1), // dia do trabalho
    new Date(ano, 8, 7), // independencia
    new Date(ano, 9, 12), // nossa senhora aparecida
    new Date(ano, 10, 2), // finados
    new Date(ano, 10, 15), // proclamacao da republica
    new Date(ano, 10, 20), // consciencia negra (feriado nacional desde 2024)
    new Date(ano, 11, 25), // natal
  ];
}

/** Recesso forense: 20/dez do ano corrente ate 06/jan do ano seguinte, ambos inclusive. */
function emRecessoForense(data: Date): boolean {
  const ano = data.getFullYear();
  const inicio = new Date(ano, 11, 20);
  const fimAnoSeguinte = new Date(ano + 1, 0, 6);
  const fimMesmoAno = new Date(ano, 0, 6); // caso a data seja em janeiro, o recesso comecou no ano anterior
  return (data >= inicio && data <= fimAnoSeguinte) || data <= fimMesmoAno;
}

export function ehDiaUtil(data: Date, opts: { considerarRecesso?: boolean } = {}): boolean {
  const diaSemana = data.getDay();
  if (diaSemana === 0 || diaSemana === 6) return false;
  if (opts.considerarRecesso !== false && emRecessoForense(data)) return false;

  const feriados = new Set(
    [feriadosNacionais(data.getFullYear() - 1), feriadosNacionais(data.getFullYear()), feriadosNacionais(data.getFullYear() + 1)]
      .flat()
      .map(chaveData),
  );
  return !feriados.has(chaveData(data));
}

/** Soma dias uteis a partir de uma data, pulando fins de semana, feriados nacionais e recesso forense. */
export function somarDiasUteis(data: Date, dias: number, opts: { considerarRecesso?: boolean } = {}): Date {
  const resultado = new Date(data);
  let restantes = dias;
  while (restantes > 0) {
    resultado.setDate(resultado.getDate() + 1);
    if (ehDiaUtil(resultado, opts)) restantes -= 1;
  }
  return resultado;
}

/** Soma dias corridos, mas se o resultado cair em dia nao util, empurra pro proximo dia util
 * (CPC art. 224 §1º / CLT art. 775). */
export function somarDiasCorridos(data: Date, dias: number, opts: { considerarRecesso?: boolean } = {}): Date {
  let resultado = somarDias(data, dias);
  while (!ehDiaUtil(resultado, opts)) {
    resultado = somarDias(resultado, 1);
  }
  return resultado;
}
