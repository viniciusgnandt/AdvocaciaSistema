import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { RegistrarEscritorioDto } from './dto/registrar-escritorio.dto';
import { LoginDto } from './dto/login.dto';
import { AtualizarTenantDto } from './dto/atualizar-tenant.dto';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser, UsuarioAutenticado } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('registro')
  @ApiOperation({ summary: 'Cria um novo escritorio (tenant) e o usuario administrador inicial' })
  async registro(@Body() dto: RegistrarEscritorioDto) {
    return this.authService.registrarEscritorio(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Autentica um usuario e devolve o JWT' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Dados do usuario autenticado (a partir do JWT)' })
  async me(@CurrentUser() usuario: UsuarioAutenticado) {
    return usuario;
  }

  @Get('tenant')
  @ApiOperation({ summary: 'Dados do escritorio (tenant) do usuario autenticado' })
  async tenant(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.authService.buscarTenant(new Types.ObjectId(usuario.tenantId));
  }

  @Patch('tenant')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Atualiza dados do escritorio (nome/CNPJ) - somente admin' })
  async atualizarTenant(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: AtualizarTenantDto) {
    return this.authService.atualizarTenant(new Types.ObjectId(usuario.tenantId), dto);
  }

  @Get('perfil')
  @ApiOperation({ summary: 'Dados completos (nome, oab, email, perfil) do proprio usuario autenticado' })
  async perfil(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.authService.buscarUsuario(new Types.ObjectId(usuario.sub));
  }

  @Patch('perfil')
  @ApiOperation({ summary: 'Atualiza nome/OAB do proprio usuario autenticado' })
  async atualizarPerfil(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: AtualizarPerfilDto) {
    return this.authService.atualizarPerfil(new Types.ObjectId(usuario.sub), dto);
  }

  @Patch('senha')
  @ApiOperation({ summary: 'Troca a senha do proprio usuario autenticado' })
  async alterarSenha(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: AlterarSenhaDto) {
    return this.authService.alterarSenha(new Types.ObjectId(usuario.sub), dto.senhaAtual, dto.novaSenha);
  }
}
