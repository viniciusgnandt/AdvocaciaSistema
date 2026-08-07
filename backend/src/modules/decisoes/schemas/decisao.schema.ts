import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StatusDecisao = 'pendente' | 'aprovada' | 'rejeitada';

// pedido de decisao entre socios - um advogado registra algo que precisa do aval de
// um socio/admin (ex.: "aceitar acordo de R$X com o cliente Y") e qualquer admin
// pode aprovar ou rejeitar, ficando registrado quem decidiu e quando.
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Decisao extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  titulo: string;

  @Prop()
  descricao?: string;

  @Prop()
  numero_processo?: string;

  @Prop({ type: Types.ObjectId })
  cliente_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  solicitado_por: Types.ObjectId;

  @Prop({ required: true })
  solicitado_por_nome: string;

  @Prop({ default: 'pendente' })
  status: StatusDecisao;

  @Prop({ type: Types.ObjectId })
  decidido_por?: Types.ObjectId;

  @Prop()
  decidido_por_nome?: string;

  @Prop()
  decidido_em?: Date;

  @Prop()
  nota_decisao?: string;
}

export const DecisaoSchema = SchemaFactory.createForClass(Decisao);
DecisaoSchema.index({ tenant_id: 1, status: 1 });
