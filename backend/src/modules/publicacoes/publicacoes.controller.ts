import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Monitoramento } from './schemas/monitoramento.schema';
import { Publicacao } from './schemas/publicacao.schema';
import { CriarMonitoramentoDto } from './dto/criar-monitoramento.dto';
import { PublicacoesIngestaoService } from './publicacoes-ingestao.service';
import { classificarPublicacao } from './classificador.util';
import { ProcessosService } from '../processos/processos.service';

/**
 * NOTA: o cabecalho `x-tenant-id` e um stand-in temporario ate o modulo de Auth (JWT)
 * existir. Quando o Auth entrar, o tenant passa a ser resolvido do token via
 * AsyncLocalStorage (ver docs/01-arquitetura-sistema.md #3) e este header sai daqui.
 */
@ApiTags('publicacoes')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('publicacoes')
export class PublicacoesController {
  constructor(
    @InjectModel(Monitoramento.name) private readonly monitoramentoModel: Model<Monitoramento>,
    @InjectModel(Publicacao.name) private readonly publicacaoModel: Model<Publicacao>,
    private readonly ingestao: PublicacoesIngestaoService,
    private readonly processosService: ProcessosService,
  ) {}

  @Post('monitoramentos')
  @ApiOperation({ summary: 'Cadastra um novo alvo de monitoramento (OAB, CPF, CNPJ ou processo)' })
  async criarMonitoramento(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CriarMonitoramentoDto,
  ) {
    return this.monitoramentoModel.create({
      ...dto,
      tenant_id: new Types.ObjectId(tenantId),
    });
  }

  @Get('monitoramentos')
  @ApiOperation({ summary: 'Lista os monitoramentos do escritorio' })
  async listarMonitoramentos(@Headers('x-tenant-id') tenantId: string) {
    return this.monitoramentoModel.find({ tenant_id: new Types.ObjectId(tenantId) }).exec();
  }

  @Post('monitoramentos/:id/pull')
  @ApiOperation({ summary: 'Dispara manualmente a busca de publicacoes para um monitoramento especifico' })
  async pullManual(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    const monitoramento = await this.monitoramentoModel.findOne({
      _id: new Types.ObjectId(id),
      tenant_id: new Types.ObjectId(tenantId),
    });
    if (!monitoramento) {
      return { erro: 'monitoramento nao encontrado' };
    }
    const hoje = new Date().toISOString().slice(0, 10);
    return this.ingestao.executarMonitoramento(monitoramento, dataInicio ?? hoje, dataFim ?? hoje);
  }

