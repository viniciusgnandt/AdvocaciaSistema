import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Monitoramento, MonitoramentoSchema } from './schemas/monitoramento.schema';
import { Publicacao, PublicacaoSchema } from './schemas/publicacao.schema';
import { DjenConnectorService } from './connectors/djen-connector.service';
import { PublicacoesIngestaoService } from './publicacoes-ingestao.service';
import { PublicacoesSchedulerService } from './publicacoes-scheduler.service';
import { PublicacoesController } from './publicacoes.controller';
import { ProcessosModule } from '../processos/processos.module';

@Module({
  imports: [
    HttpModule,
    ProcessosModule,
    MongooseModule.forFeature([
      { name: Monitoramento.name, schema: MonitoramentoSchema },
      { name: Publicacao.name, schema: PublicacaoSchema },
    ]),
  ],
  controllers: [PublicacoesController],
  providers: [DjenConnectorService, PublicacoesIngestaoService, PublicacoesSchedulerService],
  exports: [PublicacoesIngestaoService],
})
export class PublicacoesModule {}
