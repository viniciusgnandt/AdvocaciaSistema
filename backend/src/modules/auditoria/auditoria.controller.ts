import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { AuditoriaService } from './auditoria.service';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('auditoria')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Lista o log de auditoria do escritorio (somente admin)' })
  async listar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('entidade') entidade?: string,
    @Query('usuarioEmail') usuarioEmail?: string,
  ) {
    return this.auditoriaService.listar(new Types.ObjectId(usuario.tenantId), { entidade, usuarioEmail });
  }

  @Get(':entidade/:entidadeId')
  @ApiOperation({ summary: 'Historico de uma entidade especifica (processo/cliente) - qualquer usuario do tenant' })
  async listarDaEntidade(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('entidade') entidade: string,
    @Param('entidadeId') entidadeId: string,
  ) {
    return this.auditoriaService.listarDaEntidade(new Types.ObjectId(usuario.tenantId), entidade, entidadeId);
  }
}
