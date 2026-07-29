import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { TerceirizacoesService } from './terceirizacoes.service';
import { CriarTerceirizacaoDto } from './dto/criar-terceirizacao.dto';
import { AtualizarTerceirizacaoDto } from './dto/atualizar-terceirizacao.dto';

@ApiTags('terceirizacoes')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('terceirizacoes')
export class TerceirizacoesController {
  constructor(private readonly terceirizacoesService: TerceirizacoesService) {}

  @Post()
  @ApiOperation({ summary: 'Registra um servico prestado a terceiros (correspondente, peticao etc.); cria tarefa e lancamento automaticamente' })
  async criar(@Headers('x-tenant-id') tenantId: string, @Body() dto: CriarTerceirizacaoDto) {
    return this.terceirizacoesService.criar(new Types.ObjectId(tenantId), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista servicos prestados a terceiros' })
  async listar(@Headers('x-tenant-id') tenantId: string, @Query('status') status?: string) {
    return this.terceirizacoesService.listar(new Types.ObjectId(tenantId), status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um servico (ex.: marcar como concluido)' })
  async atualizar(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: AtualizarTerceirizacaoDto,
  ) {
    return this.terceirizacoesService.atualizar(new Types.ObjectId(tenantId), new Types.ObjectId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um servico (e a tarefa/lancamento vinculados)' })
  async excluir(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const ok = await this.terceirizacoesService.excluir(new Types.ObjectId(tenantId), new Types.ObjectId(id));
    return ok ? { ok: true } : { erro: 'terceirizacao nao encontrada' };
  }
}
