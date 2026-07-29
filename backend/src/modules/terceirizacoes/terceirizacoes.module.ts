import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Terceirizacao, TerceirizacaoSchema } from './schemas/terceirizacao.schema';
import { Tarefa, TarefaSchema } from '../tarefas/schemas/tarefa.schema';
import { Lancamento, LancamentoSchema } from '../financeiro/schemas/lancamento.schema';
import { TerceirizacoesController } from './terceirizacoes.controller';
import { TerceirizacoesService } from './terceirizacoes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Terceirizacao.name, schema: TerceirizacaoSchema },
      { name: Tarefa.name, schema: TarefaSchema },
      { name: Lancamento.name, schema: LancamentoSchema },
    ]),
  ],
  controllers: [TerceirizacoesController],
  providers: [TerceirizacoesService],
})
export class TerceirizacoesModule {}
