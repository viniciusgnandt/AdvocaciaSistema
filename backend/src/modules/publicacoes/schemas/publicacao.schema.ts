import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PublicacaoStatus = 'nao_lida' | 'lida' | 'triada' | 'vinculada' | 'arquivada';
export type PublicacaoUrgencia = 'baixa' | 'media' | 'alta' | 'critica';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Publicacao extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  monitoramento_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  processo_id?: Types.ObjectId;

  @Prop({ required: true })
  fonte: string; // 'djen' | 'api_stj' | 'api_stf' | 'scraper_<tribunal>' ...

  @Prop()
  tribunal?: string;

  @Prop({ required: true, index: true })
  numero_processo: string;

  @Prop({ required: true })
  data_disponibilizacao: Date;

  @Prop()
  tipo_comunicacao?: string;

  @Prop()
  nome_orgao?: string;

  @Prop({ default: 'outro', index: true })
  classificacao: string; // audiencia | sentenca | decisao | despacho | citacao | prazo | embargos | recurso | penhora_bloqueio | outro

  @Prop()
  prazo_dias?: number;

  @Prop()
  prazo_data_limite?: Date;

  @Prop()
  audiencia_data?: Date;

  @Prop()
  inteiro_teor_texto?: string;

  @Prop()
  inteiro_teor_pdf_url?: string;

  @Prop()
  classe_processual?: string;

  @Prop()
  numero_comunicacao?: number;

  @Prop()
  meio?: string; // D = Diario, E = Eletronico (push direto), conforme DJEN

  @Prop()
  parte_ativa?: string; // reclamante/autor/requerente/exequente

  @Prop()
  parte_passiva?: string; // reclamado/reu/requerido/executado

  @Prop({ type: [{ nome: String, numero_oab: String, uf_oab: String }], default: [] })
  advogados_destinatarios: { nome: string; numero_oab?: string; uf_oab?: string }[];

  @Prop({ default: 'nao_lida' })
  status: PublicacaoStatus;

  @Prop({ default: 'media' })
  urgencia: PublicacaoUrgencia;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ required: true, unique: false })
  hash_dedupe: string;

  @Prop({ type: Object })
  raw?: Record<string, unknown>; // payload original da fonte, para auditoria/reprocessamento
}

export const PublicacaoSchema = SchemaFactory.createForClass(Publicacao);

// dedupe: a mesma publicacao (mesma fonte/processo/data/orgao) nao deve ser gravada duas vezes
PublicacaoSchema.index({ tenant_id: 1, hash_dedupe: 1 }, { unique: true });
PublicacaoSchema.index({ tenant_id: 1, data_disponibilizacao: -1 });
PublicacaoSchema.index({ tenant_id: 1, status: 1, urgencia: 1 });
PublicacaoSchema.index({ tenant_id: 1, numero_processo: 1 });
PublicacaoSchema.index({ tenant_id: 1, classificacao: 1 });
PublicacaoSchema.index({ tenant_id: 1, prazo_data_limite: 1 });
