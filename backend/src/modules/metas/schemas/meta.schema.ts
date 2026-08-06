import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MetricaMeta = 'faturamento' | 'processos_ativos' | 'tarefas_concluidas';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Meta extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  usuario_id: Types.ObjectId;

  @Prop({ required: true, enum: ['faturamento', 'processos_ativos', 'tarefas_concluidas'] })
  metrica: MetricaMeta;

  // formato YYYY-MM - meta e' sempre mensal por simplicidade (evita ter que resolver
  // janelas de tempo arbitrarias no calculo de progresso)
  @Prop({ required: true })
  mes: string;

  @Prop({ required: true })
  valor_meta: number;
}

export const MetaSchema = SchemaFactory.createForClass(Meta);
MetaSchema.index({ tenant_id: 1, usuario_id: 1, metrica: 1, mes: 1 }, { unique: true });
