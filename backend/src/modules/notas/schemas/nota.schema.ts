import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EntidadeNota = 'processo' | 'cliente';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Nota extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true, enum: ['processo', 'cliente'] })
  entidade: EntidadeNota;

  // numero_cnj para processo, id do cliente (string) para cliente - guardado como
  // string pra nao forcar cast de ObjectId no caso do numero_cnj
  @Prop({ required: true, index: true })
  entidade_id: string;

  @Prop({ required: true })
  texto: string;

  @Prop({ type: Types.ObjectId, required: true })
  usuario_id: Types.ObjectId;

  @Prop({ required: true })
  usuario_nome: string;
}

export const NotaSchema = SchemaFactory.createForClass(Nota);
NotaSchema.index({ tenant_id: 1, entidade: 1, entidade_id: 1, created_at: -1 });
