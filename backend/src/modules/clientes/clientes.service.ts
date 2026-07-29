import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cliente } from './schemas/cliente.schema';
import { Processo } from '../processos/schemas/processo.schema';
import { Documento } from '../documentos/schemas/documento.schema';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';

function normalizarNome(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Vinculo cliente <-> processo e transparente: nao existe botao "vincular" na UI.
 * Ao criar (ou renomear) um cliente, comparamos o nome com parte_ativa/parte_passiva
 * dos processos ja enriquecidos e linkamos automaticamente os que baterem - mesmo
 * padrao ja usado no enriquecimento via DataJud (ProcessosService.enriquecerEmBackground).
 */
@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);

  constructor(
    @InjectModel(Cliente.name) private readonly clienteModel: Model<Cliente>,
    @InjectModel(Processo.name) private readonly processoModel: Model<Processo>,
    @InjectModel(Documento.name) private readonly documentoModel: Model<Documento>,
  ) {}

  async criar(tenantId: Types.ObjectId, dto: CriarClienteDto): Promise<Cliente> {
    const cliente = await this.clienteModel.create({ ...dto, tenant_id: tenantId });
    this.vincularProcessosEmBackground(tenantId, cliente._id as Types.ObjectId, cliente.nome);
    return cliente;
  }

  async listar(tenantId: Types.ObjectId, busca?: string): Promise<Cliente[]> {
    const filtro: Record<string, unknown> = { tenant_id: tenantId };
    if (busca) {
      const regex = { $regex: busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      filtro.$or = [{ nome: regex }, { cpf: regex }, { cnpj: regex }, { email: regex }];
    }
    return this.clienteModel.find(filtro).sort({ nome: 1 }).exec();
  }

  async buscar(tenantId: Types.ObjectId, clienteId: Types.ObjectId): Promise<Cliente | null> {
    return this.clienteModel.findOne({ _id: clienteId, tenant_id: tenantId });
  }

  async processosVinculados(tenantId: Types.ObjectId, clienteId: Types.ObjectId) {
    return this.processoModel.find({ tenant_id: tenantId, cliente_id: clienteId }).sort({ updated_at: -1 }).exec();
  }

  /**
   * Arquivos de todos os processos vinculados ao cliente, agregados num unico feed -
   * complementa os arquivos que o proprio cliente tem (upload direto, antes de existir
   * processo). Isso e so leitura: para organizar em pastas o advogado usa a tela do
   * processo em si.
   */
  async arquivosDosProcessos(tenantId: Types.ObjectId, clienteId: Types.ObjectId) {
    const processos = await this.processoModel.find({ tenant_id: tenantId, cliente_id: clienteId }, 'numero_cnj').exec();
    const numeros = processos.map((p) => p.numero_cnj);
    if (numeros.length === 0) return [];

    return this.documentoModel
      .find({ tenant_id: tenantId, numero_processo: { $in: numeros } })
      .sort({ created_at: -1 })
      .exec();
  }

  /** Vinculo manual: o advogado escolhe explicitamente qual processo pertence a qual
   * cliente - complementa o vinculo automatico por nome (util quando o processo nasce
   * antes de bater o nome, ou quando o nome da parte diverge do nome cadastrado). */
  async vincularProcesso(tenantId: Types.ObjectId, clienteId: Types.ObjectId, numeroCnj: string) {
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    return this.processoModel.findOneAndUpdate(
      { tenant_id: tenantId, numero_cnj: numeroLimpo },
      { $set: { cliente_id: clienteId } },
      { new: true },
    );
  }

  async desvincularProcesso(tenantId: Types.ObjectId, clienteId: Types.ObjectId, numeroCnj: string) {
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    return this.processoModel.findOneAndUpdate(
      { tenant_id: tenantId, numero_cnj: numeroLimpo, cliente_id: clienteId },
      { $unset: { cliente_id: '' } },
      { new: true },
    );
  }

  async atualizar(
    tenantId: Types.ObjectId,
    clienteId: Types.ObjectId,
    dto: AtualizarClienteDto,
  ): Promise<Cliente | null> {
    const cliente = await this.clienteModel.findOneAndUpdate(
      { _id: clienteId, tenant_id: tenantId },
      { $set: dto },
      { new: true },
    );
    // nome pode ter mudado - reavalia o vinculo automatico com processos (idempotente,
    // so afeta processos ainda sem cliente_id, entao nao desfaz vinculos ja existentes)
    if (cliente && dto.nome) {
      this.vincularProcessosEmBackground(tenantId, cliente._id as Types.ObjectId, cliente.nome);
    }
    return cliente;
  }

  async excluir(tenantId: Types.ObjectId, clienteId: Types.ObjectId): Promise<boolean> {
    const resultado = await this.clienteModel.deleteOne({ _id: clienteId, tenant_id: tenantId });
    if (resultado.deletedCount === 0) return false;

    // desfaz o vinculo nos processos - o cliente nao existe mais, o processo continua existindo
    await this.processoModel.updateMany({ tenant_id: tenantId, cliente_id: clienteId }, { $unset: { cliente_id: '' } });
    return true;
  }

  private vincularProcessosEmBackground(tenantId: Types.ObjectId, clienteId: Types.ObjectId, nome: string): void {
    const nomeNormalizado = normalizarNome(nome);
    const regexExato = new RegExp(`^${nomeNormalizado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    this.processoModel
      .updateMany(
        { tenant_id: tenantId, cliente_id: { $exists: false }, $or: [{ parte_ativa: regexExato }, { parte_passiva: regexExato }] },
        { $set: { cliente_id: clienteId } },
      )
      .then((resultado) => {
        if (resultado.modifiedCount > 0) {
          this.logger.log(`Cliente ${clienteId} vinculado automaticamente a ${resultado.modifiedCount} processo(s)`);
        }
      })
      .catch((err) => this.logger.warn(`Falha ao vincular processos ao cliente ${clienteId}: ${err.message}`));
  }
}
