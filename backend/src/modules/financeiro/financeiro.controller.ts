import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { FinanceiroService } from './financeiro.service';
import { CriarLancamentoDto } from './dto/criar-lancamento.dto';
import { AtualizarLancamentoDto } from './dto/atualizar-lancamento.dto';

@ApiTags('financeiro')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um lancamento (receita ou despesa)' })
  async criar(@Headers('x-tenant-id') tenantId: string, @Body() dto: CriarLancamentoDto) {
    return this.financeiroService.criar(new Types.ObjectId(tenantId), dto);
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
  ) {
    return this.financeiroService.atualizar(new Types.ObjectId(tenantId), new Types.ObjectId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um lancamento (ou todas as parcelas do grupo, se todasParcelas=true)' })
  async excluir(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('todasParcelas') todasParcelas?: string,
  ) {
    const ok = await this.financeiroService.excluir(new Types.ObjectId(tenantId), new Types.ObjectId(id), todasParcelas === 'true');
    return ok ? { ok: true } : { erro: 'lancamento nao encontrado' };
  }
}
