import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PrioridadeTarefa = 'baixa' | 'media' | 'alta' | 'critica';
export type StatusTarefa = 'pendente' | 'em_andamento' | 'concluida' | 'atrasada';
export type OrigemTarefa = 'manual' | 'prazo_publicacao' | 'audiencia_publicacao' | 'terceirizacao';
export type FrequenciaRecorrencia = 'diaria' | 'semanal' | 'mensal' | 'anual';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Tarefa extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  titulo: string;

  @Prop()
  descricao?: string;

  @Prop({ type: Types.ObjectId, index: true })
  publicacao_id?: Types.ObjectId;

  @Prop()
  numero_processo?: string;

  @Prop({ type: Types.ObjectId })
  responsavel_id?: Types.ObjectId;

  // responsaveis extras alem do principal - tarefa que envolve mais de uma pessoa
  // (ex.: advogado + estagiario revisando uma peca juntos)
  @Prop({ type: [Types.ObjectId], default: [], index: true })
  responsaveis_adicionais: Types.ObjectId[];

  @Prop({ required: true, index: true })
  data_vencimento: Date;

  @Prop({ default: 'media' })
  prioridade: PrioridadeTarefa;

  @Prop({ default: 'pendente', index: true })
  status: StatusTarefa;

  @Prop({ default: 'manual' })
  origem: OrigemTarefa;

  @Prop()
  concluida_em?: Date;

  // presente = tarefa recorrente; ao concluir, o controller cria a proxima ocorrencia
  // com data_vencimento avancada por essa frequencia
  @Prop()
  recorrencia?: FrequenciaRecorrencia;
}

export const TarefaSchema = SchemaFactory.createForClass(Tarefa);
TarefaSchema.index({ tenant_id: 1, data_vencimento: 1 });
TarefaSchema.index({ tenant_id: 1, status: 1 });
// evita duplicar tarefa ao clicar "criar tarefa" mais de uma vez na mesma publicacao.
// partialFilterExpression, nao sparse: um indice sparse composto so ignora o documento
// se TODOS os campos do indice estiverem ausentes - como tenant_id e origem estao
// sempre presentes, "sparse" sozinho nunca excluia ninguem e toda tarefa manual
// (publicacao_id ausente) colidia como se fosse duplicata da primeira criada.
TarefaSchema.index(
  { tenant_id: 1, publicacao_id: 1, origem: 1 },
  { unique: true, partialFilterExpression: { publicacao_id: { $exists: true } } },
);
