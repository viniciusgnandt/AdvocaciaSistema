import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Tenant } from './schemas/tenant.schema';
import { Usuario } from './schemas/usuario.schema';
import { Grupo } from './schemas/grupo.schema';
import { RegistrarEscritorioDto } from './dto/registrar-escritorio.dto';
import { LoginDto } from './dto/login.dto';
import { UsuarioAutenticado } from './decorators/current-user.decorator';
import { StorageService } from '../storage/storage.service';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    @InjectModel(Grupo.name) private readonly grupoModel: Model<Grupo>,
    private readonly jwt: JwtService,
    private readonly storage: StorageService,
  ) {}

  private async resolverUrl(chave?: string): Promise<string | undefined> {
    if (!chave) return undefined;
    return this.storage.gerarUrlDownload(chave, 3600);
  }

  private async comFotoUrl(usuario: Usuario) {
    const foto_url = await this.resolverUrl(usuario.foto_key);
    return Object.assign(usuario.toObject(), { foto_url });
  }

  private async comLogoUrl(tenant: Tenant) {
    const logo_url = await this.resolverUrl(tenant.logo_key);
    return Object.assign(tenant.toObject(), { logo_url });
  }

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
    const grupo = usuario.grupo_id ? await this.grupoModel.findById(usuario.grupo_id) : null;
    const payload: UsuarioAutenticado = {
      sub: String(usuario._id),
      tenantId: String(usuario.tenant_id),
      perfil: usuario.perfil,
      email: usuario.email,
      permissoes: grupo?.permissoes,
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

  async buscarTenant(tenantId: Types.ObjectId) {
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant) throw new NotFoundException('tenant nao encontrado');
    return this.comLogoUrl(tenant);
  }

  async atualizarTenant(tenantId: Types.ObjectId, dto: { nome_escritorio?: string; cnpj?: string }) {
    const tenant = await this.tenantModel.findByIdAndUpdate(tenantId, { $set: dto }, { new: true });
    if (!tenant) throw new NotFoundException('tenant nao encontrado');
    return this.comLogoUrl(tenant);
  }

  async atualizarLogoTenant(tenantId: Types.ObjectId, chave: string) {
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant) throw new NotFoundException('tenant nao encontrado');
    const chaveAntiga = tenant.logo_key;
    tenant.logo_key = chave;
    await tenant.save();
    if (chaveAntiga) this.storage.excluir(chaveAntiga).catch(() => undefined);
    return this.comLogoUrl(tenant);
  }

  async buscarUsuario(usuarioId: Types.ObjectId) {
    const usuario = await this.usuarioModel.findById(usuarioId);
    if (!usuario) throw new NotFoundException('usuario nao encontrado');
    return this.comFotoUrl(usuario);
  }

  async atualizarPerfil(usuarioId: Types.ObjectId, dto: { nome?: string; oab?: string; especialidades?: string[] }) {
    const usuario = await this.usuarioModel.findByIdAndUpdate(usuarioId, { $set: dto }, { new: true });
    if (!usuario) throw new NotFoundException('usuario nao encontrado');
    return this.comFotoUrl(usuario);
  }

  async alternarFavorito(usuarioId: Types.ObjectId, chave: string) {
    const usuario = await this.usuarioModel.findById(usuarioId);
    if (!usuario) throw new NotFoundException('usuario nao encontrado');
    const jaFavoritado = usuario.favoritos.includes(chave);
    if (jaFavoritado) {
      usuario.favoritos = usuario.favoritos.filter((f) => f !== chave);
    } else {
      usuario.favoritos.push(chave);
    }
    await usuario.save();
    return { favoritos: usuario.favoritos };
  }

  async atualizarFotoUsuario(usuarioId: Types.ObjectId, chave: string) {
    const usuario = await this.usuarioModel.findById(usuarioId);
    if (!usuario) throw new NotFoundException('usuario nao encontrado');
    const chaveAntiga = usuario.foto_key;
    usuario.foto_key = chave;
    await usuario.save();
    if (chaveAntiga) this.storage.excluir(chaveAntiga).catch(() => undefined);
    return this.comFotoUrl(usuario);
  }

  async alterarSenha(usuarioId: Types.ObjectId, senhaAtual: string, novaSenha: string) {
    const usuario = await this.usuarioModel.findById(usuarioId).select('+senha_hash');
    if (!usuario) throw new NotFoundException('usuario nao encontrado');

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha_hash);
    if (!senhaValida) throw new BadRequestException('Senha atual incorreta');

    usuario.senha_hash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
    await usuario.save();
    return { ok: true };
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