  @Post('pull-todos')
  @ApiOperation({ summary: 'Dispara manualmente a busca para todos os monitoramentos ativos do tenant' })
  async pullTodos(
    @Headers('x-tenant-id') tenantId: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    const hoje = new Date().toISOString().slice(0, 10);
    return this.ingestao.executarTodosAtivos(dataInicio ?? hoje, dataFim ?? hoje, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Lista publicacoes recebidas, mais recentes primeiro, com filtros' })
  async listarPublicacoes(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
    @Query('urgencia') urgencia?: string,
    @Query('tribunal') tribunal?: string,
    @Query('tipoComunicacao') tipoComunicacao?: string,
    @Query('classificacao') classificacao?: string,
    @Query('busca') busca?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('limite') limite = '50',
    @Query('pagina') pagina = '1',
  ) {
    const filtro: Record<string, unknown> = { tenant_id: new Types.ObjectId(tenantId) };
    if (status) filtro.status = status;
    if (urgencia) filtro.urgencia = urgencia;
    if (tribunal) filtro.tribunal = tribunal;
    if (tipoComunicacao) filtro.tipo_comunicacao = tipoComunicacao;
    if (classificacao) filtro.classificacao = classificacao;
    if (busca) {
      filtro.$or = [
        { numero_processo: { $regex: escapeRegex(busca), $options: 'i' } },
        { inteiro_teor_texto: { $regex: escapeRegex(busca), $options: 'i' } },
        { nome_orgao: { $regex: escapeRegex(busca), $options: 'i' } },
      ];
    }
    if (dataInicio || dataFim) {
      const range: Record<string, Date> = {};
      if (dataInicio) range.$gte = new Date(`${dataInicio}T00:00:00.000Z`);
      if (dataFim) range.$lte = new Date(`${dataFim}T23:59:59.999Z`);
      filtro.data_disponibilizacao = range;
    }

    const tamanhoPagina = Math.min(Number(limite) || 50, 200);
    const paginaAtual = Math.max(Number(pagina) || 1, 1);

    const [itens, total, tribunaisDisponiveis, tiposDisponiveis] = await Promise.all([
      this.publicacaoModel
        .find(filtro)
        .sort({ data_disponibilizacao: -1 })
        .skip((paginaAtual - 1) * tamanhoPagina)
        .limit(tamanhoPagina)
        .exec(),
      this.publicacaoModel.countDocuments(filtro),
      this.publicacaoModel.distinct('tribunal', { tenant_id: new Types.ObjectId(tenantId) }),
      this.publicacaoModel.distinct('tipo_comunicacao', { tenant_id: new Types.ObjectId(tenantId) }),
    ]);

    const numerosSemPartes = [
      ...new Set(itens.filter((p) => !p.parte_ativa && !p.parte_passiva).map((p) => p.numero_processo)),
    ];
    const partesPorNumero = await this.processosService.buscarPartesPorNumeros(
      new Types.ObjectId(tenantId),
      numerosSemPartes,
    );
    const itensEnriquecidos = itens.map((p) => {
      if (p.parte_ativa || p.parte_passiva) return p;
      const fallback = partesPorNumero.get(p.numero_processo);
      if (!fallback) return p;
      return { ...p.toObject(), parte_ativa: fallback.parte_ativa, parte_passiva: fallback.parte_passiva };
    });

    return {
      itens: itensEnriquecidos,
      total,
      pagina: paginaAtual,
      totalPaginas: Math.max(Math.ceil(total / tamanhoPagina), 1),
      filtrosDisponiveis: {
        tribunais: tribunaisDisponiveis.filter(Boolean).sort(),
        tipos: tiposDisponiveis.filter(Boolean).sort(),
      },
    };
  }

  @Get('resumo')
  @ApiOperation({ summary: 'Contadores para os cards de resumo (nao lidas, urgentes, hoje, semana)' })
  async resumo(@Headers('x-tenant-id') tenantId: string) {
    const tenant = new Types.ObjectId(tenantId);
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(inicioHoje);
    inicioSemana.setDate(inicioSemana.getDate() - 7);

    const [total, naoLidas, urgentes, hoje, semana] = await Promise.all([
      this.publicacaoModel.countDocuments({ tenant_id: tenant }),
      this.publicacaoModel.countDocuments({ tenant_id: tenant, status: 'nao_lida' }),
      this.publicacaoModel.countDocuments({ tenant_id: tenant, urgencia: { $in: ['alta', 'critica'] } }),
      this.publicacaoModel.countDocuments({ tenant_id: tenant, data_disponibilizacao: { $gte: inicioHoje } }),
      this.publicacaoModel.countDocuments({ tenant_id: tenant, data_disponibilizacao: { $gte: inicioSemana } }),
    ]);

    return { total, naoLidas, urgentes, hoje, semana };
  }

  @Post('reclassificar')
  @ApiOperation({ summary: 'Reaplica o classificador de ato processual em publicacoes ja gravadas' })
  async reclassificar(@Headers('x-tenant-id') tenantId: string) {
    const publicacoes = await this.publicacaoModel.find({ tenant_id: new Types.ObjectId(tenantId) }).exec();
    let atualizadas = 0;
    for (const p of publicacoes) {
      const resultado = classificarPublicacao(p.inteiro_teor_texto, p.tipo_comunicacao, p.data_disponibilizacao);
      p.classificacao = resultado.classificacao;
      p.prazo_dias = resultado.prazo_dias;
      p.prazo_data_limite = resultado.prazo_data_limite;
      p.audiencia_data = resultado.audiencia_data;

      const raw = p.raw as Record<string, unknown> | undefined;
      if (raw) {
        if (!p.classe_processual && typeof raw.nomeClasse === 'string') p.classe_processual = raw.nomeClasse;
        if (!p.numero_comunicacao && typeof raw.numeroComunicacao === 'number') {
          p.numero_comunicacao = raw.numeroComunicacao;
        }
        if (!p.meio && typeof raw.meio === 'string') p.meio = raw.meio;
      }

      await p.save();
      atualizadas += 1;
    }
    return { total: publicacoes.length, atualizadas };
  }

  @Get('agenda')
  @ApiOperation({ summary: 'Eventos de agenda derivados das publicacoes: audiencias designadas e prazos com data-limite' })
  async agenda(
    @Headers('x-tenant-id') tenantId: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    const tenant = new Types.ObjectId(tenantId);
    const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00.000Z`) : new Date();
    const fim = dataFim
      ? new Date(`${dataFim}T23:59:59.999Z`)
      : new Date(inicio.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [audiencias, prazos] = await Promise.all([
      this.publicacaoModel
        .find({ tenant_id: tenant, audiencia_data: { $gte: inicio, $lte: fim } })
        .sort({ audiencia_data: 1 })
        .exec(),
      this.publicacaoModel
        .find({ tenant_id: tenant, prazo_data_limite: { $gte: inicio, $lte: fim } })
        .sort({ prazo_data_limite: 1 })
        .exec(),
    ]);

    const eventos = [
      ...audiencias.map((p) => ({
        tipo: 'audiencia' as const,
        data: p.audiencia_data,
        publicacao_id: p._id,
        numero_processo: p.numero_processo,
        tribunal: p.tribunal,
        nome_orgao: p.nome_orgao,
        titulo: montarTitulo(p.parte_ativa, p.parte_passiva, 'Audiência designada'),
        parte_ativa: p.parte_ativa,
        parte_passiva: p.parte_passiva,
        urgencia: p.urgencia,
        status: p.status,
        resumo: resumirTexto(p.inteiro_teor_texto),
        advogados: (p.advogados_destinatarios ?? []).filter((a) => a.nome).map((a) => a.nome),
      })),
      ...prazos.map((p) => ({
        tipo: 'prazo' as const,
        data: p.prazo_data_limite,
        publicacao_id: p._id,
        numero_processo: p.numero_processo,
        tribunal: p.tribunal,
        nome_orgao: p.nome_orgao,
        titulo: montarTitulo(p.parte_ativa, p.parte_passiva, `Prazo (${p.prazo_dias} dias)`),
        parte_ativa: p.parte_ativa,
        parte_passiva: p.parte_passiva,
        urgencia: p.urgencia,
        status: p.status,
        resumo: resumirTexto(p.inteiro_teor_texto),
        advogados: (p.advogados_destinatarios ?? []).filter((a) => a.nome).map((a) => a.nome),
      })),
    ].sort((a, b) => (a.data && b.data ? a.data.getTime() - b.data.getTime() : 0));

    return { eventos };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma publicacao pelo id' })
  async detalhar(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const publicacao = await this.publicacaoModel.findOne({
      _id: new Types.ObjectId(id),
      tenant_id: new Types.ObjectId(tenantId),
    });
    return publicacao ?? { erro: 'publicacao nao encontrada' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza status, urgencia ou tags de uma publicacao (marcar como lida, etc.)' })
  async atualizarPublicacao(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { status?: string; urgencia?: string; tags?: string[] },
  ) {
    const atualizada = await this.publicacaoModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenant_id: new Types.ObjectId(tenantId) },
      { $set: dto },
      { new: true },
    );
    return atualizada ?? { erro: 'publicacao nao encontrada' };
  }

  @Patch('em-massa/atualizar')
  @ApiOperation({ summary: 'Atualiza status/urgencia de varias publicacoes de uma vez (selecao em massa)' })
  async atualizarEmMassa(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { ids: string[]; status?: string; urgencia?: string },
  ) {
    if (!dto.ids?.length) return { atualizadas: 0 };
    const set: Record<string, unknown> = {};
    if (dto.status) set.status = dto.status;
    if (dto.urgencia) set.urgencia = dto.urgencia;
    if (Object.keys(set).length === 0) return { atualizadas: 0 };

    const resultado = await this.publicacaoModel.updateMany(
      { _id: { $in: dto.ids.map((id) => new Types.ObjectId(id)) }, tenant_id: new Types.ObjectId(tenantId) },
      { $set: set },
    );
    return { atualizadas: resultado.modifiedCount };
  }
}

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function montarTitulo(parteAtiva: string | undefined, partePassiva: string | undefined, fallback: string): string {
  if (parteAtiva && partePassiva) return `${capitalizarNome(parteAtiva)} x ${capitalizarNome(partePassiva)}`;
  if (parteAtiva) return capitalizarNome(parteAtiva);
  return fallback;
}

function capitalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .split(' ')
    .map((palavra) => (palavra.length > 2 ? palavra.charAt(0).toUpperCase() + palavra.slice(1) : palavra))
    .join(' ');
}

function resumirTexto(texto: string | undefined, tamanho = 220): string | undefined {
  if (!texto) return undefined;
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length > tamanho ? `${limpo.slice(0, tamanho)}…` : limpo;
}
