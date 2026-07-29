'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Calendar, Check, Landmark, Plus, Trash2, X } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import {
  atualizarTarefa,
  criarTarefa,
  excluirTarefa,
  listarTarefas,
  listarUsuarios,
  type Tarefa,
  type Usuario,
} from '@/lib/api';
import { cn } from '@/lib/cn';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
};

const PRIORIDADE_COR: Record<string, string> = {
  baixa: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  media: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  alta: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  critica: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
};

export default function TarefasPage() {
  const router = useRouter();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([listarTarefas(status ? { status } : {}), listarUsuarios()]);
      setTarefas(t);
      setUsuarios(u);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const nomeResponsavel = (id?: string) => usuarios.find((u) => u._id === id)?.nome;

  const concluir = async (tarefa: Tarefa) => {
    setTarefas((atual) => atual.map((t) => (t._id === tarefa._id ? { ...t, status: 'concluida' } : t)));
    try {
      await atualizarTarefa(tarefa._id, { status: 'concluida' });
    } catch {
      carregar();
    }
  };

  const remover = async (tarefa: Tarefa) => {
    if (!window.confirm(`Excluir a tarefa "${tarefa.titulo}"?`)) return;
    setTarefas((atual) => atual.filter((t) => t._id !== tarefa._id));
    try {
      await excluirTarefa(tarefa._id);
    } catch {
      carregar();
    }
  };

  const atrasadas = tarefas.filter((t) => t.status === 'atrasada').length;
  const pendentes = tarefas.filter((t) => t.status === 'pendente' || t.status === 'em_andamento').length;
  const concluidas = tarefas.filter((t) => t.status === 'concluida').length;

  return (
    <>
      <Topbar titulo="Tarefas" subtitulo="Prazos e afazeres do escritório" />

      <main className="flex-1 px-6 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={AlertTriangle} label="Atrasadas" value={atrasadas} tone="warning" />
          <StatCard icon={Calendar} label="Pendentes" value={pendentes} tone="brand" />
          <StatCard icon={Check} label="Concluídas" value={concluidas} />
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
            <Plus size={14} /> Nova tarefa
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando…</p>
        ) : tarefas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center text-gray-400 text-sm">
            Nenhuma tarefa por aqui.
          </div>
        ) : (
          <ul className="space-y-2">
            {tarefas.map((t) => (
              <li
                key={t._id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
              >
                <button
                  onClick={() => concluir(t)}
                  disabled={t.status === 'concluida'}
                  className={cn(
                    'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                    t.status === 'concluida'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-brand-500',
                  )}
                  title="Marcar como concluída"
                >
                  {t.status === 'concluida' && <Check size={12} />}
                </button>

                <div
                  onClick={() => t.numero_processo && router.push(`/processos?numero=${t.numero_processo}`)}
                  className={cn('min-w-0 flex-1', t.numero_processo && 'cursor-pointer')}
                >
                  <p className={cn('text-sm', t.status === 'concluida' ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200')}>
                    {t.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-400">
                    <span>{new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</span>
                    {t.numero_processo && (
                      <span className="flex items-center gap-1 font-mono">
                        <Landmark size={10} /> {t.numero_processo}
                      </span>
                    )}
                    {nomeResponsavel(t.responsavel_id) && <span>· {nomeResponsavel(t.responsavel_id)}</span>}
                  </div>
                </div>

                <span className={cn('text-xs px-2 py-0.5 rounded-full border shrink-0', PRIORIDADE_COR[t.prioridade])}>
                  {t.prioridade}
                </span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full shrink-0',
                    t.status === 'atrasada'
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
                  )}
                >
                  {STATUS_LABEL[t.status]}
                </span>
                <button
                  onClick={() => remover(t)}
                  title="Excluir"
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {modalAberto && (
        <NovaTarefaModal
          usuarios={usuarios}
          onFechar={() => setModalAberto(false)}
          onCriada={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </>
  );
}

function NovaTarefaModal({
  usuarios,
  onFechar,
  onCriada,
}: {
  usuarios: Usuario[];
  onFechar: () => void;
  onCriada: () => void;
}) {
  const [form, setForm] = useState({ titulo: '', data_vencimento: '', prioridade: 'media', responsavel_id: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!form.titulo.trim() || !form.data_vencimento) {
      setErro('Preencha título e data.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await criarTarefa({
        titulo: form.titulo,
        data_vencimento: new Date(form.data_vencimento).toISOString(),
        prioridade: form.prioridade,
        responsavel_id: form.responsavel_id || undefined,
      });
      onCriada();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao criar tarefa');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nova tarefa</p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Título</span>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Vencimento</span>
              <input
                type="date"
                value={form.data_vencimento}
                onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Prioridade</span>
              <select
                value={form.prioridade}
                onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Responsável</span>
            <select
              value={form.responsavel_id}
              onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              <option value="">Sem responsável</option>
              {usuarios.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </label>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Criar tarefa'}
          </button>
        </div>
      </div>
    </div>
  );
}
