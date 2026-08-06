import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ClientesService } from './clientes.service';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';

@ApiTags('clientes')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um cliente e vincula automaticamente processos com o mesmo nome de parte' })
  async criar(@Headers('x-tenant-id') tenantId: string, @Body() dto: CriarClienteDto) {
    return this.clientesService.criar(new Types.ObjectId(tenantId), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista clientes, com busca opcional por nome/CPF/CNPJ/e-mail' })
  async listar(@Headers('x-tenant-id') tenantId: string, @Query('busca') busca?: string) {
    return this.clientesService.listar(new Types.ObjectId(tenantId), busca);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um cliente pelo id' })
  async detalhar(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const cliente = await this.clientesService.buscar(new Types.ObjectId(tenantId), new Types.ObjectId(id));
    return cliente ?? { erro: 'cliente nao encontrado' };
  }

  @Get(':id/processos')
  @ApiOperation({ summary: 'Lista os processos vinculados a esse cliente' })
  async processos(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.clientesService.processosVinculados(new Types.ObjectId(tenantId), new Types.ObjectId(id));
  }

  @Get(':id/conflitos')
  @ApiOperation({ summary: 'Verifica se a parte contraria de algum processo deste cliente tambem e cliente do escritorio' })
  async conflitos(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.clientesService.verificarConflitos(new Types.ObjectId(tenantId), new Types.ObjectId(id));
  }

  @Get(':id/documentos')
  @ApiOperation({ summary: 'Arquivos de todos os processos vinculados a esse cliente, agregados' })
  async documentosDosProcessos(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.clientesService.arquivosDosProcessos(new Types.ObjectId(tenantId), new Types.ObjectId(id));
  }

  @Post(':id/processos')
  @ApiOperation({ summary: 'Vincula manualmente um processo a este cliente (independente do nome bater)' })
  async vincularProcesso(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { numeroCnj: string },
  ) {
    const processo = await this.clientesService.vincularProcesso(new Types.ObjectId(tenantId), new Types.ObjectId(id), dto.numeroCnj);
    return processo ?? { erro: 'processo nao encontrado' };
  }

  @Delete(':id/processos/:numeroCnj')
  @ApiOperation({ summary: 'Desvincula um processo deste cliente' })
  async desvincularProcesso(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('numeroCnj') numeroCnj: string,
  ) {
    const processo = await this.clientesService.desvincularProcesso(new Types.ObjectId(tenantId), new Types.ObjectId(id), numeroCnj);
    return processo ?? { erro: 'processo nao encontrado ou nao vinculado a este cliente' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados do cliente (revincula processos automaticamente se o nome mudar)' })
  async atualizar(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: AtualizarClienteDto,
  ) {
    const cliente = await this.clientesService.atualizar(new Types.ObjectId(tenantId), new Types.ObjectId(id), dto);
    return cliente ?? { erro: 'cliente nao encontrado' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um cliente (desfaz o vinculo nos processos, mas nao apaga os processos)' })
  async excluir(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const ok = await this.clientesService.excluir(new Types.ObjectId(tenantId), new Types.ObjectId(id));
    return ok ? { ok: true } : { erro: 'cliente nao encontrado' };
  }
}
