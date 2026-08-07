import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import { Processo } from '../processos/schemas/processo.schema';
import { Cliente } from '../clientes/schemas/cliente.schema';

const LIMITE_MODELO_CARACTERES = 20000; // evita prompts gigantes com modelos muito longos

@Injectable()
export class IaService {
  private readonly client: Anthropic;

  constructor(
    @InjectModel(Processo.name) private readonly processoModel: Model<Processo>,
    @InjectModel(Cliente.name) private readonly clienteModel: Model<Cliente>,
  ) {
    this.client = new Anthropic();
  }

  private async contextoProcesso(tenantId: string, processoId?: string): Promise<string> {
    if (!processoId) return '';
    const processo = await this.processoModel.findOne({
      _id: new Types.ObjectId(processoId),
      tenant_id: new Types.ObjectId(tenantId),
    });
    if (!processo) throw new NotFoundException('processo nao encontrado');
    return [
      `Numero CNJ: ${processo.numero_cnj}`,
      processo.classe ? `Classe: ${processo.classe}` : null,
      processo.tribunal ? `Tribunal: ${processo.tribunal}` : null,
      processo.parte_ativa ? `Parte ativa: ${processo.parte_ativa}` : null,
      processo.parte_passiva ? `Parte passiva: ${processo.parte_passiva}` : null,
      processo.assuntos?.length ? `Assuntos: ${processo.assuntos.join(', ')}` : null,
      processo.fase_processual ? `Fase processual: ${processo.fase_processual}` : null,
      processo.valor_causa ? `Valor da causa: R$ ${processo.valor_causa}` : null,
      processo.movimentacoes?.length
        ? `Ultimas movimentacoes: ${processo.movimentacoes
            .slice(-5)
            .map((m) => `[${new Date(m.data).toLocaleDateString('pt-BR')}] ${m.descricao}`)
            .join(' | ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');
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

  /** Extrai o texto de um arquivo-modelo enviado pelo advogado (.docx, .pdf ou .txt),
   * para servir de referencia de estrutura/estilo na geracao do documento. */
  async extrairTextoModelo(arquivo: Express.Multer.File): Promise<string> {
    let texto: string;
    if (arquivo.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      texto = (await mammoth.extractRawText({ buffer: arquivo.buffer })).value;
    } else if (arquivo.mimetype === 'application/pdf') {
      texto = (await pdfParse(arquivo.buffer)).text;
    } else if (arquivo.mimetype === 'text/plain') {
      texto = arquivo.buffer.toString('utf-8');
    } else {
      throw new BadRequestException('formato de modelo nao suportado - envie .docx, .pdf ou .txt');
    }
    return texto.slice(0, LIMITE_MODELO_CARACTERES);
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
    const [contextoProcesso, contextoCliente] = await Promise.all([
      this.contextoProcesso(tenantId, dados.processo_id),
      this.contextoCliente(tenantId, dados.cliente_id),
    ]);

    const contexto = [contextoCliente, contextoProcesso].filter(Boolean).join('\n\n');

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      system:
        'Voce e um assistente juridico especializado em redigir minutas de peticoes e documentos ' +
        'para um escritorio de advocacia brasileiro. Escreva em portugues formal, no padrao usado ' +
        'em pecas processuais e correspondencias juridicas no Brasil. Produza apenas o texto do ' +
        'documento solicitado, pronto para revisao por um advogado - sem comentarios sobre o que ' +
        'voce fez, sem markdown, sem disclaimers. Use [placeholders entre colchetes] para qualquer ' +
        'dado que voce nao tenha e que precise ser preenchido manualmente. Quando um modelo de ' +
        'referencia for fornecido, siga a mesma estrutura, secoes e tom do modelo, adaptando o ' +
        'conteudo para o caso descrito - nao copie dados do modelo que nao se apliquem ao caso atual.' +
        (dados.buscar_jurisprudencia
          ? ' Utilize a busca na web para localizar jurisprudencia real e atual (STJ, STF, TRTs, TJs) ' +
            'que sustente os argumentos, citando o tribunal, numero do processo/tema e a tese resumida.'
          : ''),
      tools: dados.buscar_jurisprudencia
        ? [
            {
              type: 'web_search_20260209',
              name: 'web_search',
              max_uses: 5,
              allowed_domains: ['stj.jus.br', 'stf.jus.br', 'jusbrasil.com.br', 'trt2.jus.br', 'tjsp.jus.br', 'cnj.jus.br'],
            },
          ]
        : undefined,
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

    const bloco = resposta.content.filter((b) => b.type === 'text').pop();
    if (!bloco || bloco.type !== 'text') {
      throw new InternalServerErrorException('IA nao retornou texto');
    }
    return { texto: bloco.text };
  }

  async copiloto(
    tenantId: string,
    dados: { pergunta: string; processo_id?: string; buscar_jurisprudencia?: boolean },
  ): Promise<{ resposta: string }> {
    const contextoProcesso = await this.contextoProcesso(tenantId, dados.processo_id);

    const resposta = await this.client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      system:
        'Voce e o copiloto juridico do Trilva, um sistema de gestao para escritorios de advocacia ' +
        'brasileiros. Responda de forma direta e objetiva, em portugues, com base no contexto do ' +
        'processo fornecido quando houver. Se a pergunta pedir uma opiniao juridica sobre estrategia ' +
        'ou merito, responda como um assistente experiente, mas deixe claro que a decisao final e do ' +
        'advogado responsavel.' +
        (dados.buscar_jurisprudencia
          ? ' Utilize a busca na web para localizar jurisprudencia real e atual (STJ, STF, TRTs, TJs) ' +
            'relevante a pergunta, citando o tribunal, numero do processo/tema e a tese resumida.'
          : ''),
      tools: dados.buscar_jurisprudencia
        ? [
            {
              type: 'web_search_20260209',
              name: 'web_search',
              max_uses: 5,
              allowed_domains: ['stj.jus.br', 'stf.jus.br', 'jusbrasil.com.br', 'trt2.jus.br', 'tjsp.jus.br', 'cnj.jus.br'],
            },
          ]
        : undefined,
      messages: [
        {
          role: 'user',
          content: [contextoProcesso ? `Contexto do processo:\n${contextoProcesso}\n` : '', dados.pergunta]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    });

    const bloco = resposta.content.filter((b) => b.type === 'text').pop();
    if (!bloco || bloco.type !== 'text') {
      throw new InternalServerErrorException('IA nao retornou texto');
    }
    return { resposta: bloco.text };
  }
}
