import { createHash } from 'crypto';
import { DjenComunicacaoItem } from './connectors/djen.types';
import { classificarPublicacao } from './classificador.util';
import { decodificarEntidadesHtml, normalizarTituloCase } from '../../common/texto.util';

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

// [OA] no fim: "Apelado"/"Apelada" etc. - a publicacao flexiona o rotulo pelo genero da
// parte, "APELADO:" sozinho batia so a forma masculina e perdia toda "Apelada: Fulana".
const ROTULOS_ATIVO = ['RECLAMANTE', 'AUTOR[A]?', 'REQUERENTE', 'EXEQUENTE', 'AGRAVANTE', 'APELANTE'];
const ROTULOS_PASSIVO = ['RECLAMAD[OA]', 'R[ÉE]U?', 'REQUERID[OA]', 'EXECUTAD[OA]', 'AGRAVAD[OA]', 'APELAD[OA]'];
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
  // \s* antes dos dois-pontos: texto vindo de tabela HTML com as tags removidas deixa um
  // espaco onde era "<td>AUTOR</td><td>:" (vira "AUTOR :", nao "AUTOR:").
  const padraoInicio = new RegExp(`\\b(?:${rotulos.join('|')})S?\\s*:\\s*(.+)`, 'i');
  const match = texto.match(padraoInicio);
  if (!match) return undefined;

  // corta tanto em "PROXIMO ROTULO:" quanto em cabecalhos de secao sem dois-pontos
  // (ex.: "...SANTOS 05061998510  INTIMAÇÃO  Fica V. Sa..."). O espacamento entre
  // blocos varia entre documentos (1 ou 2+ espacos), entao aceita qualquer espaco,
  // com \b para nao cortar no meio de uma palavra do nome.
  const padraoFim = new RegExp(`\\s+\\b(?:${TODOS_ROTULOS.join('|')})S?\\b`, 'i');
  // " - " tambem encerra o nome quando o rotulo veio inline no meio do teor (ex.: acordao
  // de apelacao "Apelada: Fulana (Justica Gratuita) - Apelação Cível Processo nº...") -
  // sem cortar ali, o resto da ementa/metadados do acordao entrava junto no nome.
  const valor = limparBorda(match[1].split(padraoFim)[0].split(/\s+-\s+/)[0].slice(0, 150));
  return valor.length > 0 ? valor : undefined;
}

/**
 * O DJE do TJSP nao usa rotulos "RECLAMANTE:/RECLAMADO:" - o teor comeca no formato
 * fixo "Processo <numero> - <classe> - <assunto> - <parte ativa> -  - <parte passiva>  -
 * <texto da decisao>". As partes costumam vir abreviadas em iniciais (ex.: "M.C.S.J.G.")
 * quando o processo tem algum grau de sigilo (familia, menores) - isso vem assim da
 * propria fonte oficial, nao e uma limitacao da extracao.
 */
// razao social costuma trazer o sufixo societario depois de um " - " (ex.: "Allmax
// Distribuidora ... - Eireli"), o que o split(' - ') separa como se fosse mais uma
// parte distinta. Colando de volta no campo anterior quando o fragmento e' so o sufixo.
const SUFIXO_SOCIETARIO = /^(Eireli|Ltda\.?|S\/?A\.?|ME|EPP|Cia\.?|Me\.?)$/i;

function mesclarSufixosSocietarios(campos: string[]): string[] {
  const resultado: string[] = [];
  for (const campo of campos) {
    if (SUFIXO_SOCIETARIO.test(campo.trim()) && resultado.length > 0) {
      resultado[resultado.length - 1] = `${resultado[resultado.length - 1]} - ${campo.trim()}`;
    } else {
      resultado.push(campo);
    }
  }
  return resultado;
}

/** Remove traco/ponto-e-virgula residual de borda (sobra de quando o proximo campo do
 * split virou lixo/instrucao e foi descartado, mas o separador ficou grudado no nome). */
function limparBorda(nome: string): string {
  return nome.trim().replace(/[\s;-]+$/, '').trim();
}

