import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Pasta extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  // uma pasta pertence a um processo OU a um cliente (nunca aos dois) - documentos do
  // cliente costumam nascer antes de existir processo, entao o escopo nao pode exigir
  // numero_processo.
  @Prop({ index: true })
  numero_processo?: string;

  @Prop({ type: Types.ObjectId, index: true })
  cliente_id?: Types.ObjectId;

  @Prop({ required: true })
  nome: string;

  @Prop({ type: Types.ObjectId, index: true })
  pasta_pai_id?: Types.ObjectId; // ausente = pasta na raiz do escopo
}

export const PastaSchema = SchemaFactory.createForClass(Pasta);
PastaSchema.index({ tenant_id: 1, numero_processo: 1, pasta_pai_id: 1 });
PastaSchema.index({ tenant_id: 1, cliente_id: 1, pasta_pai_id: 1 });
