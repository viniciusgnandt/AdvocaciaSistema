import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TipoCliente = 'pf' | 'pj';
export type StatusCliente = 'ativo' | 'inativo' | 'prospect';
export type EstadoCivil = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel';

@Schema({ _id: false })
export class Endereco {
  @Prop() cep?: string;
  @Prop() logradouro?: string;
  @Prop() numero?: string;
  @Prop() complemento?: string;
  @Prop() bairro?: string;
  @Prop() cidade?: string;
  @Prop() uf?: string;
}
export const EnderecoSchema = SchemaFactory.createForClass(Endereco);

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Cliente extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenant_id: Types.ObjectId;

  @Prop({ default: 'pf' })
  tipo: TipoCliente;

  @Prop({ required: true })
  nome: string;

  @Prop()
  cpf?: string;

  @Prop()
  cnpj?: string;

  @Prop()
  email?: string;

  @Prop()
  telefone?: string;

  @Prop()
  whatsapp?: string;

  @Prop({ default: 'ativo' })
  status: StatusCliente;

  @Prop()
  origem_lead?: string;

  // quem indicou este cliente ao escritorio - outro cliente cadastrado, usado para
  // montar o grafo de indicacao entre clientes
  @Prop({ type: Types.ObjectId, index: true })
  indicado_por_id?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop() profissao?: string;
  @Prop() data_nascimento?: string;
  @Prop({ enum: ['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel'] })
  estado_civil?: EstadoCivil;
  @Prop() razao_social?: string;
  @Prop() nome_fantasia?: string;
  @Prop() observacoes?: string;

  @Prop({ type: EnderecoSchema })
  endereco?: Endereco;

  // portal do cliente: acesso somente leitura via link com token, sem senha - o
  // escritorio ativa e compartilha o link manualmente (nao ha envio de e-mail)
  @Prop()
  portal_token?: string;

  @Prop({ default: false })
  portal_ativo: boolean;

  @Prop({ default: false })
  vip: boolean;

  // cache do resumo gerado por IA (Copiloto) - mesmo padrao usado em Processo
  @Prop()
  ia_resumo?: string;

  @Prop()
  ia_resumo_gerado_em?: Date;
}

export const ClienteSchema = SchemaFactory.createForClass(Cliente);
ClienteSchema.index({ tenant_id: 1, nome: 1 });
ClienteSchema.index({ portal_token: 1 }, { unique: true, sparse: true });
// partialFilterExpression, nao sparse: um indice sparse composto so ignora o documento
// se TODOS os campos do indice estiverem ausentes - como tenant_id esta sempre presente,
// "sparse" sozinho nunca excluia ninguem e cpf:null colidia entre clientes sem CPF.
ClienteSchema.index(
  { tenant_id: 1, cpf: 1 },
  { unique: true, partialFilterExpression: { cpf: { $exists: true, $type: 'string' } } },
);
ClienteSchema.index(
  { tenant_id: 1, cnpj: 1 },
  { unique: true, partialFilterExpression: { cnpj: { $exists: true, $type: 'string' } } },
);
