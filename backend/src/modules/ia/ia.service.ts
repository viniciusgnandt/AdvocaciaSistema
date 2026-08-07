import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import { Processo } from '../processos/schemas/processo.schema';
import { Cliente } from '../clientes/schemas/cliente.schema';
import { Tenant } from '../auth/schemas/tenant.schema';
import { ModeloDocumento } from './schemas/modelo-documento.schema';
import { IaTransacao } from './schemas/ia-transacao.schema';

const LIMITE_MODELO_CARACTERES = 20000; // evita prompts gigantes com modelos muito longos
const LIMITE_POR_MINUTO_USUARIO = Number(process.env.IA_LIMITE_POR_MINUTO ?? 10);

// precos do Claude Sonnet 5 (introducao, ate 2026-08-31) - US$ por milhao de tokens.
// 1 credito = US$ 0.01 de custo estimado; ajustar aqui se o preco/modelo mudar.
const PRECO_INPUT_POR_MILHAO = 2;
const PRECO_OUTPUT_POR_MILHAO = 10;
const DOLAR_POR_CREDITO = 0.01;

const DOMINIOS_JURISPRUDENCIA = ['stj.jus.br', 'stf.jus.br', 'jusbrasil.com.br', 'trt2.jus.br', 'tjsp.jus.br', 'cnj.jus.br'];

const INSTRUCAO_JURISPRUDENCIA_FALLBACK =
  ' Se a busca nao retornar jurisprudencia realmente relevante ao caso, diga isso claramente ' +
  '("nao foram encontrados precedentes diretamente aplicaveis") em vez de citar algo generico ou forcado.';

type HistoricoItem = { role: 'user' | 'assistant'; texto: string };

/** Janela deslizante em memoria (por instancia do processo) para limitar chamadas
 * por usuario por minuto - complementa a cota mensal por tenant, que sozinha nao
 * impede um usuario de esgotar o limite do escritorio em poucos minutos. */
const chamadasPorUsuario = new Map<string, number[]>();

@Injectable()
export class IaService {
  private readonly client: Anthropic;

  constructor(
    @InjectModel(Processo.name) private readonly processoModel: Model<Processo>,
    @InjectModel(Cliente.name) private readonly clienteModel: Model<Cliente>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(ModeloDocumento.name) private readonly modeloModel: Model<ModeloDocumento>,
    @InjectModel(IaTransacao.name) private readonly transacaoModel: Model<IaTransacao>,
  ) {
    this.client = new Anthropic();
  }

  /** Limite por usuario por minuto - impede que um bug de loop no frontend ou um
   * uso abusivo estoure a cota mensal inteira do escritorio em poucos minutos. */
  private verificarLimitePorMinuto(usuarioId: string): void {
    const agora = Date.now();
    const janela = 60_000;
    const chamadas = (chamadasPorUsuario.get(usuarioId) ?? []).filter((t) => agora - t < janela);
    if (chamadas.length >= LIMITE_POR_MINUTO_USUARIO) {
      throw new ForbiddenException(
        `Muitas chamadas de IA em pouco tempo (limite: ${LIMITE_POR_MINUTO_USUARIO}/minuto). Aguarde um instante.`,
      );
    }
    chamadas.push(agora);
    chamadasPorUsuario.set(usuarioId, chamadas);
  }

  /** Verifica antes de cada chamada: limite por minuto + saldo de creditos positivo.
   * O custo exato so e conhecido depois da resposta (depende de tokens gerados), por
   * isso aqui so barra quando o saldo ja esta zerado ou negativo. */
  private async verificarCreditos(tenantId: string, usuarioId?: string): Promise<void> {
    if (usuarioId) this.verificarLimitePorMinuto(usuarioId);

    const tenant = await this.tenantModel.findById(tenantId).select('ia_creditos');
    if (!tenant || tenant.ia_creditos <= 0) {
      throw new ForbiddenException(
        'Créditos de IA esgotados para este escritório. Peça a um admin para carregar mais créditos em Configurações → Consumo de IA.',
      );
    }
  }

