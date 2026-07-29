import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantStatus = 'trial' | 'ativo' | 'suspenso' | 'cancelado';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Tenant extends Document {
  @Prop({ required: true })
  nome_escritorio: string;

  @Prop()
  cnpj?: string;

  @Prop({ default: 'trial' })
  status: TenantStatus;

  @Prop({ default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) })
  trial_expires_at: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
