import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class MovimentoProcesso {
  @Prop({ required: true })
  data: Date;

  @Prop({ required: true })
  descricao: string;

  @Prop()
  codigo?: number;
}
export const MovimentoProcessoSchema = SchemaFactory.createForClass(MovimentoProcesso);

export type TipoHonorario = 'fixo' | 'percentual' | 'exito' | 'misto';

@Schema({ _id: false })
export class DivisaoHonorario {
  @Prop({ type: Types.ObjectId, required: true })
  usuario_id: Types.ObjectId;

  @Prop({ required: true })
  percentual: number;
}
export const DivisaoHonorarioSchema = SchemaFactory.createForClass(DivisaoHonorario);

@Schema({ _id: false })
export class Honorarios {
  @Prop({ enum: ['fixo', 'percentual', 'exito', 'misto'] })
  tipo?: TipoHonorario;

  @Prop()
  valor_fixo?: number;

  @Prop()
  percentual?: number;

  @Prop()
  observacoes?: string;

  @Prop({ type: [DivisaoHonorarioSchema], default: [] })
  divisoes: DivisaoHonorario[];
}
export const HonorariosSchema = SchemaFactory.createForClass(Honorarios);

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Processo extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  numero_cnj: string;

  @Prop()
  tribunal?: string;

  @Prop()
  grau?: string;

  @Prop()
  classe?: string;

  @Prop({ type: [String], default: [] })
  assuntos: string[];

  @Prop()
  orgao_julgador?: string;

  @Prop()
  parte_ativa?: string; // reclamante/autor - extraido do teor das publicacoes (DataJud nao expoe partes)

  @Prop()
  parte_passiva?: string; // reclamado/reu

  @Prop({ type: Types.ObjectId, index: true })
  cliente_id?: Types.ObjectId; // vinculo automatico: nome do cliente bate com parte_ativa/parte_passiva

  // litisconsorcio: outros clientes do escritorio que tambem sao parte no mesmo
  // processo, alem do cliente_id "principal" - aditivo, nao muda o comportamento de
  // quem so tem um cliente por processo
  @Prop({ type: [Types.ObjectId], default: [], index: true })
  clientes_adicionais: Types.ObjectId[];

  @Prop()
  data_ajuizamento?: Date;

  @Prop()
  valor_causa?: number;

  @Prop({ default: 'ativo' })
  status: 'ativo' | 'suspenso' | 'encerrado' | 'arquivado';

  @Prop({ type: [MovimentoProcessoSchema], default: [] })
  movimentacoes: MovimentoProcesso[];

  @Prop()
  datajud_atualizado_em?: Date;

  @Prop({ type: Object })
  datajud_raw?: Record<string, unknown>;

  // criado a partir de uma publicacao (DJEN), antes do DataJud indexar o processo -
  // vira false automaticamente assim que o enriquecimento via DataJud tiver sucesso
  @Prop({ default: false })
  provisorio: boolean;

  // data da audiencia mais recente identificada nas publicacoes do processo - alimenta
  // os submenus "Audiência agendada" / "Aguardando sentença" do filtro de status
  @Prop({ index: true })
  proxima_audiencia?: Date;

  // anotacoes manuais do advogado - o DataJud nao expoe nenhum desses campos
  @Prop()
  fase_processual?: string;

  @Prop()
  advogado_parte_contraria?: string;

  @Prop()
  observacoes?: string;

  @Prop({ type: HonorariosSchema })
  honorarios?: Honorarios;

  // advogado responsavel pela carteira do processo - usado no painel executivo do
  // socio (carga de trabalho por pessoa) e, futuramente, em permissao por carteira
  @Prop({ type: Types.ObjectId, index: true })
  responsavel_id?: Types.ObjectId;

  // tags livres do advogado (ex.: "prioridade", "cliente vip") - distintas de
  // "assuntos", que vem do DataJud
  @Prop({ type: [String], default: [], index: true })
  tags: string[];

  // cache do resumo gerado por IA (Copiloto) - evita chamar a API a cada vez que a
  // aba Timeline e aberta; invalidado manualmente pelo botao "Regenerar"
  @Prop()
  ia_resumo?: string;

  @Prop()
  ia_resumo_gerado_em?: Date;
}

export const ProcessoSchema = SchemaFactory.createForClass(Processo);
ProcessoSchema.index({ tenant_id: 1, numero_cnj: 1 }, { unique: true });