  /** Converte o uso de tokens da resposta em creditos, debita do saldo do tenant e
   * registra o lancamento no extrato. Chamado depois de toda chamada bem-sucedida a
   * Claude - o custo real so e conhecido apos a resposta. */
  private async debitarCreditos(
    tenantId: string,
    usuarioId: string | undefined,
    usage: Anthropic.Usage,
    operacao: string,
  ): Promise<void> {
    const tokensEntrada = usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
    const tokensSaida = usage.output_tokens;
    const custoDolares = (tokensEntrada * PRECO_INPUT_POR_MILHAO + tokensSaida * PRECO_OUTPUT_POR_MILHAO) / 1_000_000;
    const creditos = Math.max(1, Math.ceil(custoDolares / DOLAR_POR_CREDITO));

    await Promise.all([
      // pipeline update (nao um $inc simples): tenants antigos podem nao ter o campo
      // persistido no Mongo ainda - $ifNull garante que o default do schema (1000) e
      // respeitado como ponto de partida em vez de um $inc tratar o campo ausente como 0
      this.tenantModel.updateOne({ _id: new Types.ObjectId(tenantId) }, [
        { $set: { ia_creditos: { $subtract: [{ $ifNull: ['$ia_creditos', 1000] }, creditos] } } },
      ]),
      this.transacaoModel.create({
        tenant_id: new Types.ObjectId(tenantId),
        tipo: 'consumo',
        creditos,
        operacao,
        tokens_entrada: tokensEntrada,
        tokens_saida: tokensSaida,
        usuario_id: usuarioId ? new Types.ObjectId(usuarioId) : undefined,
      }),
    ]);
  }

  /** Saldo atual + ultimos lancamentos, para a tela de Consumo de IA. */
  async obterSaldoCreditos(tenantId: string): Promise<{ saldo: number; transacoes: IaTransacao[] }> {
    const [tenant, transacoes] = await Promise.all([
      this.tenantModel.findById(tenantId).select('ia_creditos'),
      this.transacaoModel.find({ tenant_id: new Types.ObjectId(tenantId) }).sort({ created_at: -1 }).limit(50),
    ]);
    return { saldo: tenant?.ia_creditos ?? 0, transacoes };
  }

  /** Carga manual de creditos, simulando uma compra ate existir billing de verdade.
   * Restrita a admin (verificado no controller). */
  async adicionarCreditos(tenantId: string, quantidade: number, usuarioId: string): Promise<{ saldo: number }> {
    const tenant = await this.tenantModel.findOneAndUpdate(
      { _id: new Types.ObjectId(tenantId) },
      [{ $set: { ia_creditos: { $add: [{ $ifNull: ['$ia_creditos', 1000] }, quantidade] } } }],
      { new: true },
    );
    if (!tenant) throw new NotFoundException('tenant nao encontrado');
    await this.transacaoModel.create({
      tenant_id: new Types.ObjectId(tenantId),
      tipo: 'credito',
      creditos: quantidade,
      operacao: 'carga-manual',
      usuario_id: new Types.ObjectId(usuarioId),
    });
    return { saldo: tenant.ia_creditos };
  }

