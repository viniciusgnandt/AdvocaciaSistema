import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lancamento } from './schemas/lancamento.schema';
import { CriarLancamentoDto } from './dto/criar-lancamento.dto';
import { AtualizarLancamentoDto } from './dto/atualizar-lancamento.dto';

@Injectable()
export class FinanceiroService {
  constructor(@InjectModel(Lancamento.name) private readonly lancamentoModel: Model<Lancamento>) {}

  async criar(tenantId: Types.ObjectId, dto: CriarLancamentoDto) {
    const base = {
      tenant_id: tenantId,
      tipo: dto.tipo,
      valor: dto.valor,
      categoria: dto.categoria,
      cliente_id: dto.clienteId ? new Types.ObjectId(dto.clienteId) : undefined,
      numero_processo: dto.numero_processo,
    };

    if (!dto.parcelas || dto.parcelas < 2) {
      return this.lancamentoModel.create({
        ...base,
        descricao: dto.descricao,
        data_vencimento: new Date(dto.data_vencimento),
      });
    }

    // parcelamento: N lancamentos com o mesmo valor cada, vencimento mensal a partir da
    // data informada, todos amarrados por grupo_parcelamento_id para poderem ser
    // listados/excluidos em conjunto depois.
    const grupoId = new Types.ObjectId();
    const dataBase = new Date(dto.data_vencimento);
    // aritmetica em UTC (Date.UTC), nao setMonth local: setMonth() opera no fuso local
    // do servidor, entao "01/09 UTC" podia virar "31/08 local" e pular pro mes errado
    // ao somar +1 mes (ex.: rolava pra 02/10 em vez de 01/10 num servidor UTC-3).
    const docs = Array.from({ length: dto.parcelas }, (_, i) => {
      const vencimento = new Date(
        Date.UTC(
          dataBase.getUTCFullYear(),
          dataBase.getUTCMonth() + i,
          dataBase.getUTCDate(),
          dataBase.getUTCHours(),
          dataBase.getUTCMinutes(),
          dataBase.getUTCSeconds(),
        ),
      );
      return {
        ...base,
        descricao: `${dto.descricao} (${i + 1}/${dto.parcelas})`,
        data_vencimento: vencimento,
        grupo_parcelamento_id: grupoId,
        parcela_atual: i + 1,
        parcela_total: dto.parcelas,
      };
    });
    const criados = await this.lancamentoModel.insertMany(docs);
    return criados;
  }

  async listar(
    tenantId: Types.ObjectId,
    filtros: { tipo?: string; status?: string; clienteId?: string; numeroProcesso?: string; mes?: string },
  ) {
    // transicao preguicosa: pendente vencido vira "atrasado" antes de responder,
    // no mesmo padrao usado em tarefas.controller.
    await this.lancamentoModel.updateMany(
      { tenant_id: tenantId, status: 'pendente', data_vencimento: { $lt: new Date() } },
      { $set: { status: 'atrasado' } },
    );

    const filtro: Record<string, unknown> = { tenant_id: tenantId };
    if (filtros.tipo) filtro.tipo = filtros.tipo;
    if (filtros.status) filtro.status = filtros.status;
    if (filtros.clienteId) filtro.cliente_id = new Types.ObjectId(filtros.clienteId);
    if (filtros.numeroProcesso) filtro.numero_processo = filtros.numeroProcesso;
    if (filtros.mes) {
      const [ano, mes] = filtros.mes.split('-').map(Number);
      const inicio = new Date(Date.UTC(ano, mes - 1, 1));
      const fim = new Date(Date.UTC(ano, mes, 1));
      filtro.data_vencimento = { $gte: inicio, $lt: fim };
    }

    return this.lancamentoModel.find(filtro).sort({ data_vencimento: 1 }).exec();
  }

  async resumo(tenantId: Types.ObjectId, mes?: string) {
    await this.lancamentoModel.updateMany(
      { tenant_id: tenantId, status: 'pendente', data_vencimento: { $lt: new Date() } },
      { $set: { status: 'atrasado' } },
    );

    const filtro: Record<string, unknown> = { tenant_id: tenantId };
    if (mes) {
      const [ano, mesNum] = mes.split('-').map(Number);
      filtro.data_vencimento = {
        $gte: new Date(Date.UTC(ano, mesNum - 1, 1)),
        $lt: new Date(Date.UTC(ano, mesNum, 1)),
      };
    }

    const lancamentos = await this.lancamentoModel.find(filtro).exec();

    const soma = (preds: (l: Lancamento) => boolean) =>
      lancamentos.filter(preds).reduce((acc, l) => acc + l.valor, 0);

    return {
      aReceber: soma((l) => l.tipo === 'receita' && (l.status === 'pendente' || l.status === 'atrasado')),
      aPagar: soma((l) => l.tipo === 'despesa' && (l.status === 'pendente' || l.status === 'atrasado')),
      recebido: soma((l) => l.tipo === 'receita' && l.status === 'pago'),
      pago: soma((l) => l.tipo === 'despesa' && l.status === 'pago'),
      atrasados: lancamentos.filter((l) => l.status === 'atrasado').length,
    };
  }

  async buscar(tenantId: Types.ObjectId, id: Types.ObjectId) {
    return this.lancamentoModel.findOne({ _id: id, tenant_id: tenantId });
  }

  async atualizar(tenantId: Types.ObjectId, id: Types.ObjectId, dto: AtualizarLancamentoDto) {
    const set: Record<string, unknown> = { ...dto };
    if (dto.data_vencimento) set.data_vencimento = new Date(dto.data_vencimento);
    if (dto.status === 'pago') set.data_pagamento = new Date();

    const lancamento = await this.lancamentoModel.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      { $set: set },
      { new: true },
    );
    if (!lancamento) throw new NotFoundException('lancamento nao encontrado');
    return lancamento;
  }

  async excluir(tenantId: Types.ObjectId, id: Types.ObjectId, todasParcelas = false) {
    if (todasParcelas) {
      const lancamento = await this.lancamentoModel.findOne({ _id: id, tenant_id: tenantId });
      if (!lancamento) return false;
      if (lancamento.grupo_parcelamento_id) {
        await this.lancamentoModel.deleteMany({ tenant_id: tenantId, grupo_parcelamento_id: lancamento.grupo_parcelamento_id });
        return true;
      }
    }
    const resultado = await this.lancamentoModel.deleteOne({ _id: id, tenant_id: tenantId });
    return resultado.deletedCount > 0;
  }
}
