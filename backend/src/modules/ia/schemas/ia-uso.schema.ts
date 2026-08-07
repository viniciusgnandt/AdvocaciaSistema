import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/** Contador de chamadas de IA por tenant/mes, usado para aplicar uma cota mensal
 * simples e evitar custo descontrolado de API. */
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class IaUso extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  ano_mes: string; // "2026-08"

  @Prop({ default: 0 })
  contagem: number;
}

export const IaUsoSchema = SchemaFactory.createForClass(IaUso);
IaUsoSchema.index({ tenant_id: 1, ano_mes: 1 }, { unique: true });
