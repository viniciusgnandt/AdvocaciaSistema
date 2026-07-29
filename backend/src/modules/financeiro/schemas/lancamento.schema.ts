import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TipoLancamento = 'receita' | 'despesa';
export type StatusLancamento = 'pendente' | 'pago' | 'atrasado' | 'cancelado';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Lancamento extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  tipo: TipoLancamento;

  @Prop({ required: true })
  descricao: string;

  @Prop({ required: true })
  valor: number;

  @Prop()
  categoria?: string;

  @Prop({ type: Types.ObjectId, index: true })
  cliente_id?: Types.ObjectId;

  @Prop()
  numero_processo?: string;

  @Prop({ required: true, index: true })
  data_vencimento: Date;

  @Prop()
  data_pagamento?: Date;

  @Prop({ default: 'pendente', index: true })
  status: StatusLancamento;

  // presentes so quando o lancamento faz parte de um parcelamento (honorarios em N vezes, por ex.)
  @Prop({ type: Types.ObjectId, index: true })
  grupo_parcelamento_id?: Types.ObjectId;

  @Prop()
  parcela_atual?: number;

  @Prop()
  parcela_total?: number;
}

export const LancamentoSchema = SchemaFactory.createForClass(Lancamento);
LancamentoSchema.index({ tenant_id: 1, data_vencimento: -1 });
