import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSAO_KEY } from '../decorators/permissao.decorator';
import { Permissao } from '../schemas/grupo.schema';
import { UsuarioAutenticado } from '../decorators/current-user.decorator';

@Injectable()
export class PermissaoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissaoExigida = this.reflector.getAllAndOverride<Permissao>(PERMISSAO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permissaoExigida) return true;

    const user: UsuarioAutenticado = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Nao autenticado');

    // admin tem tudo por definicao; qualquer outro perfil precisa da permissao
    // explicita concedida pelo grupo atribuido a ele.
    if (user.perfil === 'admin') return true;
    if (user.permissoes?.includes(permissaoExigida)) return true;

    throw new ForbiddenException('Voce nao tem permissao para esta acao');
  }
}
