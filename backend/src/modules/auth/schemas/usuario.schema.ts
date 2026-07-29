import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PerfilUsuario = 'admin' | 'advogado' | 'assistente';
export type StatusUsuario = 'ativo' | 'inativo' | 'convidado';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Usuario extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ required: true })
  nome: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, select: false })
  senha_hash: string;

  @Prop({ default: 'advogado' })
  perfil: PerfilUsuario;

  @Prop()
  oab?: string;

  @Prop({ default: 'ativo' })
  status: StatusUsuario;

  @Prop()
  ultimo_login?: Date;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
UsuarioSchema.index({ tenant_id: 1, email: 1 }, { unique: true });
// email precisa ser globalmente unico tambem: e o campo usado no login antes de
// sabermos o tenant (o usuario nao digita "qual escritorio" ao entrar)
UsuarioSchema.index({ email: 1 }, { unique: true });
