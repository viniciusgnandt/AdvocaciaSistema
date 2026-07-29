import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { UsuariosService } from './usuarios.service';
import { AuthService } from './auth.service';
import { ConvidarUsuarioDto } from './dto/convidar-usuario.dto';
import { CurrentUser, UsuarioAutenticado } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os usuarios (equipe) do escritorio' })
  async listar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.usuariosService.listar(new Types.ObjectId(usuario.tenantId));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Convida (cria) um novo usuario no escritorio - apenas admin' })
  async convidar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: ConvidarUsuarioDto) {
    return this.authService.criarUsuarioParaTenant(new Types.ObjectId(usuario.tenantId), dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Atualiza nome/perfil/OAB/status de um usuario - apenas admin' })
  async atualizar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: { nome?: string; perfil?: string; oab?: string; status?: string },
  ) {
    return this.usuariosService.atualizar(new Types.ObjectId(usuario.tenantId), new Types.ObjectId(id), dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Desativa um usuario (soft delete) - apenas admin' })
  async remover(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.usuariosService.remover(new Types.ObjectId(usuario.tenantId), new Types.ObjectId(id));
  }
}
