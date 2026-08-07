import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Decisao } from './schemas/decisao.schema';
import { CriarDecisaoDto } from './dto/criar-decisao.dto';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

function podeDecidir(usuario: UsuarioAutenticado): boolean {
  return usuario.perfil === 'admin';
}

@ApiTags('decisoes')
@Controller('decisoes')
export class DecisoesController {
  constructor(@InjectModel(Decisao.name) private readonly decisaoModel: Model<Decisao>) {}

  @Get()
  @ApiOperation({ summary: 'Lista pedidos de decisao entre socios, opcionalmente filtrados por status' })
  async listar(@CurrentUser() usuario: UsuarioAutenticado, @Query('status') status?: string) {
    const filtro: Record<string, unknown> = { tenant_id: new Types.ObjectId(usuario.tenantId) };
    if (status) filtro.status = status;
    return this.decisaoModel.find(filtro).sort({ created_at: -1 }).exec();
  }

  @Post()
  @ApiOperation({ summary: 'Registra um pedido de decisao que precisa de aval de um socio/admin' })
  async criar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CriarDecisaoDto) {
    return this.decisaoModel.create({
      tenant_id: new Types.ObjectId(usuario.tenantId),
      titulo: dto.titulo,
      descricao: dto.descricao,
      numero_processo: dto.numero_processo,
      cliente_id: dto.cliente_id ? new Types.ObjectId(dto.cliente_id) : undefined,
      solicitado_por: new Types.ObjectId(usuario.sub),
      solicitado_por_nome: usuario.email,
    });
  }

  @Patch(':id/aprovar')
  @ApiOperation({ summary: 'Aprova um pedido de decisao (apenas admin/socio)' })
  async aprovar(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string, @Body() dto: { nota?: string }) {
    if (!podeDecidir(usuario)) throw new ForbiddenException('apenas socios podem decidir');
    const decisao = await this.decisaoModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenant_id: new Types.ObjectId(usuario.tenantId) },
      {
        $set: {
          status: 'aprovada',
          decidido_por: new Types.ObjectId(usuario.sub),
          decidido_por_nome: usuario.email,
          decidido_em: new Date(),
          nota_decisao: dto.nota,
        },
      },
      { new: true },
    );
    if (!decisao) throw new NotFoundException('pedido de decisao nao encontrado');
    return decisao;
  }

  @Patch(':id/rejeitar')
  @ApiOperation({ summary: 'Rejeita um pedido de decisao (apenas admin/socio)' })
  async rejeitar(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string, @Body() dto: { nota?: string }) {
    if (!podeDecidir(usuario)) throw new ForbiddenException('apenas socios podem decidir');
    const decisao = await this.decisaoModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenant_id: new Types.ObjectId(usuario.tenantId) },
      {
        $set: {
          status: 'rejeitada',
          decidido_por: new Types.ObjectId(usuario.sub),
          decidido_por_nome: usuario.email,
          decidido_em: new Date(),
          nota_decisao: dto.nota,
        },
      },
      { new: true },
    );
    if (!decisao) throw new NotFoundException('pedido de decisao nao encontrado');
    return decisao;
  }
}
