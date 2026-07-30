import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioAutenticado {
  sub: string; // usuario id
  tenantId: string;
  perfil: string;
  email: string;
  // permissoes extras concedidas pelo grupo do usuario (resolvidas no login - trocar de
  // grupo so' tem efeito apos relogar, mesmo tradeoff que ja existia pra "perfil")
  permissoes?: string[];
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
