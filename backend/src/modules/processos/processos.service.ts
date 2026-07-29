import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Processo } from './schemas/processo.schema';
import { DatajudConnectorService } from './connectors/datajud-connector.service';
import { mapDatajudToProcesso } from './processos.util';

const REVALIDAR_APOS_HORAS = 24;

/**
 * Enriquecimento de processos via DataJud. E deliberadamente transparente ao usuario:
 * nao existe botao "enriquecer" na UI - toda vez que uma publicacao nova chega
 * (PublicacoesIngestaoService) o processo correspondente e enriquecido em background,
 * best-effort, sem bloquear a resposta e sem expor falhas ao usuario final.
 */
@Injectable()
export class ProcessosService {
  private readonly logger = new Logger(ProcessosService.name);

  constructor(
    @InjectModel(Processo.name) private readonly processoModel: Model<Processo>,
    private readonly datajud: DatajudConnectorService,
  ) {}

  /** Mapa numero_cnj -> partes, usado para preencher publicacoes cujo proprio texto
   * nao trouxe reclamante/reclamado (ex.: avisos de distribuicao), mas o processo
   * ja teve as partes descobertas por outra publicacao do mesmo numero. */
  async buscarPartesPorNumeros(
    tenantId: Types.ObjectId,
    numerosCnj: string[],
  ): Promise<Map<string, { parte_ativa?: string; parte_passiva?: string }>> {
    if (numerosCnj.length === 0) return new Map();
    const processos = await this.processoModel
      .find(
        { tenant_id: tenantId, numero_cnj: { $in: numerosCnj } },
        { numero_cnj: 1, parte_ativa: 1, parte_passiva: 1 },
      )
      .lean();
    return new Map(processos.map((p) => [p.numero_cnj, { parte_ativa: p.parte_ativa, parte_passiva: p.parte_passiva }]));
  }

  async enriquecer(tenantId: Types.ObjectId, numeroCnj: string, tribunal: string) {
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    const fonte = await this.datajud.buscarProcesso(numeroLimpo, tribunal);
    if (!fonte) return null;

    const dados = mapDatajudToProcesso(fonte);
    return this.processoModel.findOneAndUpdate(
      { tenant_id: tenantId, numero_cnj: numeroLimpo },
      // provisorio:false aqui "promove" um registro criado a partir de publicacao
      // (garantirProcessoProvisorio) para definitivo, assim que o DataJud confirma o processo.
      { $set: { numero_cnj: numeroLimpo, provisorio: false, ...dados } },
      // setDefaultsOnInsert: sem isso, upsert nao aplica os defaults do schema (ex.: status)
      // ao criar o documento - o campo fica ausente no banco (so "parece" default na leitura).
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  /**
   * Cria um registro minimo de processo a partir dos dados que ja temos de uma
   * publicacao (tribunal, classe), enquanto o DataJud ainda nao indexou o processo
   * de verdade. So insere se o processo ainda nao existir (provisorio ou definitivo) -
   * nunca sobrescreve dados ja gravados, sejam eles provisorios ou reais.
   */
  async garantirProcessoProvisorio(
    tenantId: Types.ObjectId,
    numeroCnj: string,
    dados: { tribunal?: string; classe?: string },
  ): Promise<void> {
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    await this.processoModel.updateOne(
      { tenant_id: tenantId, numero_cnj: numeroLimpo },
      {
        $setOnInsert: {
          tenant_id: tenantId,
          numero_cnj: numeroLimpo,
          tribunal: dados.tribunal,
          classe: dados.classe,
          status: 'ativo',
          provisorio: true,
          movimentacoes: [],
          assuntos: [],
        },
      },
      { upsert: true },
    );
  }

  /**
   * Dispara o enriquecimento em background, sem bloquear quem chamou e sem propagar
   * erro (rede instavel do DataJud ou processo ainda nao indexado nao pode derrubar
   * o fluxo de ingestao de publicacoes). So reprocessa se nunca enriquecido ou se a
   * ultima atualizacao passou de REVALIDAR_APOS_HORAS.
   */
  /**
   * Grava/atualiza o nome das partes (reclamante/reclamado etc.) extraido do teor das
   * publicacoes - o DataJud nao expoe partes, entao essa e a unica fonte disponivel.
   * Upsert leve: nao sobrescreve com vazio e nao depende do enriquecimento via DataJud
   * ter rodado (se o processo ainda nao existe, cria um registro minimo).
   */
  async atualizarPartes(
    tenantId: Types.ObjectId,
    numeroCnj: string,
    partes: { parte_ativa?: string; parte_passiva?: string },
  ): Promise<void> {
    const set: Record<string, string> = {};
    if (partes.parte_ativa) set.parte_ativa = partes.parte_ativa;
    if (partes.parte_passiva) set.parte_passiva = partes.parte_passiva;
    if (Object.keys(set).length === 0) return;

    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    await this.processoModel.updateOne(
      { tenant_id: tenantId, numero_cnj: numeroLimpo },
      { $set: set },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  /**
   * Guarda a data da audiencia mais recente identificada numa publicacao - alimenta os
   * submenus "Audiência agendada" (data futura) e "Aguardando sentença" (data passada,
   * processo ainda ativo) do filtro de status em /processos.
   */
  async atualizarProximaAudiencia(tenantId: Types.ObjectId, numeroCnj: string, audienciaData: Date): Promise<void> {
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    await this.processoModel.updateOne(
      { tenant_id: tenantId, numero_cnj: numeroLimpo },
      { $set: { proxima_audiencia: audienciaData } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  enriquecerEmBackground(tenantId: Types.ObjectId, numeroCnj: string, tribunal?: string): void {
    if (!tribunal || !this.datajud.habilitado) return;
    const numeroLimpo = numeroCnj.replace(/\D/g, '');

    this.processoModel
      .findOne({ tenant_id: tenantId, numero_cnj: numeroLimpo })
      .then(async (existente) => {
        const precisaAtualizar =
          !existente?.datajud_atualizado_em ||
          Date.now() - existente.datajud_atualizado_em.getTime() > REVALIDAR_APOS_HORAS * 60 * 60 * 1000;
        if (!precisaAtualizar) return;

        await this.enriquecer(tenantId, numeroLimpo, tribunal);
        this.logger.log(`Processo ${numeroLimpo} (${tribunal}) enriquecido via DataJud em background`);
      })
      .catch((err) => {
        this.logger.warn(`Enriquecimento em background falhou para ${numeroLimpo} (${tribunal}): ${err.message}`);
      });
  }
}
