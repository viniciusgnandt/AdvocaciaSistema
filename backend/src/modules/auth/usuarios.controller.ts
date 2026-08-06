import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { UsuariosService } from './usuarios.service';
import { AuthService } from './auth.service';
import { ConvidarUsuarioDto } from './dto/convidar-usuario.dto';
import { CurrentUser, UsuarioAutenticado } from './decorators/current-user.decorator';
import { Permissao } from './decorators/permissao.decorator';
import { PermissaoGuard } from './guards/permissao.guard';
import { AuditoriaService } from '../auditoria/auditoria.service';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly authService: AuthService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os usuarios (equipe) do escritorio' })
  async listar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.usuariosService.listar(new Types.ObjectId(usuario.tenantId));
  }

  @Post()
  @UseGuards(PermissaoGuard)
  @Permissao('equipe.gerenciar')
  @ApiOperation({ summary: 'Convida (cria) um novo usuario no escritorio - admin ou permissao equipe.gerenciar' })
  async convidar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: ConvidarUsuarioDto) {
    const criado = await this.authService.criarUsuarioParaTenant(new Types.ObjectId(usuario.tenantId), dto);
    this.auditoriaService.registrar(usuario, 'criar', 'usuario', String(criado._id), criado.email);
    return criado;
  }

  @Patch(':id')
  @UseGuards(PermissaoGuard)
  @Permissao('equipe.gerenciar')
  @ApiOperation({ summary: 'Atualiza nome/perfil/OAB/status/grupo/time de um usuario - admin ou permissao equipe.gerenciar' })
  async atualizar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: { nome?: string; perfil?: string; oab?: string; status?: string; grupo_id?: string | null; time_id?: string | null },
  ) {
    const atualizado = await this.usuariosService.atualizar(new Types.ObjectId(usuario.tenantId), new Types.ObjectId(id), dto);
    this.auditoriaService.registrar(usuario, 'atualizar', 'usuario', id);
    return atualizado;
  }

  @Delete(':id')
  @UseGuards(PermissaoGuard)
  @Permissao('equipe.gerenciar')
  @ApiOperation({ summary: 'Desativa um usuario (soft delete) - admin ou permissao equipe.gerenciar' })
  async remover(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    const resultado = await this.usuariosService.remover(new Types.ObjectId(usuario.tenantId), new Types.ObjectId(id));
    this.auditoriaService.registrar(usuario, 'excluir', 'usuario', id);
    return resultado;
  }
}
