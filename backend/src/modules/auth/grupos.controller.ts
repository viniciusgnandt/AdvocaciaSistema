import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { GruposService } from './grupos.service';
import { CriarGrupoDto } from './dto/criar-grupo.dto';
import { CATALOGO_PERMISSOES } from './schemas/grupo.schema';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser, UsuarioAutenticado } from './decorators/current-user.decorator';

@ApiTags('grupos')
@Controller('grupos')
@UseGuards(RolesGuard)
@Roles('admin')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @Get('permissoes-disponiveis')
  @ApiOperation({ summary: 'Lista o catalogo fixo de permissoes que um grupo pode conceder' })
  async permissoesDisponiveis() {
    return CATALOGO_PERMISSOES;
  }

  @Post()
  @ApiOperation({ summary: 'Cria um grupo de permissao' })
  async criar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CriarGrupoDto) {
    return this.gruposService.criar(new Types.ObjectId(usuario.tenantId), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os grupos de permissao do escritorio' })
  async listar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.gruposService.listar(new Types.ObjectId(usuario.tenantId));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza nome/permissoes de um grupo' })
  async atualizar(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string, @Body() dto: Partial<CriarGrupoDto>) {
    return this.gruposService.atualizar(new Types.ObjectId(usuario.tenantId), new Types.ObjectId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um grupo (usuarios ficam sem grupo, mantem o perfil basico)' })
  async excluir(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    const ok = await this.gruposService.excluir(new Types.ObjectId(usuario.tenantId), new Types.ObjectId(id));
    return ok ? { ok: true } : { erro: 'grupo nao encontrado' };
  }
}
