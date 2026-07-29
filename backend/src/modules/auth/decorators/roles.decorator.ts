import { SetMetadata } from '@nestjs/common';
import { PerfilUsuario } from '../schemas/usuario.schema';

export const ROLES_KEY = 'roles';
export const Roles = (...perfis: PerfilUsuario[]) => SetMetadata(ROLES_KEY, perfis);
