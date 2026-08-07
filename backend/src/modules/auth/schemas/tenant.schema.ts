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

  @Prop()
  logo_key?: string;

  // saldo de creditos de IA (Copiloto) - 1 credito = US$ 0.01 de custo estimado de
  // API. Comeca com uma carga gratuita para o tenant poder experimentar; ainda nao
  // ha billing real - creditos adicionais sao carregados manualmente por um admin.
  @Prop({ default: 1000 })
  ia_creditos: number;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
