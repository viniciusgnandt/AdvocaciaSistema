import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcaoAuditoria, EntidadeAuditoria, LogAuditoria } from './schemas/log-auditoria.schema';
import { UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(@InjectModel(LogAuditoria.name) private readonly logModel: Model<LogAuditoria>) {}

  /** Nunca deve derrubar a operacao principal por causa de log - so registra o erro. */
  registrar(
    usuario: UsuarioAutenticado,
    acao: AcaoAuditoria,
    entidade: EntidadeAuditoria,
    entidadeId: string,
    descricao?: string,
  ): void {
    this.logModel
      .create({
        tenant_id: new Types.ObjectId(usuario.tenantId),
        usuario_email: usuario.email,
        acao,
        entidade,
        entidade_id: entidadeId,
        descricao,
      })
      .catch((err) => this.logger.warn(`Falha ao registrar auditoria (${entidade}/${acao}): ${err.message}`));
  }

  async listar(tenantId: Types.ObjectId, filtros: { entidade?: string; usuarioEmail?: string; limite?: number } = {}) {
    const filtro: Record<string, unknown> = { tenant_id: tenantId };
    if (filtros.entidade) filtro.entidade = filtros.entidade;
    if (filtros.usuarioEmail) filtro.usuario_email = filtros.usuarioEmail;
    return this.logModel
      .find(filtro)
      .sort({ created_at: -1 })
      .limit(filtros.limite ?? 200)
      .exec();
  }

  /** Historico de uma entidade especifica (processo/cliente) - visivel pra qualquer
   * usuario do tenant, nao so admin, porque e' sobre o proprio registro que ele ja
   * esta vendo na tela, nao uma varredura geral do escritorio. */
  async listarDaEntidade(tenantId: Types.ObjectId, entidade: string, entidadeId: string) {
    return this.logModel
      .find({ tenant_id: tenantId, entidade, entidade_id: entidadeId })
      .sort({ created_at: -1 })
      .limit(50)
      .exec();
  }
}
