import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import { Processo } from '../processos/schemas/processo.schema';
import { Cliente } from '../clientes/schemas/cliente.schema';

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

  async gerarDocumento(
    tenantId: string,
    dados: { tipo_documento: string; instrucoes: string; processo_id?: string; cliente_id?: string },
  ): Promise<{ texto: string }> {
    const [contextoProcesso, contextoCliente] = await Promise.all([
      this.contextoProcesso(tenantId, dados.processo_id),
      this.contextoCliente(tenantId, dados.cliente_id),
    ]);

    const contexto = [contextoCliente, contextoProcesso].filter(Boolean).join('\n\n');

    const resposta = await this.client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4096,
      system:
        'Voce e um assistente juridico especializado em redigir minutas de peticoes e documentos ' +
        'para um escritorio de advocacia brasileiro. Escreva em portugues formal, no padrao usado ' +
        'em pecas processuais e correspondencias juridicas no Brasil. Produza apenas o texto do ' +
        'documento solicitado, pronto para revisao por um advogado - sem comentarios sobre o que ' +
        'voce fez, sem markdown, sem disclaimers. Use [placeholders entre colchetes] para qualquer ' +
        'dado que voce nao tenha e que precise ser preenchido manualmente.',
      messages: [
        {
          role: 'user',
          content: [
            `Redija um(a) "${dados.tipo_documento}".`,
            contexto ? `\nContexto do caso:\n${contexto}` : '',
            `\nInstrucoes especificas do advogado:\n${dados.instrucoes}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    });

    const bloco = resposta.content.find((b) => b.type === 'text');
    if (!bloco || bloco.type !== 'text') {
      throw new InternalServerErrorException('IA nao retornou texto');
    }
    return { texto: bloco.text };
  }

  async copiloto(tenantId: string, dados: { pergunta: string; processo_id?: string }): Promise<{ resposta: string }> {
    const contextoProcesso = await this.contextoProcesso(tenantId, dados.processo_id);

    const resposta = await this.client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2048,
      system:
        'Voce e o copiloto juridico do Trilva, um sistema de gestao para escritorios de advocacia ' +
        'brasileiros. Responda de forma direta e objetiva, em portugues, com base no contexto do ' +
        'processo fornecido quando houver. Se a pergunta pedir uma opiniao juridica sobre estrategia ' +
        'ou merito, responda como um assistente experiente, mas deixe claro que a decisao final e do ' +
        'advogado responsavel.',
      messages: [
        {
          role: 'user',
          content: [contextoProcesso ? `Contexto do processo:\n${contextoProcesso}\n` : '', dados.pergunta]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    });

    const bloco = resposta.content.find((b) => b.type === 'text');
    if (!bloco || bloco.type !== 'text') {
      throw new InternalServerErrorException('IA nao retornou texto');
    }
    return { resposta: bloco.text };
  }
}
