/**
 * Normaliza texto em "Title Case" respeitando acentos. Algumas fontes (DJEN, DataJud)
 * devolvem classes processuais com capitalizacao inconsistente - ex.: "AçãO TRABALHISTA
 * - RITO ORDINáRIO" (letras acentuadas minusculas dentro de texto maiusculo, um erro
 * comum de codificacao/fonte nos sistemas dos tribunais). O JS normaliza acentos
 * corretamente em toLowerCase/toUpperCase independente do case original, entao basta
 * baixar tudo e reconstruir a primeira letra de cada palavra.
 */
const PREPOSICOES_MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'no', 'na']);

export function normalizarTituloCase(texto: string | undefined): string | undefined {
  if (!texto) return texto;
  return texto
    .toLowerCase()
    .split(' ')
    .map((palavra, i) => {
      if (!palavra) return palavra;
      if (i > 0 && PREPOSICOES_MINUSCULAS.has(palavra)) return palavra;
      return palavra
        .split('-')
        .map((parte) => (parte ? parte.charAt(0).toUpperCase() + parte.slice(1) : parte))
        .join('-');
    })
    .join(' ');
}
