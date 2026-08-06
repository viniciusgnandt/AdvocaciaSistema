import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { memoryStorage } from 'multer';
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
import { StorageService } from '../storage/storage.service';

const LIMITE_IMAGEM_BYTES = 5 * 1024 * 1024; // 5MB
const MIMES_IMAGEM = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const interceptorImagem = FileInterceptor('arquivo', {
  storage: memoryStorage(),
  limits: { fileSize: LIMITE_IMAGEM_BYTES },
  fileFilter: (_req, file, callback) => {
    callback(null, MIMES_IMAGEM.includes(file.mimetype));
  },
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly storage: StorageService,
  ) {}

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

  @Post('perfil/favoritos/:chave')
  @ApiOperation({ summary: 'Alterna (adiciona/remove) um favorito do proprio usuario, ex.: chave="processo:0001..." ou "cliente:<id>"' })
  async alternarFavorito(@CurrentUser() usuario: UsuarioAutenticado, @Param('chave') chave: string) {
    return this.authService.alternarFavorito(new Types.ObjectId(usuario.sub), decodeURIComponent(chave));
  }

  @Post('perfil/foto')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Envia a foto de perfil do proprio usuario autenticado (PNG/JPEG/WEBP/GIF, ate 5MB)' })
  @UseInterceptors(interceptorImagem)
  async enviarFotoPerfil(@CurrentUser() usuario: UsuarioAutenticado, @UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('envie uma imagem valida (PNG, JPEG, WEBP ou GIF) no campo "arquivo"');
    const chave = this.storage.montarChave(usuario.tenantId, arquivo.originalname, 'perfil');
    await this.storage.upload(chave, arquivo.buffer, arquivo.mimetype);
    return this.authService.atualizarFotoUsuario(new Types.ObjectId(usuario.sub), chave);
  }

  @Post('tenant/logo')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Envia o logo do escritorio (PNG/JPEG/WEBP/GIF, ate 5MB) - somente admin' })
  @UseInterceptors(interceptorImagem)
  async enviarLogoEscritorio(@CurrentUser() usuario: UsuarioAutenticado, @UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('envie uma imagem valida (PNG, JPEG, WEBP ou GIF) no campo "arquivo"');
    const chave = this.storage.montarChave(usuario.tenantId, arquivo.originalname, 'escritorio');
    await this.storage.upload(chave, arquivo.buffer, arquivo.mimetype);
    return this.authService.atualizarLogoTenant(new Types.ObjectId(usuario.tenantId), chave);
  }

  @Patch('senha')
  @ApiOperation({ summary: 'Troca a senha do proprio usuario autenticado' })
  async alterarSenha(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: AlterarSenhaDto) {
    return this.authService.alterarSenha(new Types.ObjectId(usuario.sub), dto.senhaAtual, dto.novaSenha);
  }
}
