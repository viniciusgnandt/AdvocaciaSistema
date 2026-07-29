import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Pasta } from './schemas/pasta.schema';
import { Documento } from './schemas/documento.schema';

@ApiTags('pastas')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('pastas')
export class PastasController {
  constructor(
    @InjectModel(Pasta.name) private readonly pastaModel: Model<Pasta>,
    @InjectModel(Documento.name) private readonly documentoModel: Model<Documento>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma pasta de arquivos para um processo ou um cliente (raiz ou dentro de outra pasta)' })
  async criar(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { numeroProcesso?: string; clienteId?: string; nome: string; pastaPaiId?: string },
  ) {
    if (!dto.numeroProcesso && !dto.clienteId) {
      throw new BadRequestException('Informe numeroProcesso ou clienteId');
    }
    return this.pastaModel.create({
      tenant_id: new Types.ObjectId(tenantId),
      numero_processo: dto.numeroProcesso,
      cliente_id: dto.clienteId ? new Types.ObjectId(dto.clienteId) : undefined,
      nome: dto.nome,
      pasta_pai_id: dto.pastaPaiId ? new Types.ObjectId(dto.pastaPaiId) : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Lista as subpastas de um processo ou cliente (raiz por padrao, ou dentro de uma pasta especifica)' })
  async listar(
    @Headers('x-tenant-id') tenantId: string,
    @Query('numeroProcesso') numeroProcesso?: string,
    @Query('clienteId') clienteId?: string,
    @Query('pastaPaiId') pastaPaiId?: string,
  ) {
    if (!numeroProcesso && !clienteId) {
      throw new BadRequestException('Informe numeroProcesso ou clienteId');
    }
    const filtro: Record<string, unknown> = { tenant_id: new Types.ObjectId(tenantId) };
    if (numeroProcesso) filtro.numero_processo = numeroProcesso;
    if (clienteId) filtro.cliente_id = new Types.ObjectId(clienteId);
    filtro.pasta_pai_id = pastaPaiId ? new Types.ObjectId(pastaPaiId) : { $exists: false };
    return this.pastaModel.find(filtro).sort({ nome: 1 }).exec();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma pasta vazia (nao remove se tiver arquivos ou subpastas dentro)' })
  async excluir(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const tenant = new Types.ObjectId(tenantId);
    const pastaId = new Types.ObjectId(id);

    const [temArquivos, temSubpastas] = await Promise.all([
      this.documentoModel.exists({ tenant_id: tenant, pasta_id: pastaId }),
      this.pastaModel.exists({ tenant_id: tenant, pasta_pai_id: pastaId }),
    ]);
    if (temArquivos || temSubpastas) {
      return { erro: 'pasta nao esta vazia' };
    }

    await this.pastaModel.deleteOne({ _id: pastaId, tenant_id: tenant });
    return { ok: true };
  }
}
