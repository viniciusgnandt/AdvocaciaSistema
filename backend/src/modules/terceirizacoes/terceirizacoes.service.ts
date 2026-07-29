import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Terceirizacao } from './schemas/terceirizacao.schema';
import { Tarefa } from '../tarefas/schemas/tarefa.schema';
import { Lancamento } from '../financeiro/schemas/lancamento.schema';
import { CriarTerceirizacaoDto } from './dto/criar-terceirizacao.dto';
import { AtualizarTerceirizacaoDto } from './dto/atualizar-terceirizacao.dto';

const TIPO_SERVICO_LABEL: Record<string, string> = {
  correspondente: 'Correspondente',
  peticao: 'Elaboração de petição',
  sustentacao_oral: 'Sustentação oral',
  audiencia: 'Audiência',
  outro: 'Serviço',
};

@Injectable()
export class TerceirizacoesService {
  constructor(
    @InjectModel(Terceirizacao.name) private readonly terceirizacaoModel: Model<Terceirizacao>,
    @InjectModel(Tarefa.name) private readonly tarefaModel: Model<Tarefa>,
    @InjectModel(Lancamento.name) private readonly lancamentoModel: Model<Lancamento>,
  ) {}

  async criar(tenantId: Types.ObjectId, dto: CriarTerceirizacaoDto) {
    const dataCompromisso = new Date(dto.data_compromisso);
    const rotulo = TIPO_SERVICO_LABEL[dto.tipo_servico] ?? 'Serviço';
    const titulo = `${rotulo} para ${dto.contratante}`;

    // toda terceirizacao vira uma tarefa (aparece em /tarefas e no dashboard) e, se
    // tiver valor combinado, um lancamento de receita (aparece no financeiro) -
    // mantidos em sincronia via tarefa_id/lancamento_id, sem exigir que o usuario
    // preencha as duas telas manualmente.
    const tarefa = await this.tarefaModel.create({
      tenant_id: tenantId,
      titulo,
      descricao: dto.descricao,
      numero_processo: dto.numero_processo,
      data_vencimento: dataCompromisso,
      origem: 'terceirizacao',
    });

    let lancamentoId: Types.ObjectId | undefined;
    if (dto.valor) {
      const lancamento = await this.lancamentoModel.create({
        tenant_id: tenantId,
        tipo: 'receita',
        descricao: titulo,
        valor: dto.valor,
        categoria: 'Terceirização',
        numero_processo: dto.numero_processo,
        data_vencimento: dataCompromisso,
      });
      lancamentoId = lancamento._id as Types.ObjectId;
    }

    return this.terceirizacaoModel.create({
      tenant_id: tenantId,
      tipo_servico: dto.tipo_servico,
      contratante: dto.contratante,
      descricao: dto.descricao,
      numero_processo: dto.numero_processo,
      data_compromisso: dataCompromisso,
      valor: dto.valor,
      tarefa_id: tarefa._id,
      lancamento_id: lancamentoId,
    });
  }

  async listar(tenantId: Types.ObjectId, status?: string) {
    const filtro: Record<string, unknown> = { tenant_id: tenantId };
    if (status) filtro.status = status;
    return this.terceirizacaoModel.find(filtro).sort({ data_compromisso: 1 }).exec();
  }

  async atualizar(tenantId: Types.ObjectId, id: Types.ObjectId, dto: AtualizarTerceirizacaoDto) {
    const terceirizacao = await this.terceirizacaoModel.findOne({ _id: id, tenant_id: tenantId });
    if (!terceirizacao) throw new NotFoundException('terceirizacao nao encontrada');

    if (dto.descricao !== undefined) terceirizacao.descricao = dto.descricao;
    if (dto.data_compromisso) terceirizacao.data_compromisso = new Date(dto.data_compromisso);
    if (dto.valor !== undefined) terceirizacao.valor = dto.valor;
    if (dto.status) terceirizacao.status = dto.status;
    await terceirizacao.save();

    // mantem a tarefa e o lancamento vinculados coerentes com a mudanca de status/data
    if (terceirizacao.tarefa_id) {
      const statusTarefa = dto.status === 'concluido' ? 'concluida' : dto.status === 'cancelado' ? 'atrasada' : undefined;
      await this.tarefaModel.updateOne(
        { _id: terceirizacao.tarefa_id },
        {
          $set: {
            ...(dto.data_compromisso ? { data_vencimento: terceirizacao.data_compromisso } : {}),
            ...(statusTarefa ? { status: statusTarefa } : {}),
          },
        },
      );
    }
    if (terceirizacao.lancamento_id) {
      const statusLancamento = dto.status === 'concluido' ? 'pago' : dto.status === 'cancelado' ? 'cancelado' : undefined;
      await this.lancamentoModel.updateOne(
        { _id: terceirizacao.lancamento_id },
        {
          $set: {
            ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
            ...(dto.data_compromisso ? { data_vencimento: terceirizacao.data_compromisso } : {}),
            ...(statusLancamento ? { status: statusLancamento, data_pagamento: new Date() } : {}),
          },
        },
      );
    }

    return terceirizacao;
  }

  async excluir(tenantId: Types.ObjectId, id: Types.ObjectId) {
    const terceirizacao = await this.terceirizacaoModel.findOne({ _id: id, tenant_id: tenantId });
    if (!terceirizacao) return false;

    if (terceirizacao.tarefa_id) await this.tarefaModel.deleteOne({ _id: terceirizacao.tarefa_id });
    if (terceirizacao.lancamento_id) await this.lancamentoModel.deleteOne({ _id: terceirizacao.lancamento_id });
    await terceirizacao.deleteOne();
    return true;
  }
}
