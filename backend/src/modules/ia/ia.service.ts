import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import { Processo } from '../processos/schemas/processo.schema';
import { Cliente } from '../clientes/schemas/cliente.schema';
import { ModeloDocumento } from './schemas/modelo-documento.schema';
import { IaUso } from './schemas/ia-uso.schema';

const LIMITE_MODELO_CARACTERES = 20000; // evita prompts gigantes com modelos muito longos
const LIMITE_MENSAL_PADRAO = Number(process.env.IA_LIMITE_MENSAL ?? 300);

const DOMINIOS_JURISPRUDENCIA = ['stj.jus.br', 'stf.jus.br', 'jusbrasil.com.br', 'trt2.jus.br', 'tjsp.jus.br', 'cnj.jus.br'];

type HistoricoItem = { role: 'user' | 'assistant'; texto: string };

@Injectable()
export class IaService {
  private readonly client: Anthropic;

  constructor(
    @InjectModel(Processo.name) private readonly processoModel: Model<Processo>,
    @InjectModel(Cliente.name) private readonly clienteModel: Model<Cliente>,
    @InjectModel(ModeloDocumento.name) private readonly modeloModel: Model<ModeloDocumento>,
    @InjectModel(IaUso.name) private readonly usoModel: Model<IaUso>,
  ) {
    this.client = new Anthropic();
  }

  /** Cota mensal simples por tenant - evita custo descontrolado de API. Incrementa
   * antes de cada chamada e recusa quando o limite do mes ja foi atingido. */
  private async verificarEContarUso(tenantId: string): Promise<void> {
    const anoMes = new Date().toISOString().slice(0, 7);
    const uso = await this.usoModel.findOneAndUpdate(
      { tenant_id: new Types.ObjectId(tenantId), ano_mes: anoMes },
      { $inc: { contagem: 1 } },
      { upsert: true, new: true },
    );
    if (uso.contagem > LIMITE_MENSAL_PADRAO) {
      throw new ForbiddenException(
        `Limite mensal de ${LIMITE_MENSAL_PADRAO} chamadas de IA atingido para este escritorio. Fale com o suporte para aumentar a cota.`,
      );
    }
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

  private async contextoCliente(tenantId: string, clienteId?: string): Promise<string> {
    if (!clienteId) return '';
    const cliente = await this.clienteModel.findOne({
      _id: new Types.ObjectId(clienteId),
      tenant_id: new Types.ObjectId(tenantId),
    });
    if (!cliente) throw new NotFoundException('cliente nao encontrado');
    return `Cliente: ${cliente.nome}`;
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
    },
  ): Promise<{ texto: string }> {
    await this.verificarEContarUso(tenantId);

    const [{ texto: contextoProcesso }, contextoCliente] = await Promise.all([
      this.contextoProcesso(tenantId, dados.processo_id),
      this.contextoCliente(tenantId, dados.cliente_id),
    ]);

    const contexto = [contextoCliente, contextoProcesso].filter(Boolean).join('\n\n');

    const instrucaoBase =
      'Voce e um assistente juridico especializado em redigir minutas de peticoes e documentos ' +
      'para um escritorio de advocacia brasileiro. Escreva em portugues formal, no padrao usado ' +
      'em pecas processuais e correspondencias juridicas no Brasil. Produza apenas o texto do ' +
      'documento solicitado, pronto para revisao por um advogado - sem comentarios sobre o que ' +
      'voce fez, sem markdown, sem disclaimers. Use [placeholders entre colchetes] para qualquer ' +
      'dado que voce nao tenha e que precise ser preenchido manualmente. Quando um modelo de ' +
      'referencia for fornecido, siga a mesma estrutura, secoes e tom do modelo, adaptando o ' +
      'conteudo para o caso descrito - nao copie dados do modelo que nao se apliquem ao caso atual.';

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      system: [
        { type: 'text', text: instrucaoBase, cache_control: { type: 'ephemeral' } },
        ...(dados.buscar_jurisprudencia
          ? [
              {
                type: 'text' as const,
                text:
                  'Utilize a busca na web para localizar jurisprudencia real e atual (STJ, STF, TRTs, TJs) ' +
                  'que sustente os argumentos, citando o tribunal, numero do processo/tema e a tese resumida.',
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
            `\nInstrucoes especificas do advogado:\n${dados.instrucoes}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    });

    return { texto: this.extrairUltimoTexto(resposta) };
  }

  async copiloto(
    tenantId: string,
    dados: { pergunta: string; processo_id?: string; buscar_jurisprudencia?: boolean; historico?: HistoricoItem[] },
  ): Promise<{ resposta: string }> {
    await this.verificarEContarUso(tenantId);

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
      system: [
        { type: 'text', text: instrucaoBase, cache_control: { type: 'ephemeral' } },
        ...(dados.buscar_jurisprudencia
          ? [
              {
                type: 'text' as const,
                text:
                  'Utilize a busca na web para localizar jurisprudencia real e atual (STJ, STF, TRTs, TJs) ' +
                  'relevante a pergunta, citando o tribunal, numero do processo/tema e a tese resumida.',
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

    return { resposta: this.extrairUltimoTexto(resposta) };
  }

  /** Resumo do processo com cache em Mongo - so chama a IA de novo se `regenerar`
   * for true ou se ainda nao existir resumo salvo. */
  async resumoProcesso(tenantId: string, processoId: string, regenerar: boolean): Promise<{ resumo: string; gerado_em: Date }> {
    const processo = await this.processoModel.findOne({
      _id: new Types.ObjectId(processoId),
      tenant_id: new Types.ObjectId(tenantId),
    });
    if (!processo) throw new NotFoundException('processo nao encontrado');

    if (!regenerar && processo.ia_resumo && processo.ia_resumo_gerado_em) {
      return { resumo: processo.ia_resumo, gerado_em: processo.ia_resumo_gerado_em };
    }

    await this.verificarEContarUso(tenantId);
    const { texto: contexto } = await this.contextoProcesso(tenantId, processoId);

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
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

    const resumo = this.extrairUltimoTexto(resposta);
    const geradoEm = new Date();
    processo.ia_resumo = resumo;
    processo.ia_resumo_gerado_em = geradoEm;
    await processo.save();
    return { resumo, gerado_em: geradoEm };
  }

  /** Sugere proximos passos como uma lista curta de titulos de tarefa - o frontend
   * decide quais criar. Formato de saida e uma lista simples, uma por linha, para
   * evitar dependencia de structured output. */
  async sugerirTarefas(tenantId: string, processoId: string): Promise<{ sugestoes: string[] }> {
    await this.verificarEContarUso(tenantId);
    const { texto: contexto } = await this.contextoProcesso(tenantId, processoId);

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 512,
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

    const texto = this.extrairUltimoTexto(resposta);
    const sugestoes = texto
      .split('\n')
      .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
      .filter((l) => l.length > 0);
    return { sugestoes };
  }

  /** Revisa um documento existente enviado pelo advogado, apontando inconsistencias,
   * prazos citados e pontos de atencao - nao reescreve o documento. */
  async revisarDocumento(tenantId: string, arquivo: Express.Multer.File, processoId?: string): Promise<{ revisao: string }> {
    await this.verificarEContarUso(tenantId);
    const textoDocumento = await this.extrairTexto(arquivo);
    const { texto: contextoProcesso } = await this.contextoProcesso(tenantId, processoId);

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
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
