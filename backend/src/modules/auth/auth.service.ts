import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Tenant } from './schemas/tenant.schema';
import { Usuario } from './schemas/usuario.schema';
import { RegistrarEscritorioDto } from './dto/registrar-escritorio.dto';
import { LoginDto } from './dto/login.dto';
import { UsuarioAutenticado } from './decorators/current-user.decorator';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    private readonly jwt: JwtService,
  ) {}

  async registrarEscritorio(dto: RegistrarEscritorioDto) {
    const emailExistente = await this.usuarioModel.findOne({ email: dto.email.toLowerCase() });
    if (emailExistente) {
      throw new BadRequestException('Ja existe uma conta com esse e-mail');
    }

    const tenant = await this.tenantModel.create({
      nome_escritorio: dto.nome_escritorio,
      cnpj: dto.cnpj,
    });

    const senha_hash = await bcrypt.hash(dto.senha, SALT_ROUNDS);
    const usuario = await this.usuarioModel.create({
      tenant_id: tenant._id,
      nome: dto.nome_admin,
      email: dto.email.toLowerCase(),
      senha_hash,
      perfil: 'admin',
      status: 'ativo',
    });

    return this.emitirSessao(usuario, tenant);
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuarioModel.findOne({ email: dto.email.toLowerCase() }).select('+senha_hash');
    if (!usuario || usuario.status !== 'ativo') {
      throw new UnauthorizedException('E-mail ou senha invalidos');
    }

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senha_hash);
    if (!senhaValida) {
      throw new UnauthorizedException('E-mail ou senha invalidos');
    }

    const tenant = await this.tenantModel.findById(usuario.tenant_id);
    if (!tenant || tenant.status === 'suspenso' || tenant.status === 'cancelado') {
      throw new UnauthorizedException('Escritorio inativo - contate o suporte');
    }

    usuario.ultimo_login = new Date();
    await usuario.save();

    return this.emitirSessao(usuario, tenant);
  }

  private async emitirSessao(usuario: Usuario, tenant: Tenant) {
    const payload: UsuarioAutenticado = {
      sub: String(usuario._id),
      tenantId: String(usuario.tenant_id),
      perfil: usuario.perfil,
      email: usuario.email,
    };
    const token = await this.jwt.signAsync(payload);

    return {
      token,
      usuario: {
        id: String(usuario._id),
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        oab: usuario.oab,
      },
      tenant: {
        id: String(tenant._id),
        nome_escritorio: tenant.nome_escritorio,
        status: tenant.status,
      },
    };
  }

  async criarUsuarioParaTenant(tenantId: Types.ObjectId, dto: { nome: string; email: string; senha: string; perfil: string; oab?: string }) {
    const emailExistente = await this.usuarioModel.findOne({ email: dto.email.toLowerCase() });
    if (emailExistente) {
      throw new BadRequestException('Ja existe uma conta com esse e-mail');
    }
    const senha_hash = await bcrypt.hash(dto.senha, SALT_ROUNDS);
    return this.usuarioModel.create({
      tenant_id: tenantId,
      nome: dto.nome,
      email: dto.email.toLowerCase(),
      senha_hash,
      perfil: dto.perfil,
      oab: dto.oab,
      status: 'ativo',
    });
  }
}
