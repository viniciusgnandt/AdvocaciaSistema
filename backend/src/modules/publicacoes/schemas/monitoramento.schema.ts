import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MonitoramentoTipo = 'oab' | 'cpf' | 'cnpj' | 'processo';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Monitoramento extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  tipo: MonitoramentoTipo;

  // valor do que esta sendo monitorado: numero da OAB, CPF, CNPJ ou numero do processo (CNJ)
  @Prop({ required: true })
  valor: string;

  // usado quando tipo = 'oab' para compor a busca (numero + UF)
  @Prop()
  oab_uf?: string;

  @Prop({ type: Types.ObjectId })
  advogado_id?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tribunais_alvo: string[];

  @Prop({ default: true })
  ativo: boolean;

  @Prop()
  ultima_execucao_em?: Date;

  @Prop()
  ultima_execucao_status?: 'sucesso' | 'erro';

  @Prop()
  ultima_execucao_mensagem?: string;
}

export const MonitoramentoSchema = SchemaFactory.createForClass(Monitoramento);
MonitoramentoSchema.index({ tenant_id: 1, tipo: 1, valor: 1, oab_uf: 1 }, { unique: true });
