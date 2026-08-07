import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TipoDocumento = 'peca' | 'contrato' | 'procuracao' | 'comprovante' | 'imagem' | 'email' | 'outro';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Documento extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  processo_id?: Types.ObjectId;

  @Prop()
  numero_processo?: string;

  @Prop({ type: Types.ObjectId, index: true })
  cliente_id?: Types.ObjectId;

  // movimentacoes do DataJud nao tem id proprio (array reescrito a cada enriquecimento);
  // a chave composta "ISO-da-data|descricao" identifica a movimentacao de forma estavel
  // sem depender de um _id que so existiria apos o proximo enriquecimento.
  @Prop({ index: true })
  movimentacao_chave?: string;

  @Prop({ type: Types.ObjectId, index: true })
  pasta_id?: Types.ObjectId; // ausente = raiz do processo

  @Prop({ required: true })
  nome: string;

  @Prop({ default: 'outro' })
  tipo: TipoDocumento;

  @Prop({ required: true })
  storage_key: string;

  @Prop({ required: true })
  mime: string;

  @Prop({ required: true })
  tamanho_bytes: number;

  @Prop({ type: Types.ObjectId })
  enviado_por?: Types.ObjectId;

  // validade opcional (procuracao, contrato, certidao...) - usada pelo alerta de
  // documento vencendo no sino de notificacoes
  @Prop()
  data_validade?: string;
}

export const DocumentoSchema = SchemaFactory.createForClass(Documento);
DocumentoSchema.index({ tenant_id: 1, processo_id: 1 });
DocumentoSchema.index({ tenant_id: 1, numero_processo: 1 });
DocumentoSchema.index({ tenant_id: 1, data_validade: 1 });
