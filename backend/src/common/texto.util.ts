/**
 * Normaliza texto em "Title Case" respeitando acentos. Algumas fontes (DJEN, DataJud)
 * devolvem classes processuais com capitalizacao inconsistente - ex.: "AçãO TRABALHISTA
 * - RITO ORDINáRIO" (letras acentuadas minusculas dentro de texto maiusculo, um erro
 * comum de codificacao/fonte nos sistemas dos tribunais). O JS normaliza acentos
 * corretamente em toLowerCase/toUpperCase independente do case original, entao basta
 * baixar tudo e reconstruir a primeira letra de cada palavra.
 */
const PREPOSICOES_MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'no', 'na']);

// entidades nomeadas que realmente aparecem no texto bruto do DJEN (fonte NAO manda HTML
// de verdade, so essas sequencias soltas tipo "Gon&ccedil;alves" em vez de "Gonçalves") -
// nao e' um parser de HTML generico, so o suficiente pra essas letras acentuadas comuns.
const ENTIDADES_NOMEADAS: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ccedil: 'ç', Ccedil: 'Ç',
  atilde: 'ã', Atilde: 'Ã', otilde: 'õ', Otilde: 'Õ',
  aacute: 'á', Aacute: 'Á', eacute: 'é', Eacute: 'É', iacute: 'í', Iacute: 'Í',
  oacute: 'ó', Oacute: 'Ó', uacute: 'ú', Uacute: 'Ú',
  acirc: 'â', Acirc: 'Â', ecirc: 'ê', Ecirc: 'Ê', ocirc: 'ô', Ocirc: 'Ô',
  agrave: 'à', Agrave: 'À', egrave: 'è', Egrave: 'È',
  uuml: 'ü', Uuml: 'Ü',
};

/**
 * Decodifica entidades HTML (nomeadas + numericas) que vem soltas no texto de algumas
 * publicacoes do DJEN - a fonte manda "Gon&ccedil;alves" em vez de "Gonçalves" mesmo fora
 * de qualquer tag HTML de verdade, entao isso precisa ser decodificado na ingestao, senao
 * fica errado em toda tela que exibe esse texto (titulo do processo, teor, etc.).
 */
export function decodificarEntidadesHtml(texto: string | undefined): string | undefined {
  if (!texto) return texto;
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCharCode(Number(cod)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, cod) => String.fromCharCode(parseInt(cod, 16)))
    .replace(/&([a-zA-Z]+);/g, (match, nome) => ENTIDADES_NOMEADAS[nome] ?? match);
}

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
