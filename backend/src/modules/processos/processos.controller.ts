import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Processo } from './schemas/processo.schema';
import { Tarefa } from '../tarefas/schemas/tarefa.schema';
import { DatajudConnectorService } from './connectors/datajud-connector.service';
import { ProcessosService } from './processos.service';
import { AtualizarProcessoDto } from './dto/atualizar-processo.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';
import { FinanceiroService } from '../financeiro/financeiro.service';

@ApiTags('processos')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('processos')
export class ProcessosController {
  constructor(
    @InjectModel(Processo.name) private readonly processoModel: Model<Processo>,
    @InjectModel(Tarefa.name) private readonly tarefaModel: Model<Tarefa>,
    private readonly datajud: DatajudConnectorService,
    private readonly processosService: ProcessosService,
    private readonly auditoriaService: AuditoriaService,
    private readonly financeiroService: FinanceiroService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os processos ja enriquecidos com dados do DataJud, com filtros e ordenacao' })
  async listar(
    @Headers('x-tenant-id') tenantId: string,
    @Query('tribunal') tribunal?: string,
    @Query('classe') classe?: string,
    @Query('status') status?: string,
    @Query('busca') busca?: string,
    @Query('ordenacao') ordenacao?: string,
    @Query('tag') tag?: string,
  ) {
    const tenant = new Types.ObjectId(tenantId);
    const filtro: Record<string, unknown> = { tenant_id: tenant };
    if (tribunal) filtro.tribunal = tribunal;
    if (classe) filtro.classe = classe;
    if (tag) filtro.tags = tag;
    if (busca) {
      const regex = { $regex: escapeRegex(busca), $options: 'i' };
      filtro.$or = [{ numero_cnj: regex }, { parte_ativa: regex }, { parte_passiva: regex }];
    }

    // "Ativo" tem dois submenus calculados a partir da audiencia mais recente que
    // identificamos nas publicacoes - nao sao valores gravados no campo status.
    const agora = new Date();
    if (status === 'ativo_audiencia_agendada') {
      filtro.status = 'ativo';
      filtro.proxima_audiencia = { $gte: agora };
    } else if (status === 'ativo_aguardando_sentenca') {
      filtro.status = 'ativo';
      filtro.proxima_audiencia = { $lt: agora };
    } else if (status) {
      filtro.status = status;
    }

    const ordens: Record<string, Record<string, 1 | -1>> = {
      recentes: { updated_at: -1 },
      numero: { numero_cnj: 1 },
      nome: { parte_ativa: 1 },
      audiencia: { proxima_audiencia: 1 },
    };
    const sort = ordens[ordenacao ?? 'recentes'] ?? ordens.recentes;

    const [itens, tribunaisDisponiveis, classesDisponiveis, tagsDisponiveis] = await Promise.all([
      this.processoModel.find(filtro).sort(sort).exec(),
      this.processoModel.distinct('tribunal', { tenant_id: tenant }),
      this.processoModel.distinct('classe', { tenant_id: tenant }),
      this.processoModel.distinct('tags', { tenant_id: tenant }),
    ]);

    return {
      itens,
      filtrosDisponiveis: {
        tribunais: tribunaisDisponiveis.filter(Boolean).sort(),
        classes: classesDisponiveis.filter(Boolean).sort(),
        tags: (tagsDisponiveis as unknown as string[]).filter(Boolean).sort(),
      },
    };
  }

  @Get(':numeroCnj')
  @ApiOperation({ summary: 'Detalha um processo pelo numero CNJ' })
  async detalhar(@Headers('x-tenant-id') tenantId: string, @Param('numeroCnj') numeroCnj: string) {
    const processo = await this.processoModel.findOne({
      tenant_id: new Types.ObjectId(tenantId),
      numero_cnj: numeroCnj.replace(/\D/g, ''),
    });
    return processo ?? { erro: 'processo nao encontrado' };
  }

  @Patch(':numeroCnj')
  @ApiOperation({ summary: 'Atualiza anotacoes manuais do processo (fase, advogado da parte contraria, honorarios, observacoes, status)' })
  async atualizar(
    @Headers('x-tenant-id') tenantId: string,
    @Param('numeroCnj') numeroCnj: string,
    @Body() dto: AtualizarProcessoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const tenant = new Types.ObjectId(tenantId);
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    const anterior = await this.processoModel.findOne({ tenant_id: tenant, numero_cnj: numeroLimpo });
    if (!anterior) return { erro: 'processo nao encontrado' };

    const processo = await this.processoModel.findOneAndUpdate(
      { tenant_id: tenant, numero_cnj: numeroLimpo },
      { $set: dto },
      { new: true },
    );
    if (!processo) return { erro: 'processo nao encontrado' };
    this.auditoriaService.registrar(usuario, 'atualizar', 'processo', processo.numero_cnj);

    // ao encerrar um processo com honorarios de exito/percentual definidos, gera o
    // lancamento financeiro automaticamente - evita o advogado esquecer de lancar o
    // recebivel na hora do encerramento, que e' justamente quando a atencao esta no
    // desfecho do caso, nao no financeiro. Idempotente: nao duplica se ja existir.
    // automacoes disparadas pela mudanca de status - "gatilho > acao" simples, direto no
    // fluxo de atualizacao (nao ha motor de regras generico ainda, sao casos fixos que
    // resolvem os pontos onde o advogado mais esquece de agir manualmente)
    if (dto.status === 'encerrado' && anterior.status !== 'encerrado') {
      if (processo.honorarios?.tipo) {
        await this.gerarLancamentoDeExito(tenant, processo);
      }
      await this.gerarTarefaDeArquivamento(tenant, processo);
    }

    return processo;
  }

  private async gerarTarefaDeArquivamento(tenant: Types.ObjectId, processo: Processo) {
    const titulo = `Arquivar processo — ${processo.numero_cnj}`;
    const jaExiste = await this.tarefaModel.findOne({ tenant_id: tenant, numero_processo: processo.numero_cnj, titulo });
    if (jaExiste) return;

    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 15);

    await this.tarefaModel.create({
      tenant_id: tenant,
      titulo,
      descricao: 'Processo encerrado — conferir prestação de contas e arquivar.',
      numero_processo: processo.numero_cnj,
      data_vencimento: vencimento,
      prioridade: 'media',
      origem: 'manual',
    });
  }

