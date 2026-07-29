import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EtapaOportunidade = 'novo' | 'contato' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Oportunidade extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  titulo: string;

  @Prop({ type: Types.ObjectId, index: true })
  cliente_id?: Types.ObjectId;

  @Prop()
  cliente_nome?: string;

  @Prop()
  valor_estimado?: number;

  @Prop({ default: 'novo', index: true })
  etapa: EtapaOportunidade;

  @Prop({ type: Types.ObjectId })
  responsavel_id?: Types.ObjectId;

  @Prop()
  notas?: string;
}

export const OportunidadeSchema = SchemaFactory.createForClass(Oportunidade);
OportunidadeSchema.index({ tenant_id: 1, etapa: 1 });
