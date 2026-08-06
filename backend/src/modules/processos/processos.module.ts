import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Processo, ProcessoSchema } from './schemas/processo.schema';
import { Tarefa, TarefaSchema } from '../tarefas/schemas/tarefa.schema';
import { DatajudConnectorService } from './connectors/datajud-connector.service';
import { ProcessosController } from './processos.controller';
import { ProcessosService } from './processos.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Processo.name, schema: ProcessoSchema },
      { name: Tarefa.name, schema: TarefaSchema },
    ]),
    AuditoriaModule,
    FinanceiroModule,
  ],
  controllers: [ProcessosController],
  providers: [DatajudConnectorService, ProcessosService],
  exports: [DatajudConnectorService, ProcessosService],
})
export class ProcessosModule {}
