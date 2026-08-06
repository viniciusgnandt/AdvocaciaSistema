import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario } from './schemas/usuario.schema';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    private readonly storage: StorageService,
  ) {}

  async listar(tenantId: Types.ObjectId) {
    const usuarios = await this.usuarioModel.find({ tenant_id: tenantId }).sort({ nome: 1 }).exec();
    return Promise.all(
      usuarios.map(async (u) => {
        const foto_url = u.foto_key ? await this.storage.gerarUrlDownload(u.foto_key, 3600) : undefined;
        return Object.assign(u.toObject(), { foto_url });
      }),
    );
  }

  async atualizar(
    tenantId: Types.ObjectId,
    usuarioId: Types.ObjectId,
    dto: { nome?: string; perfil?: string; oab?: string; status?: string; grupo_id?: string | null; time_id?: string | null },
  ) {
    const { grupo_id, time_id, ...resto } = dto;
    const set: Record<string, unknown> = { ...resto };
    const unset: Record<string, unknown> = {};
    // null = remover o vinculo (ex.: usuario sem grupo/time); string = trocar; undefined = nao mexer
    if (grupo_id === null) unset.grupo_id = '';
    else if (grupo_id) set.grupo_id = new Types.ObjectId(grupo_id);
    if (time_id === null) unset.time_id = '';
    else if (time_id) set.time_id = new Types.ObjectId(time_id);

    const usuario = await this.usuarioModel.findOneAndUpdate(
      { _id: usuarioId, tenant_id: tenantId },
      { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
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
