import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Nota } from './schemas/nota.schema';
import { Usuario } from '../auth/schemas/usuario.schema';
import { CriarNotaDto } from './dto/criar-nota.dto';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

@ApiTags('notas')
@Controller('notas')
export class NotasController {
  constructor(
    @InjectModel(Nota.name) private readonly notaModel: Model<Nota>,
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista notas rapidas de um processo ou cliente' })
  async listar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('entidade') entidade: 'processo' | 'cliente',
    @Query('entidadeId') entidadeId: string,
  ) {
    return this.notaModel
      .find({ tenant_id: new Types.ObjectId(usuario.tenantId), entidade, entidade_id: entidadeId })
      .sort({ created_at: -1 })
      .exec();
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma nota rapida vinculada a um processo ou cliente' })
  async criar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CriarNotaDto) {
    const quemCriou = await this.usuarioModel.findById(usuario.sub, 'nome');
    return this.notaModel.create({
      tenant_id: new Types.ObjectId(usuario.tenantId),
      entidade: dto.entidade,
      entidade_id: dto.entidade_id,
      texto: dto.texto,
      canal: dto.canal,
      usuario_id: new Types.ObjectId(usuario.sub),
      usuario_nome: quemCriou?.nome ?? usuario.email,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma nota rapida (qualquer usuario do tenant pode remover)' })
  async excluir(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    const resultado = await this.notaModel.deleteOne({ _id: new Types.ObjectId(id), tenant_id: new Types.ObjectId(usuario.tenantId) });
    return resultado.deletedCount > 0 ? { ok: true } : { erro: 'nota nao encontrada' };
  }
}