  private async contextoProcesso(tenantId: string, processoId?: string): Promise<{ texto: string; processo?: Processo }> {
    if (!processoId) return { texto: '' };
    const processo = await this.processoModel.findOne({
      _id: new Types.ObjectId(processoId),
      tenant_id: new Types.ObjectId(tenantId),
    });
    if (!processo) throw new NotFoundException('processo nao encontrado');

    const honorarios = processo.honorarios;
    const resumoHonorarios = honorarios
      ? [
          honorarios.tipo ? `tipo ${honorarios.tipo}` : null,
          honorarios.valor_fixo ? `valor fixo R$ ${honorarios.valor_fixo}` : null,
          honorarios.percentual ? `percentual ${honorarios.percentual}%` : null,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

    const texto = [
      `Numero CNJ: ${processo.numero_cnj}`,
      processo.classe ? `Classe: ${processo.classe}` : null,
      processo.tribunal ? `Tribunal: ${processo.tribunal}` : null,
      processo.parte_ativa ? `Parte ativa: ${processo.parte_ativa}` : null,
      processo.parte_passiva ? `Parte passiva: ${processo.parte_passiva}` : null,
      processo.assuntos?.length ? `Assuntos: ${processo.assuntos.join(', ')}` : null,
      processo.fase_processual ? `Fase processual: ${processo.fase_processual}` : null,
      processo.valor_causa ? `Valor da causa: R$ ${processo.valor_causa}` : null,
      resumoHonorarios ? `Honorarios contratados: ${resumoHonorarios}` : null,
      processo.movimentacoes?.length
        ? `Ultimas movimentacoes: ${processo.movimentacoes
            .slice(-5)
            .map((m) => `[${new Date(m.data).toLocaleDateString('pt-BR')}] ${m.descricao}`)
            .join(' | ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    return { texto, processo };
  }

  private async contextoCliente(tenantId: string, clienteId?: string): Promise<{ texto: string; cliente?: Cliente }> {
    if (!clienteId) return { texto: '' };
    const cliente = await this.clienteModel.findOne({
      _id: new Types.ObjectId(clienteId),
      tenant_id: new Types.ObjectId(tenantId),
    });
    if (!cliente) throw new NotFoundException('cliente nao encontrado');

    const endereco = cliente.endereco
      ? [cliente.endereco.logradouro, cliente.endereco.numero, cliente.endereco.bairro, cliente.endereco.cidade, cliente.endereco.uf]
          .filter(Boolean)
          .join(', ')
      : null;

    const texto = [
      `Cliente: ${cliente.nome} (${cliente.tipo === 'pj' ? 'pessoa juridica' : 'pessoa fisica'})`,
      cliente.cpf ? `CPF: ${cliente.cpf}` : null,
      cliente.cnpj ? `CNPJ: ${cliente.cnpj}` : null,
      cliente.razao_social ? `Razao social: ${cliente.razao_social}` : null,
      cliente.profissao ? `Profissao: ${cliente.profissao}` : null,
      cliente.estado_civil ? `Estado civil: ${cliente.estado_civil}` : null,
      endereco ? `Endereco: ${endereco}` : null,
      cliente.email ? `E-mail: ${cliente.email}` : null,
      cliente.telefone ? `Telefone: ${cliente.telefone}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return { texto, cliente };
  }

  /** Processos ativos do cliente, para dar contexto extra ao resumo e a geracao de
   * documentos quando nao ha um processo especifico selecionado. */
  private async processosDoCliente(tenantId: string, clienteId: string): Promise<string> {
    const processos = await this.processoModel
      .find({
        tenant_id: new Types.ObjectId(tenantId),
        $or: [{ cliente_id: new Types.ObjectId(clienteId) }, { clientes_adicionais: new Types.ObjectId(clienteId) }],
      })
      .select('numero_cnj classe status')
      .limit(20);
    if (!processos.length) return '';
    return `Processos vinculados: ${processos.map((p) => `${p.numero_cnj} (${p.classe ?? 'classe nao identificada'}, ${p.status})`).join(' | ')}`;
  }

  /** Extrai o texto de um arquivo (.docx, .pdf ou .txt) para uso como modelo de
   * referencia ou para revisao de documento existente. */
  async extrairTexto(arquivo: Express.Multer.File): Promise<string> {
    let texto: string;
    if (arquivo.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      texto = (await mammoth.extractRawText({ buffer: arquivo.buffer })).value;
    } else if (arquivo.mimetype === 'application/pdf') {
      texto = (await pdfParse(arquivo.buffer)).text;
    } else if (arquivo.mimetype === 'text/plain') {
      texto = arquivo.buffer.toString('utf-8');
    } else {
      throw new BadRequestException('formato nao suportado - envie .docx, .pdf ou .txt');
    }
    return texto.slice(0, LIMITE_MODELO_CARACTERES);
  }

  private ferramentaJurisprudencia(ativar?: boolean) {
    if (!ativar) return undefined;
    return [
      {
        type: 'web_search_20260209' as const,
        name: 'web_search' as const,
        max_uses: 5,
        allowed_domains: DOMINIOS_JURISPRUDENCIA,
      },
    ];
  }

  private extrairUltimoTexto(resposta: Anthropic.Message): string {
    const bloco = resposta.content.filter((b) => b.type === 'text').pop();
    if (!bloco || bloco.type !== 'text') {
      throw new InternalServerErrorException('IA nao retornou texto');
    }
    return bloco.text;
  }

  async gerarDocumento(
    tenantId: string,
    dados: {
      tipo_documento: string;
      instrucoes: string;
      processo_id?: string;
      cliente_id?: string;
      modelo_texto?: string;
      buscar_jurisprudencia?: boolean;
      mensagem_cliente?: string;
    },
    usuarioId?: string,
  ): Promise<{ texto: string }> {
    await this.verificarCreditos(tenantId, usuarioId);

    const [{ texto: contextoProcesso }, { texto: contextoCliente }, contextoProcessosCliente] = await Promise.all([
      this.contextoProcesso(tenantId, dados.processo_id),
      this.contextoCliente(tenantId, dados.cliente_id),
      dados.cliente_id && !dados.processo_id ? this.processosDoCliente(tenantId, dados.cliente_id) : Promise.resolve(''),
    ]);

    const contexto = [contextoCliente, contextoProcessosCliente, contextoProcesso].filter(Boolean).join('\n\n');

    const instrucaoBase =
      'Voce e um assistente juridico especializado em redigir minutas de peticoes e documentos ' +
      'para um escritorio de advocacia brasileiro. Escreva em portugues formal, no padrao usado ' +
      'em pecas processuais e correspondencias juridicas no Brasil. Produza apenas o texto do ' +
      'documento solicitado, pronto para revisao por um advogado - sem comentarios sobre o que ' +
      'voce fez, sem markdown, sem disclaimers. Use [placeholders entre colchetes] para qualquer ' +
      'dado que voce nao tenha e que precise ser preenchido manualmente. Quando um modelo de ' +
      'referencia for fornecido, siga a mesma estrutura, secoes e tom do modelo, adaptando o ' +
      'conteudo para o caso descrito - nao copie dados do modelo que nao se apliquem ao caso atual. ' +
      'Quando o contexto do cliente incluir CPF/CNPJ e endereco, use esses dados na qualificacao das ' +
      'partes se o documento exigir (ex.: peticao inicial).';

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      thinking: { type: 'disabled' },
      system: [
        { type: 'text', text: instrucaoBase, cache_control: { type: 'ephemeral' } },
        ...(dados.buscar_jurisprudencia
          ? [
              {
                type: 'text' as const,
                text:
                  'Utilize a busca na web para localizar jurisprudencia real e atual (STJ, STF, TRTs, TJs) ' +
                  'que sustente os argumentos, citando o tribunal, numero do processo/tema e a tese resumida.' +
                  INSTRUCAO_JURISPRUDENCIA_FALLBACK,
              },
            ]
          : []),
      ],
      tools: this.ferramentaJurisprudencia(dados.buscar_jurisprudencia),
      messages: [
        {
          role: 'user',
          content: [
            `Redija um(a) "${dados.tipo_documento}".`,
            contexto ? `\nContexto do caso:\n${contexto}` : '',
            dados.modelo_texto ? `\nModelo de referencia (siga a estrutura/estilo, adapte o conteudo):\n${dados.modelo_texto}` : '',
            dados.mensagem_cliente
              ? `\nMensagem recebida do cliente, que a resposta deve considerar:\n"${dados.mensagem_cliente}"`
              : '',
            `\nInstrucoes especificas do advogado:\n${dados.instrucoes}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    });

    await this.debitarCreditos(tenantId, usuarioId, resposta.usage, 'gerar-documento');
    return { texto: this.extrairUltimoTexto(resposta) };
  }

  async copiloto(
    tenantId: string,
    dados: { pergunta: string; processo_id?: string; buscar_jurisprudencia?: boolean; historico?: HistoricoItem[] },
    usuarioId?: string,
  ): Promise<{ resposta: string }> {
    await this.verificarCreditos(tenantId, usuarioId);

    const { texto: contextoProcesso } = await this.contextoProcesso(tenantId, dados.processo_id);

    const instrucaoBase =
      'Voce e o copiloto juridico do Trilva, um sistema de gestao para escritorios de advocacia ' +
      'brasileiros. Responda de forma direta e objetiva, em portugues, com base no contexto do ' +
      'processo fornecido quando houver (inclusive dados de honorarios contratados, se perguntado ' +
      'sobre valores). Se a pergunta pedir uma opiniao juridica sobre estrategia ou merito, responda ' +
      'como um assistente experiente, mas deixe claro que a decisao final e do advogado responsavel.';

    const mensagensHistorico = (dados.historico ?? []).slice(-10).map((h) => ({
      role: h.role,
      content: h.texto,
    }));

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      thinking: { type: 'disabled' },
      system: [
        { type: 'text', text: instrucaoBase, cache_control: { type: 'ephemeral' } },
        ...(dados.buscar_jurisprudencia
          ? [
              {
                type: 'text' as const,
                text:
                  'Utilize a busca na web para localizar jurisprudencia real e atual (STJ, STF, TRTs, TJs) ' +
                  'relevante a pergunta, citando o tribunal, numero do processo/tema e a tese resumida.' +
                  INSTRUCAO_JURISPRUDENCIA_FALLBACK,
              },
            ]
          : []),
      ],
      tools: this.ferramentaJurisprudencia(dados.buscar_jurisprudencia),
      messages: [
        ...mensagensHistorico,
        {
          role: 'user',
          content: [contextoProcesso ? `Contexto do processo:\n${contextoProcesso}\n` : '', dados.pergunta]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    });

    await this.debitarCreditos(tenantId, usuarioId, resposta.usage, 'copiloto');
    return { resposta: this.extrairUltimoTexto(resposta) };
  }

  /** Resumo do processo com cache em Mongo - so chama a IA de novo se `regenerar`
   * for true ou se ainda nao existir resumo salvo. */
  async resumoProcesso(
    tenantId: string,
    processoId: string,
    regenerar: boolean,
    usuarioId?: string,
  ): Promise<{ resumo: string; gerado_em: Date }> {
    const processo = await this.processoModel.findOne({
      _id: new Types.ObjectId(processoId),
      tenant_id: new Types.ObjectId(tenantId),
    });
    if (!processo) throw new NotFoundException('processo nao encontrado');

    if (!regenerar && processo.ia_resumo && processo.ia_resumo_gerado_em) {
      return { resumo: processo.ia_resumo, gerado_em: processo.ia_resumo_gerado_em };
    }

    await this.verificarCreditos(tenantId, usuarioId);
    const { texto: contexto } = await this.contextoProcesso(tenantId, processoId);

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      system: [
        {
          type: 'text',
          text:
            'Voce e o copiloto juridico do Trilva. Resuma o andamento do processo em ate 3 frases curtas, ' +
            'em portugues, direto ao ponto, destacando a fase atual e o proximo passo esperado. Sem markdown.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: contexto }],
    });

    await this.debitarCreditos(tenantId, usuarioId, resposta.usage, 'resumo-processo');
    const resumo = this.extrairUltimoTexto(resposta);
    const geradoEm = new Date();
    processo.ia_resumo = resumo;
    processo.ia_resumo_gerado_em = geradoEm;
    await processo.save();
    return { resumo, gerado_em: geradoEm };
  }

  /** Mesmo padrao de cache do resumo do processo, mas para o cliente: junta os dados
   * cadastrais com os processos vinculados para dar um panorama do relacionamento. */
  async resumoCliente(
    tenantId: string,
    clienteId: string,
    regenerar: boolean,
    usuarioId?: string,
  ): Promise<{ resumo: string; gerado_em: Date }> {
    const cliente = await this.clienteModel.findOne({
      _id: new Types.ObjectId(clienteId),
      tenant_id: new Types.ObjectId(tenantId),
    });
    if (!cliente) throw new NotFoundException('cliente nao encontrado');

    if (!regenerar && cliente.ia_resumo && cliente.ia_resumo_gerado_em) {
      return { resumo: cliente.ia_resumo, gerado_em: cliente.ia_resumo_gerado_em };
    }

    await this.verificarCreditos(tenantId, usuarioId);
    const [{ texto: contextoCliente }, contextoProcessos] = await Promise.all([
      this.contextoCliente(tenantId, clienteId),
      this.processosDoCliente(tenantId, clienteId),
    ]);
    const contexto = [contextoCliente, contextoProcessos].filter(Boolean).join('\n');

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      system: [
        {
          type: 'text',
          text:
            'Voce e o copiloto juridico do Trilva. Resuma o relacionamento do escritorio com este cliente ' +
            'em ate 3 frases curtas, em portugues, direto ao ponto: quantos processos tem, o status geral ' +
            'e qualquer ponto de atencao (ex.: nenhum processo ativo). Sem markdown.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: contexto || `Cliente sem processos vinculados: ${cliente.nome}` }],
    });

    await this.debitarCreditos(tenantId, usuarioId, resposta.usage, 'resumo-cliente');
    const resumo = this.extrairUltimoTexto(resposta);
    const geradoEm = new Date();
    cliente.ia_resumo = resumo;
    cliente.ia_resumo_gerado_em = geradoEm;
    await cliente.save();
    return { resumo, gerado_em: geradoEm };
  }

  /** Sugere proximos passos como uma lista curta de titulos de tarefa - o frontend
   * decide quais criar. Formato de saida e uma lista simples, uma por linha, para
   * evitar dependencia de structured output. */
  async sugerirTarefas(tenantId: string, processoId: string, usuarioId?: string): Promise<{ sugestoes: string[] }> {
    await this.verificarCreditos(tenantId, usuarioId);
    const { texto: contexto } = await this.contextoProcesso(tenantId, processoId);

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 512,
      thinking: { type: 'disabled' },
      system: [
        {
          type: 'text',
          text:
            'Voce e o copiloto juridico do Trilva. A partir do contexto do processo, liste de 2 a 5 proximos ' +
            'passos praticos que o advogado deveria transformar em tarefas. Responda SOMENTE com uma lista, ' +
            'uma acao curta por linha (max 80 caracteres), sem numeracao, sem marcadores, sem texto adicional.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: contexto }],
    });

    await this.debitarCreditos(tenantId, usuarioId, resposta.usage, 'sugerir-tarefas');
    const texto = this.extrairUltimoTexto(resposta);
    const sugestoes = texto
      .split('\n')
      .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
      .filter((l) => l.length > 0);
    return { sugestoes };
  }

  /** Revisa um documento existente enviado pelo advogado, apontando inconsistencias,
   * prazos citados e pontos de atencao - nao reescreve o documento. */
  async revisarDocumento(
    tenantId: string,
    arquivo: Express.Multer.File,
    processoId?: string,
    usuarioId?: string,
  ): Promise<{ revisao: string }> {
    await this.verificarCreditos(tenantId, usuarioId);
    const textoDocumento = await this.extrairTexto(arquivo);
    const { texto: contextoProcesso } = await this.contextoProcesso(tenantId, processoId);

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      thinking: { type: 'disabled' },
      system: [
        {
          type: 'text',
          text:
            'Voce e um revisor juridico senior. Analise o documento enviado e aponte, em topicos curtos: ' +
            '(1) inconsistencias ou erros aparentes, (2) prazos citados no texto e se fazem sentido, ' +
            '(3) clausulas ou secoes que parecem faltar para o tipo de documento, (4) sugestoes de melhoria. ' +
            'Nao reescreva o documento inteiro. Responda em portugues, direto, sem markdown.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            contextoProcesso ? `Contexto do processo:\n${contextoProcesso}\n` : '',
            `Documento a revisar:\n${textoDocumento}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    });

    await this.debitarCreditos(tenantId, usuarioId, resposta.usage, 'revisar-documento');
    return { revisao: this.extrairUltimoTexto(resposta) };
  }

  // ---- Modelos de documento salvos (biblioteca por tipo) ----

  async listarModelos(tenantId: string, tipoDocumento?: string) {
    const filtro: Record<string, unknown> = { tenant_id: new Types.ObjectId(tenantId) };
    if (tipoDocumento) filtro.tipo_documento = tipoDocumento;
    return this.modeloModel.find(filtro).sort({ nome: 1 }).select('nome tipo_documento created_at').exec();
  }

  async obterModelo(tenantId: string, id: string) {
    const modelo = await this.modeloModel.findOne({ _id: new Types.ObjectId(id), tenant_id: new Types.ObjectId(tenantId) });
    if (!modelo) throw new NotFoundException('modelo nao encontrado');
    return modelo;
  }

  async salvarModelo(tenantId: string, usuarioId: string, dados: { nome: string; tipo_documento: string; conteudo: string }) {
    return this.modeloModel.create({
      tenant_id: new Types.ObjectId(tenantId),
      criado_por: new Types.ObjectId(usuarioId),
      nome: dados.nome,
      tipo_documento: dados.tipo_documento,
      conteudo: dados.conteudo.slice(0, LIMITE_MODELO_CARACTERES),
    });
  }

  async excluirModelo(tenantId: string, id: string) {
    const resultado = await this.modeloModel.deleteOne({ _id: new Types.ObjectId(id), tenant_id: new Types.ObjectId(tenantId) });
    if (resultado.deletedCount === 0) throw new NotFoundException('modelo nao encontrado');
    return { ok: true };
  }
}
