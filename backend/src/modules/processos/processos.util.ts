import { DatajudSource } from './connectors/datajud.types';
import { normalizarTituloCase } from '../../common/texto.util';

/**
 * O DataJud retorna datas em formatos inconsistentes entre campos/tribunais:
 * ISO 8601 padrao (movimentos[].dataHora) ou "YYYYMMDDHHmmss" sem separadores
 * (visto em dataAjuizamento). Esta funcao aceita ambos e retorna undefined em vez
 * de gerar um "Invalid Date" que quebraria o cast do Mongoose na gravacao.
 */
function parseDataDatajud(valor: string | undefined): Date | undefined {
  if (!valor) return undefined;

  if (/^\d{14}$/.test(valor)) {
    const ano = valor.slice(0, 4);
    const mes = valor.slice(4, 6);
    const dia = valor.slice(6, 8);
    const hora = valor.slice(8, 10);
    const min = valor.slice(10, 12);
    const seg = valor.slice(12, 14);
    const data = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}Z`);
    return Number.isNaN(data.getTime()) ? undefined : data;
  }

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? undefined : data;
}

/**
 * O DataJud nao expoe um campo de "status" do processo - so o historico de movimentos.
 * Deduzimos automaticamente a partir de movimentos padronizados do CNJ (tabela unificada
 * de movimentos processuais). "Baixa Definitiva" e "Extinção" sao sinais terminais (uma
 * vez que ocorrem, o processo nao volta a tramitar). Suspensão exige cuidado: um evento
 * de "Suspensão" so vale se for o MAIS RECENTE frente a um eventual "Levantamento da
 * Suspensão" - senao classificariamos como suspenso um processo cuja suspensão ja foi
 * levantada (ex.: "Cumprimento de Levantamento da Suspensão" no historico).
 */
function deduzirStatus(
  movimentos: { data: Date; descricao: string }[],
): 'ativo' | 'suspenso' | 'encerrado' | 'arquivado' {
  if (movimentos.some((m) => /baixa definitiva/i.test(m.descricao))) return 'arquivado';
  if (movimentos.some((m) => /extin[çc][ãa]o/i.test(m.descricao))) return 'encerrado';

  // movimentos ja vem ordenados do mais recente para o mais antigo (ver mapDatajudToProcesso)
  const suspensaoDecretada = movimentos.find(
    (m) => /suspens[ãa]o/i.test(m.descricao) && !/levantamento/i.test(m.descricao) && !/sem efeito/i.test(m.descricao),
  );
  const suspensaoLevantada = movimentos.find((m) => /levantamento/i.test(m.descricao));

  if (suspensaoDecretada && (!suspensaoLevantada || suspensaoDecretada.data > suspensaoLevantada.data)) {
    return 'suspenso';
  }
  return 'ativo';
}

export function mapDatajudToProcesso(source: DatajudSource) {
  const movimentacoes = (source.movimentos ?? [])
    .map((m) => ({ data: parseDataDatajud(m.dataHora), descricao: m.nome ?? 'Movimentação', codigo: m.codigo }))
    .filter((m) => m.data instanceof Date)
    .map((m) => ({ data: m.data as Date, descricao: m.descricao, codigo: m.codigo }))
    .sort((a, b) => b.data.getTime() - a.data.getTime());

  return {
    tribunal: source.tribunal,
    grau: source.grau,
    classe: normalizarTituloCase(source.classe?.nome),
    assuntos: (source.assuntos ?? []).map((a) => a.nome).filter((n): n is string => !!n),
    orgao_julgador: source.orgaoJulgador?.nome,
    data_ajuizamento: parseDataDatajud(source.dataAjuizamento),
    valor_causa: source.valorCausa,
    movimentacoes,
    status: deduzirStatus(movimentacoes.map((m) => ({ data: m.data, descricao: m.descricao }))),
    datajud_atualizado_em: new Date(),
    datajud_raw: source as unknown as Record<string, unknown>,
  };
}
