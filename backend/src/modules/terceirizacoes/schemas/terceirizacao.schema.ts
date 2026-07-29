import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TipoServicoTerceirizado = 'correspondente' | 'peticao' | 'sustentacao_oral' | 'audiencia' | 'outro';
export type StatusTerceirizacao = 'pendente' | 'concluido' | 'cancelado';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Terceirizacao extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  tipo_servico: TipoServicoTerceirizado;

  @Prop({ required: true })
  contratante: string;

  @Prop({ required: true })
  descricao: string;

  @Prop()
  numero_processo?: string;

  @Prop({ required: true, index: true })
  data_compromisso: Date;

  @Prop()
  valor?: number;

  @Prop({ default: 'pendente', index: true })
  status: StatusTerceirizacao;

  // referencias criadas automaticamente ao salvar, para manter tarefa/lancamento em sincronia
  @Prop({ type: Types.ObjectId })
  tarefa_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  lancamento_id?: Types.ObjectId;
}

export const TerceirizacaoSchema = SchemaFactory.createForClass(Terceirizacao);
TerceirizacaoSchema.index({ tenant_id: 1, data_compromisso: -1 });
