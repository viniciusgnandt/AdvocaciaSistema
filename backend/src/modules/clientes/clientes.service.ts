import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
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
    const { indicado_por_id, ...resto } = dto;
    const cliente = await this.clienteModel.create({
      ...resto,
      tenant_id: tenantId,
      indicado_por_id: indicado_por_id ? new Types.ObjectId(indicado_por_id) : undefined,
    });
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

  async ativarPortal(tenantId: Types.ObjectId, clienteId: Types.ObjectId) {
    const token = randomBytes(24).toString('base64url');
    return this.clienteModel.findOneAndUpdate(
      { _id: clienteId, tenant_id: tenantId },
      { $set: { portal_token: token, portal_ativo: true } },
      { new: true },
    );
  }

  async desativarPortal(tenantId: Types.ObjectId, clienteId: Types.ObjectId) {
    return this.clienteModel.findOneAndUpdate(
      { _id: clienteId, tenant_id: tenantId },
      { $set: { portal_ativo: false }, $unset: { portal_token: '' } },
      { new: true },
    );
  }

  async processosVinculados(tenantId: Types.ObjectId, clienteId: Types.ObjectId) {
    return this.processoModel
      .find({ tenant_id: tenantId, $or: [{ cliente_id: clienteId }, { clientes_adicionais: clienteId }] })
      .sort({ updated_at: -1 })
      .exec();
  }

  /**
   * Conflito de interesse: para cada processo vinculado a este cliente, olha pra "outra
   * parte" (a que nao bate com o nome do proprio cliente) e checa se o nome dela coincide
   * com o de outro cliente cadastrado no escritorio - sinal de que o escritorio pode estar
   * representando as duas pontas de uma mesma disputa, ainda que em processos diferentes.
   * E deliberadamente simples (match por nome normalizado, sem CPF/CNPJ) porque a fonte dos
   * nomes das partes e' texto livre extraido de publicacoes, nao um cadastro estruturado.
   */
  /** Checa nome/CPF/CNPJ contra clientes ja cadastrados - usado pelo form de cadastro
   * pra avisar antes de criar um duplicado sem querer (nao bloqueia, so avisa). */
  async verificarDuplicidade(
    tenantId: Types.ObjectId,
    dados: { nome?: string; cpf?: string; cnpj?: string; ignorarId?: Types.ObjectId },
  ) {
    const condicoes: Record<string, unknown>[] = [];
    if (dados.cpf?.trim()) condicoes.push({ cpf: dados.cpf.trim() });
    if (dados.cnpj?.trim()) condicoes.push({ cnpj: dados.cnpj.trim() });
    if (dados.nome?.trim()) {
      const nomeNormalizado = normalizarNome(dados.nome);
      const regexExato = new RegExp(`^${nomeNormalizado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      condicoes.push({ nome: regexExato });
    }
    if (condicoes.length === 0) return [];

    const filtro: Record<string, unknown> = { tenant_id: tenantId, $or: condicoes };
    if (dados.ignorarId) filtro._id = { $ne: dados.ignorarId };

    const encontrados = await this.clienteModel.find(filtro).limit(5).exec();
    return encontrados.map((c) => ({
      id: String(c._id),
      nome: c.nome,
      cpf: c.cpf,
      cnpj: c.cnpj,
      motivo: (dados.cpf && c.cpf === dados.cpf.trim() && 'cpf') || (dados.cnpj && c.cnpj === dados.cnpj.trim() && 'cnpj') || 'nome',
    }));
  }

  async verificarConflitos(tenantId: Types.ObjectId, clienteId: Types.ObjectId) {
    const cliente = await this.clienteModel.findOne({ _id: clienteId, tenant_id: tenantId });
    if (!cliente) return [];

    const nomeCliente = normalizarNome(cliente.nome);
    const processos = await this.processosVinculados(tenantId, clienteId);
    if (processos.length === 0) return [];

    const outrasPartes = processos
      .map((p) => {
        const ativaBate = p.parte_ativa && normalizarNome(p.parte_ativa) === nomeCliente;
        const outraParte = ativaBate ? p.parte_passiva : p.parte_ativa;
        return outraParte ? { numeroCnj: p.numero_cnj, outraParte } : null;
      })
      .filter((v): v is { numeroCnj: string; outraParte: string } => !!v);

    if (outrasPartes.length === 0) return [];

    const outrosClientes = await this.clienteModel.find({ tenant_id: tenantId, _id: { $ne: clienteId } });
    const porNome = new Map(outrosClientes.map((c) => [normalizarNome(c.nome), c]));

    const conflitos: { numeroCnj: string; clienteConflitante: { id: string; nome: string } }[] = [];
    for (const { numeroCnj, outraParte } of outrasPartes) {
      const encontrado = porNome.get(normalizarNome(outraParte));
      if (encontrado) {
        conflitos.push({ numeroCnj, clienteConflitante: { id: String(encontrado._id), nome: encontrado.nome } });
      }
    }
    return conflitos;
  }

  /**
   * Arquivos de todos os processos vinculados ao cliente, agregados num unico feed -
   * complementa os arquivos que o proprio cliente tem (upload direto, antes de existir
   * processo). Isso e so leitura: para organizar em pastas o advogado usa a tela do
   * processo em si.
   */
  async arquivosDosProcessos(tenantId: Types.ObjectId, clienteId: Types.ObjectId) {
    const processos = await this.processoModel
      .find({ tenant_id: tenantId, $or: [{ cliente_id: clienteId }, { clientes_adicionais: clienteId }] }, 'numero_cnj')
      .exec();
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
    const processo = await this.processoModel.findOne({ tenant_id: tenantId, numero_cnj: numeroLimpo });
    if (!processo) return null;

    // se o processo ja tem outro cliente principal, este vira litisconsorte
    // (clientes_adicionais) em vez de substituir o vinculo existente
    if (processo.cliente_id && String(processo.cliente_id) !== String(clienteId)) {
      return this.processoModel.findOneAndUpdate(
        { tenant_id: tenantId, numero_cnj: numeroLimpo },
        { $addToSet: { clientes_adicionais: clienteId } },
        { new: true },
      );
    }

    return this.processoModel.findOneAndUpdate(
      { tenant_id: tenantId, numero_cnj: numeroLimpo },
      { $set: { cliente_id: clienteId } },
      { new: true },
    );
  }

  async desvincularProcesso(tenantId: Types.ObjectId, clienteId: Types.ObjectId, numeroCnj: string) {
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    const processo = await this.processoModel.findOne({ tenant_id: tenantId, numero_cnj: numeroLimpo });
    if (!processo) return null;

    if (String(processo.cliente_id) === String(clienteId)) {
      return this.processoModel.findOneAndUpdate(
        { tenant_id: tenantId, numero_cnj: numeroLimpo },
        { $unset: { cliente_id: '' } },
        { new: true },
      );
    }

    return this.processoModel.findOneAndUpdate(
      { tenant_id: tenantId, numero_cnj: numeroLimpo },
      { $pull: { clientes_adicionais: clienteId } },
      { new: true },
    );
  }

  async atualizar(
    tenantId: Types.ObjectId,
    clienteId: Types.ObjectId,
    dto: AtualizarClienteDto,
  ): Promise<Cliente | null> {
    const { versao_esperada, indicado_por_id, ...resto } = dto;

    if (versao_esperada) {
      const atual = await this.clienteModel.findOne({ _id: clienteId, tenant_id: tenantId }, 'updated_at');
      if (atual && atual.get('updated_at')?.toISOString() !== versao_esperada) {
        throw new ConflictException('este cliente foi alterado por outra pessoa - recarregue antes de salvar');
      }
    }

    const set: Record<string, unknown> = { ...resto };
    const unset: Record<string, unknown> = {};
    if (indicado_por_id) set.indicado_por_id = new Types.ObjectId(indicado_por_id);
    else if (indicado_por_id === '') unset.indicado_por_id = '';

    const cliente = await this.clienteModel.findOneAndUpdate(
      { _id: clienteId, tenant_id: tenantId },
      { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
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
    await this.processoModel.updateMany({ tenant_id: tenantId, clientes_adicionais: clienteId }, { $pull: { clientes_adicionais: clienteId } });
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
