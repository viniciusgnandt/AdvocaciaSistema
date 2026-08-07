import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ModeloDocumento extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  nome: string;

  @Prop({ required: true })
  tipo_documento: string;

  @Prop({ required: true })
  conteudo: string;

  @Prop({ type: Types.ObjectId })
  criado_por?: Types.ObjectId;
}

export const ModeloDocumentoSchema = SchemaFactory.createForClass(ModeloDocumento);