  private async gerarLancamentoDeExito(tenant: Types.ObjectId, processo: Processo) {
    const honorarios = processo.honorarios;
    if (!honorarios) return;

    const jaExiste = await this.financeiroService.listar(tenant, {
      numeroProcesso: processo.numero_cnj,
      // categoria nao faz parte do filtro do service - filtra em memoria abaixo
    });
    if (jaExiste.some((l) => l.categoria === 'honorarios_exito')) return;

    let valor: number | undefined;
    if (honorarios.tipo === 'fixo' && honorarios.valor_fixo) {
      valor = honorarios.valor_fixo;
    } else if ((honorarios.tipo === 'percentual' || honorarios.tipo === 'exito') && honorarios.percentual && processo.valor_causa) {
      valor = (processo.valor_causa * honorarios.percentual) / 100;
    } else if (honorarios.tipo === 'misto') {
      valor = (honorarios.valor_fixo ?? 0) + (honorarios.percentual && processo.valor_causa ? (processo.valor_causa * honorarios.percentual) / 100 : 0);
    }
    if (!valor || valor <= 0) return;

    await this.financeiroService.criar(tenant, {
      tipo: 'receita',
      descricao: `Honorários de êxito — ${processo.numero_cnj}`,
      valor,
      categoria: 'honorarios_exito',
      clienteId: processo.cliente_id ? String(processo.cliente_id) : undefined,
      numero_processo: processo.numero_cnj,
      data_vencimento: new Date().toISOString(),
    });
  }

  @Post(':numeroCnj/enriquecer')
  @ApiOperation({
    summary:
      'Forca busca sincrona no DataJud (uso interno/depuracao - o fluxo normal enriquece sozinho em background)',
  })
  async enriquecer(
    @Headers('x-tenant-id') tenantId: string,
    @Param('numeroCnj') numeroCnj: string,
    @Query('tribunal') tribunal?: string,
  ) {
    if (!tribunal) {
      throw new BadRequestException('Informe ?tribunal=<sigla> (ex.: TJSP) para localizar o indice correto no DataJud');
    }
    if (!this.datajud.habilitado) {
      throw new BadRequestException(
        'DATAJUD_API_KEY nao configurada no backend. Obtenha uma chave gratuita em https://datajud-wiki.cnj.jus.br/api-publica/acesso',
      );
    }

    const processo = await this.processosService.enriquecer(new Types.ObjectId(tenantId), numeroCnj, tribunal);
    return processo ?? { erro: 'processo nao encontrado no DataJud para esse tribunal/numero' };
  }
}

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
