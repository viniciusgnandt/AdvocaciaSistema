import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// catalogo fixo de permissoes que um grupo pode conceder, alem do que o perfil basico
// (admin/advogado/assistente) ja da. Um usuario admin sempre tem tudo, independente de
// grupo - grupos servem pra dar poderes extras a advogados/assistentes especificos.
export const CATALOGO_PERMISSOES = [
  'financeiro.gerenciar',
  'processos.excluir',
  'clientes.excluir',
  'tarefas.gerenciar_todas',
  'equipe.gerenciar',
  'escritorio.editar',
  'terceirizacao.gerenciar',
  'processos.ver_todos',
] as const;

export type Permissao = (typeof CATALOGO_PERMISSOES)[number];

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Grupo extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  nome: string;

  @Prop({ type: [String], default: [] })
  permissoes: Permissao[];
}

export const GrupoSchema = SchemaFactory.createForClass(Grupo);
GrupoSchema.index({ tenant_id: 1, nome: 1 }, { unique: true });
