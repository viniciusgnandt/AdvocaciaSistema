import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Oportunidade } from './schemas/oportunidade.schema';
import { CriarOportunidadeDto } from './dto/criar-oportunidade.dto';
import { AtualizarOportunidadeDto } from './dto/atualizar-oportunidade.dto';

@Injectable()
export class CrmService {
  constructor(@InjectModel(Oportunidade.name) private readonly oportunidadeModel: Model<Oportunidade>) {}

  async criar(tenantId: Types.ObjectId, dto: CriarOportunidadeDto) {
    return this.oportunidadeModel.create({
      tenant_id: tenantId,
      titulo: dto.titulo,
      cliente_id: dto.clienteId ? new Types.ObjectId(dto.clienteId) : undefined,
      cliente_nome: dto.cliente_nome,
      valor_estimado: dto.valor_estimado,
      responsavel_id: dto.responsavel_id ? new Types.ObjectId(dto.responsavel_id) : undefined,
      notas: dto.notas,
    });
  }

  async listar(tenantId: Types.ObjectId, etapa?: string) {
    const filtro: Record<string, unknown> = { tenant_id: tenantId };
    if (etapa) filtro.etapa = etapa;
    return this.oportunidadeModel.find(filtro).sort({ updated_at: -1 }).exec();
  }

  async atualizar(tenantId: Types.ObjectId, id: Types.ObjectId, dto: AtualizarOportunidadeDto) {
    const set: Record<string, unknown> = { ...dto };
    if (dto.responsavel_id) set.responsavel_id = new Types.ObjectId(dto.responsavel_id);

    const oportunidade = await this.oportunidadeModel.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      { $set: set },
      { new: true },
    );
    if (!oportunidade) throw new NotFoundException('oportunidade nao encontrada');
    return oportunidade;
  }

  async excluir(tenantId: Types.ObjectId, id: Types.ObjectId) {
    const resultado = await this.oportunidadeModel.deleteOne({ _id: id, tenant_id: tenantId });
    return resultado.deletedCount > 0;
  }
}
