/**
 * Converte um valor digitado em formato BR ("6.000,00") pra number. So' trocar a
 * virgula por ponto (sem remover os pontos de milhar antes) quebra qualquer valor
 * >= 1000: "6.000,00" virava "6.000.00", que Number() nao consegue parsear (NaN).
 */
export function paraNumero(valor: string): number {
  return Number(valor.replace(/\./g, '').replace(',', '.'));
}
