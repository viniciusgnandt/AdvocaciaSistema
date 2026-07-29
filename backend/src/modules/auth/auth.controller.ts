import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegistrarEscritorioDto } from './dto/registrar-escritorio.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
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
}
