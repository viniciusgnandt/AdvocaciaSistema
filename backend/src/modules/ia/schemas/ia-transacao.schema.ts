import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TipoTransacaoIa = 'consumo' | 'credito';

/** Extrato de creditos de IA por tenant - cada chamada real a Claude gera um
 * lancamento "consumo" com o custo estimado convertido em creditos; cada
 * carga manual (simulando uma compra, ate existir billing de verdade) gera
 * um lancamento "credito". */
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class IaTransacao extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true, enum: ['consumo', 'credito'] })
  tipo: TipoTransacaoIa;

  @Prop({ required: true })
  creditos: number; // sempre positivo - o sinal e dado pelo "tipo"

  @Prop()
  operacao?: string; // ex.: "gerar-documento", "copiloto", "resumo-processo"

  @Prop()
  tokens_entrada?: number;

  @Prop()
  tokens_saida?: number;

  @Prop({ type: Types.ObjectId })
  usuario_id?: Types.ObjectId;
}

export const IaTransacaoSchema = SchemaFactory.createForClass(IaTransacao);
IaTransacaoSchema.index({ tenant_id: 1, created_at: -1 });
