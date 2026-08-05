'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Check, Plus, Trash2, Wallet, X } from 'lucide-react';
import {
  atualizarLancamento,
  criarLancamento,
  excluirLancamento,
  listarLancamentos,
  type Lancamento,
  type TipoLancamento,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { paraNumero } from '@/lib/moeda';

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function FinanceiroProcesso({ numeroProcesso }: { numeroProcesso: string }) {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setLancamentos(await listarLancamentos({ numeroProcesso }));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar financeiro');
    } finally {
      setLoading(false);
    }
  }, [numeroProcesso]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const marcarPago = async (l: Lancamento) => {
    setLancamentos((atual) => atual.map((x) => (x._id === l._id ? { ...x, status: 'pago' } : x)));
    try {
      await atualizarLancamento(l._id, { status: 'pago' });
    } catch {
      carregar();
    }
  };

  const remover = async (l: Lancamento) => {
    if (!window.confirm(`Excluir "${l.descricao}"?`)) return;
    setLancamentos((atual) => atual.filter((x) => x._id !== l._id));
    try {
      await excluirLancamento(l._id, !!l.grupo_parcelamento_id);
    } catch {
      carregar();
    }
  };

  const saldo = lancamentos.reduce((acc, l) => acc + (l.tipo === 'receita' ? l.valor : -l.valor), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <Wallet size={12} /> Financeiro
          {lancamentos.length > 0 && (
            <span
              className={cn(
                'ml-1.5 normal-case font-medium',
                saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
              )}
            >
              {saldo >= 0 ? '+' : ''}
              {formatarMoeda(saldo)}
            </span>
          )}
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
        >
          <Plus size={13} /> Novo lançamento
        </button>
      </div>

      {erro && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{erro}</p>}

      {loading ? (
        <p className="text-xs text-gray-400">Carregando…</p>
      ) : lancamentos.length === 0 ? (
        <div
          onClick={() => setModalAberto(true)}
          className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-400 cursor-pointer hover:border-brand-300 dark:hover:border-brand-800"
        >
          Nenhum lançamento vinculado a este processo ainda.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {lancamentos.map((l) => (
            <li
              key={l._id}
              className="flex items-center gap-2.5 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 text-sm"
            >
              {l.tipo === 'receita' ? (
                <ArrowUpCircle size={14} className="text-green-500 shrink-0" />
              ) : (
                <ArrowDownCircle size={14} className="text-red-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-gray-700 dark:text-gray-300">{l.descricao}</p>
                <p className="text-xs text-gray-400">{new Date(l.data_vencimento).toLocaleDateString('pt-BR')}</p>
              </div>
              <span
                className={cn(
                  'text-xs font-semibold shrink-0',
                  l.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                )}
              >
                {l.tipo === 'receita' ? '+' : '-'} {formatarMoeda(l.valor)}
              </span>
              {l.status !== 'pago' && l.status !== 'cancelado' && (
                <button
                  onClick={() => marcarPago(l)}
                  title="Marcar como pago"
                  className="p-1 rounded text-gray-300 hover:text-green-600 dark:hover:text-green-400 shrink-0"
                >
                  <Check size={13} />
                </button>
              )}
              <button
                onClick={() => remover(l)}
                title="Excluir"
                className="p-1 rounded text-gray-300 hover:text-red-600 dark:hover:text-red-400 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {modalAberto && (
        <NovoLancamentoModal
          numeroProcesso={numeroProcesso}
          onFechar={() => setModalAberto(false)}
          onCriado={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function NovoLancamentoModal({
  numeroProcesso,
  onFechar,
  onCriado,
}: {
  numeroProcesso: string;
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [form, setForm] = useState({
    tipo: 'receita' as TipoLancamento,
    descricao: '',
    valor: '',
    data_vencimento: '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    const valorNumero = paraNumero(form.valor);
    if (!form.descricao.trim() || !form.data_vencimento || !valorNumero || valorNumero <= 0) {
      setErro('Preencha descrição, valor e vencimento.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await criarLancamento({
        tipo: form.tipo,
        descricao: form.descricao,
        valor: valorNumero,
        data_vencimento: new Date(form.data_vencimento).toISOString(),
        numero_processo: numeroProcesso,
      });
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao criar lançamento');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      onClick={onFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Wallet size={15} className="text-brand-500" /> Novo lançamento
          </p>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-400 font-mono">{numeroProcesso}</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setForm({ ...form, tipo: 'receita' })}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition',
                form.tipo === 'receita'
                  ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400',
              )}
            >
              <ArrowUpCircle size={14} /> Receita
            </button>
            <button
              onClick={() => setForm({ ...form, tipo: 'despesa' })}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition',
                form.tipo === 'despesa'
                  ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400',
              )}
            >
              <ArrowDownCircle size={14} /> Despesa
            </button>
          </div>

          <input
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descrição"
            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder="Valor (R$)"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
            <input
              type="date"
              value={form.data_vencimento}
              onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </div>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={onFechar}
              className="text-sm px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="text-sm px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
