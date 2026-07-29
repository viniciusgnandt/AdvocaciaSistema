import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { CrmService } from './crm.service';
import { CriarOportunidadeDto } from './dto/criar-oportunidade.dto';
import { AtualizarOportunidadeDto } from './dto/atualizar-oportunidade.dto';

@ApiTags('crm')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('crm/oportunidades')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma oportunidade no funil' })
  async criar(@Headers('x-tenant-id') tenantId: string, @Body() dto: CriarOportunidadeDto) {
    return this.crmService.criar(new Types.ObjectId(tenantId), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista oportunidades, opcionalmente filtradas por etapa' })
  async listar(@Headers('x-tenant-id') tenantId: string, @Query('etapa') etapa?: string) {
    return this.crmService.listar(new Types.ObjectId(tenantId), etapa);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma oportunidade (ex.: mover de etapa no funil)' })
  async atualizar(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: AtualizarOportunidadeDto,
  ) {
    return this.crmService.atualizar(new Types.ObjectId(tenantId), new Types.ObjectId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma oportunidade' })
  async excluir(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const ok = await this.crmService.excluir(new Types.ObjectId(tenantId), new Types.ObjectId(id));
    return ok ? { ok: true } : { erro: 'oportunidade nao encontrada' };
  }
}
