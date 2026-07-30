import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Grupo } from './schemas/grupo.schema';
import { Usuario } from './schemas/usuario.schema';
import { CriarGrupoDto } from './dto/criar-grupo.dto';

@Injectable()
export class GruposService {
  constructor(
    @InjectModel(Grupo.name) private readonly grupoModel: Model<Grupo>,
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
  ) {}

  async criar(tenantId: Types.ObjectId, dto: CriarGrupoDto) {
    const existente = await this.grupoModel.findOne({ tenant_id: tenantId, nome: dto.nome });
    if (existente) throw new BadRequestException('Ja existe um grupo com esse nome');
    return this.grupoModel.create({ tenant_id: tenantId, nome: dto.nome, permissoes: dto.permissoes ?? [] });
  }

  async listar(tenantId: Types.ObjectId) {
    return this.grupoModel.find({ tenant_id: tenantId }).sort({ nome: 1 }).exec();
  }

  async atualizar(tenantId: Types.ObjectId, id: Types.ObjectId, dto: Partial<CriarGrupoDto>) {
    const grupo = await this.grupoModel.findOneAndUpdate({ _id: id, tenant_id: tenantId }, { $set: dto }, { new: true });
    if (!grupo) throw new NotFoundException('grupo nao encontrado');
    return grupo;
  }

  async excluir(tenantId: Types.ObjectId, id: Types.ObjectId) {
    const resultado = await this.grupoModel.deleteOne({ _id: id, tenant_id: tenantId });
    if (resultado.deletedCount > 0) {
      // sem isso, usuario ficava com grupo_id apontando pra um grupo que nao existe mais
      await this.usuarioModel.updateMany({ tenant_id: tenantId, grupo_id: id }, { $unset: { grupo_id: '' } });
    }
    return resultado.deletedCount > 0;
  }
}
