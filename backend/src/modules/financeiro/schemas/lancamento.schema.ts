import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TipoLancamento = 'receita' | 'despesa';
export type StatusLancamento = 'pendente' | 'pago' | 'atrasado' | 'cancelado';
export type StatusAprovacao = 'aprovado' | 'pendente' | 'rejeitado';

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

  // fluxo de aprovacao - so se aplica a despesas lancadas por quem nao e' admin/nao
  // tem "financeiro.gerenciar"; nesses casos comeca "pendente" e so pode virar "pago"
  // depois de aprovado. Despesas de quem ja tem a permissao nascem "aprovado" (nao
  // precisam aprovar o proprio lancamento)
  @Prop({ default: 'aprovado', enum: ['aprovado', 'pendente', 'rejeitado'] })
  aprovacao_status: StatusAprovacao;

  @Prop()
  solicitado_por_nome?: string;

  @Prop({ type: Types.ObjectId })
  aprovado_por?: Types.ObjectId;

  @Prop()
  aprovado_por_nome?: string;

  @Prop()
  aprovado_em?: Date;
}

export const LancamentoSchema = SchemaFactory.createForClass(Lancamento);
LancamentoSchema.index({ tenant_id: 1, data_vencimento: -1 });
