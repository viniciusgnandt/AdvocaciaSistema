import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// "Time" de trabalho (ex.: "Time Cível", "Time Trabalhista") - so' organiza pessoas pra
// filtrar processos/tarefas por equipe; nao mexe em permissao (isso e' o Grupo).
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class TimeTrabalho extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  nome: string;

  @Prop()
  cor?: string;

  @Prop({ type: [Types.ObjectId], default: [] })
  membros: Types.ObjectId[];
}

export const TimeTrabalhoSchema = SchemaFactory.createForClass(TimeTrabalho);
TimeTrabalhoSchema.index({ tenant_id: 1, nome: 1 }, { unique: true });
