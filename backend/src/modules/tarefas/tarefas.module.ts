import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tarefa, TarefaSchema } from './schemas/tarefa.schema';
import { Publicacao, PublicacaoSchema } from '../publicacoes/schemas/publicacao.schema';
import { TarefasController } from './tarefas.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tarefa.name, schema: TarefaSchema },
      { name: Publicacao.name, schema: PublicacaoSchema },
    ]),
  ],
  controllers: [TarefasController],
})
export class TarefasModule {}
