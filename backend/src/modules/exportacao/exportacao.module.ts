import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cliente, ClienteSchema } from '../clientes/schemas/cliente.schema';
import { Processo, ProcessoSchema } from '../processos/schemas/processo.schema';
import { Tarefa, TarefaSchema } from '../tarefas/schemas/tarefa.schema';
import { Lancamento, LancamentoSchema } from '../financeiro/schemas/lancamento.schema';
import { ExportacaoController } from './exportacao.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cliente.name, schema: ClienteSchema },
      { name: Processo.name, schema: ProcessoSchema },
      { name: Tarefa.name, schema: TarefaSchema },
      { name: Lancamento.name, schema: LancamentoSchema },
    ]),
  ],
  controllers: [ExportacaoController],
})
export class ExportacaoModule {}
