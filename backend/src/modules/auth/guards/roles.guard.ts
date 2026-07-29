import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PerfilUsuario } from '../schemas/usuario.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const perfisPermitidos = this.reflector.getAllAndOverride<PerfilUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!perfisPermitidos || perfisPermitidos.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !perfisPermitidos.includes(user.perfil)) {
      throw new ForbiddenException('Seu perfil nao tem permissao para esta acao');
    }
    return true;
  }
}
