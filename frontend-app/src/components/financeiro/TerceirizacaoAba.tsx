'use client';

import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Check, Landmark, Plus, X } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import {
  atualizarTerceirizacao,
  criarTerceirizacao,
  listarTerceirizacoes,
  type Terceirizacao,
  type TipoServicoTerceirizado,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { paraNumero } from '@/lib/moeda';

const TIPO_LABEL: Record<TipoServicoTerceirizado, string> = {
  correspondente: 'Correspondente',
  peticao: 'Elaboração de petição',
  sustentacao_oral: 'Sustentação oral',
  audiencia: 'Audiência',
  outro: 'Outro',
};

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function formatarMoeda(valor?: number) {
  if (!valor) return null;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function TerceirizacaoAba() {
  const [itens, setItens] = useState<Terceirizacao[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setItens(await listarTerceirizacoes(status || undefined));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar terceirizações');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const concluir = async (item: Terceirizacao) => {
    setItens((atual) => atual.map((i) => (i._id === item._id ? { ...i, status: 'concluido' } : i)));
    try {
      await atualizarTerceirizacao(item._id, { status: 'concluido' });
    } catch {
      carregar();
    }
  };

  const pendentes = itens.filter((i) => i.status === 'pendente').length;
  const totalReceber = itens.filter((i) => i.status !== 'cancelado').reduce((acc, i) => acc + (i.valor ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Briefcase} label="Pendentes" value={loading ? '—' : pendentes} tone="brand" />
        <StatCard icon={Check} label="Total" value={loading ? '—' : itens.length} />
        <StatCard icon={Briefcase} label="Valor combinado" value={loading ? '—' : (formatarMoeda(totalReceber) ?? 'R$ 0,00')} />
      </div>

      {erro && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {erro}
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          onClick={() => setModalAberto(true)}
          className="ml-auto flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
        >
          <Plus size={14} /> Novo serviço
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando…</p>
      ) : itens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center text-gray-400 text-sm">
          Nenhum serviço prestado a terceiros por aqui.
        </div>
      ) : (
        <ul className="space-y-2">
          {itens.map((item) => (
            <li
              key={item._id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
            >
              <button
                onClick={() => concluir(item)}
                disabled={item.status !== 'pendente'}
                className={cn(
                  'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                  item.status === 'concluido'
                    ? 'bg-green-500 border-green-500 text-white'
                    : item.status === 'cancelado'
                      ? 'border-gray-200 dark:border-gray-800'
                      : 'border-gray-300 dark:border-gray-600 hover:border-brand-500',
                )}
                title="Marcar como concluído"
              >
                {item.status === 'concluido' && <Check size={12} />}
              </button>

              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', item.status === 'concluido' ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200')}>
                  {TIPO_LABEL[item.tipo_servico]} para {item.contratante}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                  <span>{new Date(item.data_compromisso).toLocaleDateString('pt-BR')}</span>
                  <span>· {item.descricao}</span>
                  {item.numero_processo && (
                    <span className="flex items-center gap-1 font-mono">
                      <Landmark size={10} /> {item.numero_processo}
                    </span>
                  )}
                </div>
              </div>

              {formatarMoeda(item.valor) && (
                <span className="text-sm font-semibold text-green-600 dark:text-green-400 shrink-0">{formatarMoeda(item.valor)}</span>
              )}

              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full shrink-0',
                  item.status === 'concluido'
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : item.status === 'cancelado'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      : 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300',
                )}
              >
                {STATUS_LABEL[item.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {modalAberto && (
        <NovoServicoModal
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

function NovoServicoModal({ onFechar, onCriado }: { onFechar: () => void; onCriado: () => void }) {
  const [form, setForm] = useState({
    tipo_servico: 'correspondente' as TipoServicoTerceirizado,
    contratante: '',
    descricao: '',
    numero_processo: '',
    data_compromisso: '',
    valor: '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!form.contratante.trim() || !form.descricao.trim() || !form.data_compromisso) {
      setErro('Preencha contratante, descrição e data.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await criarTerceirizacao({
        tipo_servico: form.tipo_servico,
        contratante: form.contratante,
        descricao: form.descricao,
        numero_processo: form.numero_processo || undefined,
        data_compromisso: new Date(form.data_compromisso).toISOString(),
        valor: form.valor ? paraNumero(form.valor) : undefined,
      });
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao criar serviço');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Briefcase size={15} /> Novo serviço prestado
          </p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Tipo de serviço</span>
            <select
              value={form.tipo_servico}
              onChange={(e) => setForm({ ...form, tipo_servico: e.target.value as TipoServicoTerceirizado })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              {Object.entries(TIPO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Advogado/escritório contratante</span>
            <input
              value={form.contratante}
              onChange={(e) => setForm({ ...form, contratante: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Descrição</span>
            <input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex.: audiência de instrução na 3ª Vara Cível"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Data/hora do compromisso</span>
              <input
                type="datetime-local"
                value={form.data_compromisso}
                onChange={(e) => setForm({ ...form, data_compromisso: e.target.value })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Valor combinado (opcional)</span>
              <input
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Número do processo (opcional)</span>
            <input
              value={form.numero_processo}
              onChange={(e) => setForm({ ...form, numero_processo: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 font-mono"
            />
          </label>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Criar serviço'}
          </button>
          <p className="text-[11px] text-gray-400 text-center">
            Cria automaticamente uma tarefa (Agenda/Tarefas) e, se houver valor, um lançamento no Financeiro.
          </p>
        </div>
      </div>
    </div>
  );
}
