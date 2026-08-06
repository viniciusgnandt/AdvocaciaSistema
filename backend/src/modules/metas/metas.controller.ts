import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Meta } from './schemas/meta.schema';
import { SalvarMetaDto } from './dto/salvar-meta.dto';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('metas')
@Controller('metas')
export class MetasController {
  constructor(@InjectModel(Meta.name) private readonly metaModel: Model<Meta>) {}

  @Get()
  @ApiOperation({ summary: 'Lista as metas do escritorio, opcionalmente filtradas por mes (YYYY-MM)' })
  async listar(@CurrentUser() usuario: UsuarioAutenticado, @Query('mes') mes?: string) {
    const filtro: Record<string, unknown> = { tenant_id: new Types.ObjectId(usuario.tenantId) };
    if (mes) filtro.mes = mes;
    return this.metaModel.find(filtro);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Cria ou atualiza a meta de um usuario para um mes/metrica (upsert) - somente admin' })
  async salvar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: SalvarMetaDto) {
    const tenant = new Types.ObjectId(usuario.tenantId);
    return this.metaModel.findOneAndUpdate(
      { tenant_id: tenant, usuario_id: new Types.ObjectId(dto.usuario_id), metrica: dto.metrica, mes: dto.mes },
      { $set: { valor_meta: dto.valor_meta } },
      { new: true, upsert: true },
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Remove uma meta - somente admin' })
  async excluir(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    const resultado = await this.metaModel.deleteOne({ _id: id, tenant_id: new Types.ObjectId(usuario.tenantId) });
    return resultado.deletedCount > 0 ? { ok: true } : { erro: 'meta nao encontrada' };
  }
}
