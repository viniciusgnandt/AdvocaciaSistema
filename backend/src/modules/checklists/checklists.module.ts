import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChecklistTemplate, ChecklistTemplateSchema } from './schemas/checklist-template.schema';
import { Tarefa, TarefaSchema } from '../tarefas/schemas/tarefa.schema';
import { Processo, ProcessoSchema } from '../processos/schemas/processo.schema';
import { ChecklistsController } from './checklists.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChecklistTemplate.name, schema: ChecklistTemplateSchema },
      { name: Tarefa.name, schema: TarefaSchema },
      { name: Processo.name, schema: ProcessoSchema },
    ]),
  ],
  controllers: [ChecklistsController],
})
export class ChecklistsModule {}
