import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { FinanceiroService } from './financeiro.service';
import { CriarLancamentoDto } from './dto/criar-lancamento.dto';
import { AtualizarLancamentoDto } from './dto/atualizar-lancamento.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

@ApiTags('financeiro')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('financeiro')
export class FinanceiroController {
  constructor(
    private readonly financeiroService: FinanceiroService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria um lancamento (receita ou despesa)' })
  async criar(@Headers('x-tenant-id') tenantId: string, @Body() dto: CriarLancamentoDto, @CurrentUser() usuario: UsuarioAutenticado) {
    const resultado = await this.financeiroService.criar(new Types.ObjectId(tenantId), dto, usuario);
    const primeiro = Array.isArray(resultado) ? resultado[0] : resultado;
    this.auditoriaService.registrar(usuario, 'criar', 'lancamento', String(primeiro._id), primeiro.descricao);
    return resultado;
  }

  @Patch(':id/aprovar')
  @ApiOperation({ summary: 'Aprova uma despesa pendente (admin ou financeiro.gerenciar)' })
  async aprovar(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    const lancamento = await this.financeiroService.aprovar(new Types.ObjectId(tenantId), new Types.ObjectId(id), usuario);
    this.auditoriaService.registrar(usuario, 'atualizar', 'lancamento', id, `Despesa aprovada: ${lancamento.descricao}`);
    return lancamento;
  }

  @Patch(':id/rejeitar')
  @ApiOperation({ summary: 'Rejeita uma despesa pendente (admin ou financeiro.gerenciar)' })
  async rejeitar(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    const lancamento = await this.financeiroService.rejeitar(new Types.ObjectId(tenantId), new Types.ObjectId(id), usuario);
    this.auditoriaService.registrar(usuario, 'atualizar', 'lancamento', id, `Despesa rejeitada: ${lancamento.descricao}`);
    return lancamento;
  }

  @Get()
  @ApiOperation({ summary: 'Lista lancamentos, com filtros por tipo/status/cliente/processo/mes (YYYY-MM)' })
  async listar(
    @Headers('x-tenant-id') tenantId: string,
    @Query('tipo') tipo?: string,
    @Query('status') status?: string,
    @Query('clienteId') clienteId?: string,
    @Query('numeroProcesso') numeroProcesso?: string,
    @Query('mes') mes?: string,
  ) {
    return this.financeiroService.listar(new Types.ObjectId(tenantId), { tipo, status, clienteId, numeroProcesso, mes });
  }

  @Get('resumo')
  @ApiOperation({ summary: 'Totais para os cards: a receber, a pagar, recebido, pago, atrasados (opcionalmente filtrado por mes YYYY-MM)' })
  async resumo(@Headers('x-tenant-id') tenantId: string, @Query('mes') mes?: string) {
    return this.financeiroService.resumo(new Types.ObjectId(tenantId), mes);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um lancamento (ex.: marcar como pago)' })
  async atualizar(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: AtualizarLancamentoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const lancamento = await this.financeiroService.atualizar(new Types.ObjectId(tenantId), new Types.ObjectId(id), dto);
    if (lancamento) this.auditoriaService.registrar(usuario, 'atualizar', 'lancamento', id, lancamento.descricao);
    return lancamento;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um lancamento (ou todas as parcelas do grupo, se todasParcelas=true)' })
  async excluir(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('todasParcelas') todasParcelas?: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    const ok = await this.financeiroService.excluir(new Types.ObjectId(tenantId), new Types.ObjectId(id), todasParcelas === 'true');
    if (ok && usuario) this.auditoriaService.registrar(usuario, 'excluir', 'lancamento', id);
    return ok ? { ok: true } : { erro: 'lancamento nao encontrado' };
  }
}
