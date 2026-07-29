import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioAutenticado {
  sub: string; // usuario id
  tenantId: string;
  perfil: string;
  email: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
