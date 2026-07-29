import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario } from './schemas/usuario.schema';

@Injectable()
export class UsuariosService {
  constructor(@InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>) {}

  async listar(tenantId: Types.ObjectId) {
    return this.usuarioModel.find({ tenant_id: tenantId }).sort({ nome: 1 }).exec();
  }

  async atualizar(
    tenantId: Types.ObjectId,
    usuarioId: Types.ObjectId,
    dto: { nome?: string; perfil?: string; oab?: string; status?: string },
  ) {
    const usuario = await this.usuarioModel.findOneAndUpdate(
      { _id: usuarioId, tenant_id: tenantId },
      { $set: dto },
      { new: true },
    );
    if (!usuario) throw new NotFoundException('usuario nao encontrado');
    return usuario;
  }

  async remover(tenantId: Types.ObjectId, usuarioId: Types.ObjectId) {
    // soft: desativa em vez de apagar - preserva historico (tarefas/processos com esse responsavel)
    const usuario = await this.usuarioModel.findOneAndUpdate(
      { _id: usuarioId, tenant_id: tenantId },
      { $set: { status: 'inativo' } },
      { new: true },
    );
    if (!usuario) throw new NotFoundException('usuario nao encontrado');
    return usuario;
  }
}
