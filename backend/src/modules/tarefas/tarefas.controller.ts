import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tarefa } from './schemas/tarefa.schema';
import { Publicacao } from '../publicacoes/schemas/publicacao.schema';
import { CriarTarefaDto } from './dto/criar-tarefa.dto';
import { AtualizarTarefaDto } from './dto/atualizar-tarefa.dto';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

@ApiTags('tarefas')
@Controller('tarefas')
export class TarefasController {
  constructor(
    @InjectModel(Tarefa.name) private readonly tarefaModel: Model<Tarefa>,
    @InjectModel(Publicacao.name) private readonly publicacaoModel: Model<Publicacao>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista tarefas, com filtros por status/responsavel/processo/atrasadas' })
  async listar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('status') status?: string,
    @Query('responsavelId') responsavelId?: string,
    @Query('numeroProcesso') numeroProcesso?: string,
    @Query('atrasadas') atrasadas?: string,
  ) {
    const tenant = new Types.ObjectId(usuario.tenantId);
    // vencidas e ainda marcadas como pendente/em_andamento viram "atrasada" na hora da
    // leitura - mais simples e confiavel que depender de um job agendado a parte.
    await this.tarefaModel.updateMany(
      { tenant_id: tenant, status: { $in: ['pendente', 'em_andamento'] }, data_vencimento: { $lt: new Date() } },
      { $set: { status: 'atrasada' } },
    );

    const filtro: Record<string, unknown> = { tenant_id: tenant };
    if (status) filtro.status = status;
    if (responsavelId) filtro.responsavel_id = new Types.ObjectId(responsavelId);
    if (numeroProcesso) filtro.numero_processo = numeroProcesso;
    if (atrasadas === 'true') {
      filtro.status = 'atrasada';
    }
    return this.tarefaModel.find(filtro).sort({ data_vencimento: 1 }).exec();
  }

  @Get('minhas')
  @ApiOperation({ summary: 'Tarefas atribuidas ao usuario autenticado' })
  async minhas(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.tarefaModel
      .find({ tenant_id: new Types.ObjectId(usuario.tenantId), responsavel_id: new Types.ObjectId(usuario.sub) })
      .sort({ data_vencimento: 1 })
      .exec();
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma tarefa manual' })
  async criar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CriarTarefaDto) {
    return this.tarefaModel.create({
      ...dto,
      tenant_id: new Types.ObjectId(usuario.tenantId),
      publicacao_id: dto.publicacao_id ? new Types.ObjectId(dto.publicacao_id) : undefined,
      responsavel_id: dto.responsavel_id ? new Types.ObjectId(dto.responsavel_id) : undefined,
      data_vencimento: new Date(dto.data_vencimento),
      origem: 'manual',
    });
  }

  @Post('a-partir-de-publicacao/:publicacaoId')
  @ApiOperation({
    summary:
      'Cria (ou retorna a ja existente, idempotente) uma tarefa a partir do prazo/audiencia detectado numa publicacao',
  })
  async criarAPartirDePublicacao(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('publicacaoId') publicacaoId: string,
  ) {
    const tenant = new Types.ObjectId(usuario.tenantId);
    const publicacao = await this.publicacaoModel.findOne({ _id: new Types.ObjectId(publicacaoId), tenant_id: tenant });
    if (!publicacao) return { erro: 'publicacao nao encontrada' };

    const usaAudiencia = !!publicacao.audiencia_data;
    const dataVencimento = usaAudiencia ? publicacao.audiencia_data : publicacao.prazo_data_limite;
    if (!dataVencimento) {
      return { erro: 'publicacao nao possui prazo ou audiencia detectados' };
    }

    const origem = usaAudiencia ? 'audiencia_publicacao' : 'prazo_publicacao';
    const titulo = usaAudiencia
      ? `Audiência — ${publicacao.numero_processo}`
      : `Prazo (${publicacao.prazo_dias} dias) — ${publicacao.numero_processo}`;

    const existente = await this.tarefaModel.findOne({ tenant_id: tenant, publicacao_id: publicacao._id, origem });
    if (existente) return existente;

    return this.tarefaModel.create({
      tenant_id: tenant,
      titulo,
      publicacao_id: publicacao._id,
      numero_processo: publicacao.numero_processo,
      data_vencimento: dataVencimento,
      prioridade: publicacao.urgencia,
      origem,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza titulo/descricao/data/prioridade/status/responsavel de uma tarefa' })
  async atualizar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarTarefaDto,
  ) {
    const set: Record<string, unknown> = { ...dto };
    if (dto.data_vencimento) set.data_vencimento = new Date(dto.data_vencimento);
    if (dto.status === 'concluida') set.concluida_em = new Date();
    if (dto.responsavel_id) set.responsavel_id = new Types.ObjectId(dto.responsavel_id);

    const atualizada = await this.tarefaModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenant_id: new Types.ObjectId(usuario.tenantId) },
      { $set: set },
      { new: true },
    );
    if (!atualizada) throw new NotFoundException('tarefa nao encontrada');
    return atualizada;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma tarefa' })
  async excluir(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    const resultado = await this.tarefaModel.deleteOne({
      _id: new Types.ObjectId(id),
      tenant_id: new Types.ObjectId(usuario.tenantId),
    });
    return resultado.deletedCount > 0 ? { ok: true } : { erro: 'tarefa nao encontrada' };
  }
}
