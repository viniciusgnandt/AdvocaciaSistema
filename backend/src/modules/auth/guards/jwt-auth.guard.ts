import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard global (ver AuthModule/APP_GUARD). Rotas marcadas com @Public() (login,
 * registro do escritorio) passam direto. As demais exigem um JWT valido.
 *
 * Ponte de compatibilidade: todo o resto do sistema (publicacoes, processos, tarefas,
 * documentos, clientes...) ja le o tenant via header `x-tenant-id` - em vez de reescrever
 * dezenas de controllers para injetar o tenant do token, este guard preenche esse header
 * automaticamente a partir do JWT validado apos a autenticacao. Os controllers nao
 * percebem diferenca.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const ativo = (await super.canActivate(context)) as boolean;
    if (ativo) {
      const request = context.switchToHttp().getRequest();
      if (request.user?.tenantId) {
        request.headers['x-tenant-id'] = request.user.tenantId;
      }
    }
    return ativo;
  }
}
