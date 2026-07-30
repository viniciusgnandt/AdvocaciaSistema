import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TimeTrabalho } from './schemas/time-trabalho.schema';
import { CriarTimeDto } from './dto/criar-time.dto';

@Injectable()
export class TimesService {
  constructor(@InjectModel(TimeTrabalho.name) private readonly timeModel: Model<TimeTrabalho>) {}

  async criar(tenantId: Types.ObjectId, dto: CriarTimeDto) {
    const existente = await this.timeModel.findOne({ tenant_id: tenantId, nome: dto.nome });
    if (existente) throw new BadRequestException('Ja existe um time com esse nome');
    return this.timeModel.create({
      tenant_id: tenantId,
      nome: dto.nome,
      cor: dto.cor,
      membros: (dto.membros ?? []).map((id) => new Types.ObjectId(id)),
    });
  }

  async listar(tenantId: Types.ObjectId) {
    return this.timeModel.find({ tenant_id: tenantId }).sort({ nome: 1 }).exec();
  }

  async atualizar(tenantId: Types.ObjectId, id: Types.ObjectId, dto: Partial<CriarTimeDto>) {
    const set: Record<string, unknown> = { ...dto };
    if (dto.membros) set.membros = dto.membros.map((m) => new Types.ObjectId(m));
    const time = await this.timeModel.findOneAndUpdate({ _id: id, tenant_id: tenantId }, { $set: set }, { new: true });
    if (!time) throw new NotFoundException('time nao encontrado');
    return time;
  }

  async excluir(tenantId: Types.ObjectId, id: Types.ObjectId) {
    const resultado = await this.timeModel.deleteOne({ _id: id, tenant_id: tenantId });
    return resultado.deletedCount > 0;
  }
}
