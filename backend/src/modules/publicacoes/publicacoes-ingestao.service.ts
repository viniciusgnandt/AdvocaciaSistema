import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Monitoramento } from './schemas/monitoramento.schema';
import { Publicacao } from './schemas/publicacao.schema';
import { DjenConnectorService } from './connectors/djen-connector.service';
import { mapDjenItemToPublicacao } from './publicacoes.util';
import { ProcessosService } from '../processos/processos.service';

export interface ResultadoIngestao {
  monitoramentoId: string;
  encontradas: number;
  novas: number;
  duplicadas: number;
  erro?: string;
}

@Injectable()
export class PublicacoesIngestaoService {
  private readonly logger = new Logger(PublicacoesIngestaoService.name);

  constructor(
    @InjectModel(Monitoramento.name) private readonly monitoramentoModel: Model<Monitoramento>,
    @InjectModel(Publicacao.name) private readonly publicacaoModel: Model<Publicacao>,
    private readonly djen: DjenConnectorService,
    private readonly processosService: ProcessosService,
  ) {}

  /** Executa a busca no DJEN para um unico monitoramento e grava publicacoes novas (idempotente). */
  async executarMonitoramento(monitoramento: Monitoramento, dataInicio: string, dataFim: string): Promise<ResultadoIngestao> {
    const params =
      monitoramento.tipo === 'oab'
        ? { numeroOab: monitoramento.valor, ufOab: monitoramento.oab_uf }
        : monitoramento.tipo === 'processo'
          ? { numeroProcesso: monitoramento.valor }
          : null;

    if (!params) {
      // CPF/CNPJ nao sao consultaveis diretamente no DJEN; entram via outras fontes
      // (ex.: cruzamento com processos ja cadastrados) - fora do escopo deste conector.
      return { monitoramentoId: String(monitoramento._id), encontradas: 0, novas: 0, duplicadas: 0 };
    }

    try {
      const resposta = await this.djen.buscarComunicacoes({
        ...params,
        dataDisponibilizacaoInicio: dataInicio,
        dataDisponibilizacaoFim: dataFim,
        itensPorPagina: 100,
      });

      let novas = 0;
      let duplicadas = 0;

      for (const item of resposta.items) {
        const mapeada = mapDjenItemToPublicacao(item);
        try {
          await this.publicacaoModel.create({
            ...mapeada,
            tenant_id: monitoramento.tenant_id,
            monitoramento_id: monitoramento._id,
          });
          novas += 1;

          // enriquecimento via DataJud + nome das partes rodam sozinhos, em background,
          // sem o usuario precisar pedir - nunca bloqueia nem falha a ingestao da publicacao.
          this.processosService.enriquecerEmBackground(
            monitoramento.tenant_id,
            mapeada.numero_processo,
            mapeada.tribunal,
          );
          this.processosService
            .atualizarPartes(monitoramento.tenant_id, mapeada.numero_processo, {
              parte_ativa: mapeada.parte_ativa,
              parte_passiva: mapeada.parte_passiva,
            })
            .catch(() => undefined);
          // enquanto o DataJud nao confirma o processo, ja deixamos um registro minimo
          // visivel em /processos com o que a publicacao trouxe (nunca sobrescreve dado real)
          this.processosService
            .garantirProcessoProvisorio(monitoramento.tenant_id, mapeada.numero_processo, {
              tribunal: mapeada.tribunal,
              classe: mapeada.classe_processual,
            })
            .catch(() => undefined);
          if (mapeada.audiencia_data) {
            this.processosService
              .atualizarProximaAudiencia(monitoramento.tenant_id, mapeada.numero_processo, mapeada.audiencia_data)
              .catch(() => undefined);
          }
        } catch (err: unknown) {
          if (isDuplicateKeyError(err)) {
            duplicadas += 1;
          } else {
            throw err;
          }
        }
      }

      await this.monitoramentoModel.updateOne(
        { _id: monitoramento._id },
        { ultima_execucao_em: new Date(), ultima_execucao_status: 'sucesso', ultima_execucao_mensagem: null },
      );

      return {
        monitoramentoId: String(monitoramento._id),
        encontradas: resposta.items.length,
        novas,
        duplicadas,
      };
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'erro desconhecido';
      await this.monitoramentoModel.updateOne(
        { _id: monitoramento._id },
        { ultima_execucao_em: new Date(), ultima_execucao_status: 'erro', ultima_execucao_mensagem: mensagem },
      );
      this.logger.error(`Erro no monitoramento ${monitoramento._id}: ${mensagem}`);
      return {
        monitoramentoId: String(monitoramento._id),
        encontradas: 0,
        novas: 0,
        duplicadas: 0,
        erro: mensagem,
      };
    }
  }

  /** Roda todos os monitoramentos ativos de um tenant (ou de todos os tenants se omitido). */
  async executarTodosAtivos(dataInicio: string, dataFim: string, tenantId?: string): Promise<ResultadoIngestao[]> {
    const filtro: Record<string, unknown> = { ativo: true };
    if (tenantId) filtro.tenant_id = new Types.ObjectId(tenantId);

    const monitoramentos = await this.monitoramentoModel.find(filtro).exec();
    const resultados: ResultadoIngestao[] = [];
    for (const monitoramento of monitoramentos) {
      // sequencial de proposito: evita estourar rate limit da API publica do CNJ
      resultados.push(await this.executarMonitoramento(monitoramento, dataInicio, dataFim));
    }
    return resultados;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000;
}
