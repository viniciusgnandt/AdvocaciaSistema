import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cliente } from '../clientes/schemas/cliente.schema';
import { Processo } from '../processos/schemas/processo.schema';
import { Documento } from '../documentos/schemas/documento.schema';
import { Lancamento } from '../financeiro/schemas/lancamento.schema';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('portal')
@Controller('portal')
export class PortalController {
  constructor(
    @InjectModel(Cliente.name) private readonly clienteModel: Model<Cliente>,
    @InjectModel(Processo.name) private readonly processoModel: Model<Processo>,
    @InjectModel(Documento.name) private readonly documentoModel: Model<Documento>,
    @InjectModel(Lancamento.name) private readonly lancamentoModel: Model<Lancamento>,
  ) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Portal do cliente (somente leitura, sem senha - autenticado pelo token no link)' })
  async ver(@Param('token') token: string) {
    const cliente = await this.clienteModel.findOne({ portal_token: token, portal_ativo: true });
    if (!cliente) throw new NotFoundException('link invalido ou portal desativado');

    const processos = await this.processoModel
      .find({ tenant_id: cliente.tenant_id, cliente_id: cliente._id })
      .select('numero_cnj tribunal classe status parte_ativa parte_passiva data_ajuizamento proxima_audiencia movimentacoes')
      .sort({ updated_at: -1 });

    const numeros = processos.map((p) => p.numero_cnj);
    const [documentos, lancamentos] = await Promise.all([
      numeros.length > 0
        ? this.documentoModel
            .find({ tenant_id: cliente.tenant_id, numero_processo: { $in: numeros } })
            .select('nome numero_processo created_at')
            .sort({ created_at: -1 })
        : [],
      numeros.length > 0
        ? this.lancamentoModel
            .find({ tenant_id: cliente.tenant_id, numero_processo: { $in: numeros } })
            .select('tipo descricao valor status data_vencimento numero_processo')
            .sort({ data_vencimento: -1 })
        : [],
    ]);

    return {
      cliente: { nome: cliente.nome, tipo: cliente.tipo },
      processos: processos.map((p) => ({
        numero_cnj: p.numero_cnj,
        tribunal: p.tribunal,
        classe: p.classe,
        status: p.status,
        parte_ativa: p.parte_ativa,
        parte_passiva: p.parte_passiva,
        data_ajuizamento: p.data_ajuizamento,
        proxima_audiencia: p.proxima_audiencia,
        ultimas_movimentacoes: p.movimentacoes.slice(-5).reverse(),
      })),
      documentos,
      lancamentos,
    };
  }
}
