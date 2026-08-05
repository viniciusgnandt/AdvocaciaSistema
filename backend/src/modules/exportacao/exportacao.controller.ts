import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cliente } from '../clientes/schemas/cliente.schema';
import { Processo } from '../processos/schemas/processo.schema';
import { Tarefa } from '../tarefas/schemas/tarefa.schema';
import { Lancamento } from '../financeiro/schemas/lancamento.schema';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('exportacao')
@Controller('exportacao')
export class ExportacaoController {
  constructor(
    @InjectModel(Cliente.name) private readonly clienteModel: Model<Cliente>,
    @InjectModel(Processo.name) private readonly processoModel: Model<Processo>,
    @InjectModel(Tarefa.name) private readonly tarefaModel: Model<Tarefa>,
    @InjectModel(Lancamento.name) private readonly lancamentoModel: Model<Lancamento>,
  ) {}

  @Get('meus-dados')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Exporta todos os dados do escritorio (LGPD) em um unico JSON - somente admin' })
  async exportarMeusDados(@CurrentUser() usuario: UsuarioAutenticado) {
    const tenant = new Types.ObjectId(usuario.tenantId);
    const [clientes, processos, tarefas, lancamentos] = await Promise.all([
      this.clienteModel.find({ tenant_id: tenant }).lean(),
      this.processoModel.find({ tenant_id: tenant }).lean(),
      this.tarefaModel.find({ tenant_id: tenant }).lean(),
      this.lancamentoModel.find({ tenant_id: tenant }).lean(),
    ]);

    return {
      geradoEm: new Date().toISOString(),
      clientes,
      processos,
      tarefas,
      lancamentos,
    };
  }
}