/** Um "campo" e' nome de parte (nao teor) se for curto e nao comecar como prosa/decisao. */
function pareceNomeDeParte(campo: string): boolean {
  const limpo = campo.trim();
  // limite generoso o suficiente pra razao social composta (ex.: "Fulano Distribuidora
  // de Materiais Ltda"), mas ainda curto o bastante pra nao aceitar uma frase de teor.
  if (limpo.length === 0 || limpo.length >= 90) return false;
  // teor de decisao/despacho costuma comecar assim mesmo quando curto no primeiro campo
  // apos a lista de partes (ex.: "Fls. Retro:", "Vistos.", "Ante o exposto")
  if (/^(fls\.?|vistos\b|ante o exposto|certifico|trata-se|cuida-se)/i.test(limpo)) return false;
  // teor entre aspas (ex.: `" fls. 118/119 - Ciência. "`) ou lista numerada (ex.: "1-
  // apresentar...") tambem sao inicio de teor, nao nome - sem isso um " - " dentro do
  // proprio teor confundia o fallback de 2 campos (ativa/passiva sem separador vazio).
  // \d+- (sem espaco) e' marcador de lista; nao barra nomes que comecam com numero
  // seguido de espaco, tipo razao social "5 Cometas Cargas e Logistica Ltda.".
  if (/^["']|^\d+-/.test(limpo)) return false;
  return true;
}

// "Processo <numero>" pode vir seguido de um ou mais parenteses de apensamento
// (ex.: "(apensado ao processo X) (processo principal Y)") antes do primeiro " - " -
// a regex antiga exigia o traco logo apos o numero e falhava silenciosamente nesses casos.
const CABECALHO_PROCESSO = /^Processo\s+[\d./-]+\s*(?:\([^)]*\)\s*)*-\s*/i;

function extrairPartesTJSP(texto: string): { parte_ativa?: string; parte_passiva?: string } {
  const match = texto.match(CABECALHO_PROCESSO);
  if (!match) return {};

  const resto = mesclarSufixosSocietarios(texto.slice(match[0].length).split(' - '));
  // resto[0] = classe, resto[1] = assunto, resto[2+] = partes/teor
  if (resto.length < 3) return {};

  // um ou mais nomes da parte ativa, depois um campo vazio (separador fixo do formato),
  // depois um ou mais nomes da parte passiva, depois o teor da decisao. Antes so se
  // assumia exatamente 1 nome de cada lado - com litisconsorcio (2+ autores ou reus) o
  // separador vazio desloca e a extracao antiga desistia (ou misturava nome com teor).
  let indiceSeparador = -1;
  for (let i = 2; i < Math.min(resto.length, 2 + 6); i += 1) {
    if (resto[i]?.trim() === '') {
      indiceSeparador = i;
      break;
    }
  }
  if (indiceSeparador === -1) {
    // formato nem sempre inclui o campo vazio de separacao (acontece mesmo com 1 nome
    // de cada lado) - se os dois campos seguintes parecem nomes e o terceiro claramente
    // nao parece (inicio do teor da decisao), assume 1 nome ativo + 1 passivo direto.
    const [candidataAtiva, candidataPassiva, candidataTeor] = resto.slice(2, 5);
    if (
      candidataAtiva &&
      candidataPassiva &&
      pareceNomeDeParte(candidataAtiva) &&
      pareceNomeDeParte(candidataPassiva) &&
      candidataTeor !== undefined &&
      !pareceNomeDeParte(candidataTeor)
    ) {
      return { parte_ativa: limparBorda(candidataAtiva), parte_passiva: limparBorda(candidataPassiva) };
    }
    return {};
  }

  const nomesAtiva = resto.slice(2, indiceSeparador).map((c) => c.trim()).filter(Boolean);
  if (nomesAtiva.length === 0 || !nomesAtiva.every(pareceNomeDeParte)) return {};

  const nomesPassiva: string[] = [];
  for (let i = indiceSeparador + 1; i < resto.length; i += 1) {
    if (!pareceNomeDeParte(resto[i])) break;
    nomesPassiva.push(resto[i].trim());
  }
  if (nomesPassiva.length === 0) return {};

  return {
    parte_ativa: limparBorda(nomesAtiva.join(' e ')),
    parte_passiva: limparBorda(nomesPassiva.join(' e ')),
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

  // algumas publicacoes vem como tabela HTML ("<td>AUTOR</td><td>: Fulano</td>") em vez
  // de texto puro - a tag entre o rotulo e o ":" faz a extracao por rotulo acima falhar
  // mesmo o rotulo existindo. Tenta de novo so nesse caso, no texto sem as tags.
  if (texto.includes('<')) {
    const semTags = texto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const porRotuloSemHtml = {
      parte_ativa: extrairParte(semTags, ROTULOS_ATIVO),
      parte_passiva: extrairParte(semTags, ROTULOS_PASSIVO),
    };
    if (porRotuloSemHtml.parte_ativa || porRotuloSemHtml.parte_passiva) return porRotuloSemHtml;
  }

  return extrairPartesTJSP(texto);
}

export function mapDjenItemToPublicacao(item: DjenComunicacaoItem) {
  // decodificar antes de tudo: classificacao/extracao de partes rodam em cima deste
  // texto, entao um "Gon&ccedil;alves" nao decodificado tambem estragaria a extracao,
  // nao so a exibicao.
  const texto = decodificarEntidadesHtml(item.texto) ?? '';
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
