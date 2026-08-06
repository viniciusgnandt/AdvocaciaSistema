import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { AuditoriaService } from './auditoria.service';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('auditoria')
@Controller('auditoria')
@UseGuards(RolesGuard)
@Roles('admin')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista o log de auditoria do escritorio (somente admin)' })
  async listar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('entidade') entidade?: string,
    @Query('usuarioEmail') usuarioEmail?: string,
  ) {
    return this.auditoriaService.listar(new Types.ObjectId(usuario.tenantId), { entidade, usuarioEmail });
  }
}
