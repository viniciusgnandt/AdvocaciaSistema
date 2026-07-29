import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PublicacoesIngestaoService } from './publicacoes-ingestao.service';

@Injectable()
export class PublicacoesSchedulerService {
  private readonly logger = new Logger(PublicacoesSchedulerService.name);

  constructor(private readonly ingestao: PublicacoesIngestaoService) {}

  /**
   * Execucao diaria as 05:00 - o DJEN normalmente disponibiliza a edicao do dia
   * na madrugada. Em producao isso migra para um worker dedicado (BullMQ) com
   * retries e distribuicao entre tenants; este Cron cobre a v1 de um unico processo.
   */
  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async pullDiario() {
    const hoje = new Date().toISOString().slice(0, 10);
    this.logger.log(`Iniciando pull diario de publicacoes (DJEN) para ${hoje}`);
    const resultados = await this.ingestao.executarTodosAtivos(hoje, hoje);
    const totalNovas = resultados.reduce((acc, r) => acc + r.novas, 0);
    this.logger.log(`Pull diario concluido: ${resultados.length} monitoramentos, ${totalNovas} publicacoes novas`);
  }
}
