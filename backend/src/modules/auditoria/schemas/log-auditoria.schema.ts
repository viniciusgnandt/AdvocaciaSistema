import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AcaoAuditoria = 'criar' | 'atualizar' | 'excluir';
export type EntidadeAuditoria = 'cliente' | 'processo' | 'lancamento' | 'usuario' | 'tarefa';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class LogAuditoria extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  usuario_email: string;

  @Prop()
  usuario_nome?: string;

  @Prop({ required: true })
  acao: AcaoAuditoria;

  @Prop({ required: true, index: true })
  entidade: EntidadeAuditoria;

  @Prop({ required: true })
  entidade_id: string;

  @Prop()
  descricao?: string;
}

export const LogAuditoriaSchema = SchemaFactory.createForClass(LogAuditoria);
LogAuditoriaSchema.index({ tenant_id: 1, created_at: -1 });
