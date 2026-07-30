'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, CheckSquare, Plus, Trash2, X } from 'lucide-react';
import { atualizarTarefa, criarTarefa, excluirTarefa, listarTarefas, listarUsuarios, type Tarefa, type Usuario } from '@/lib/api';
import { cn } from '@/lib/cn';

const PRIORIDADE_COR: Record<string, string> = {
  baixa: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
  media: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  alta: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  critica: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

export function TarefasProcesso({ numeroProcesso }: { numeroProcesso: string }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([listarTarefas({ numeroProcesso }), listarUsuarios()]);
      setTarefas(t);
      setUsuarios(u);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, [numeroProcesso]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const nomeResponsavel = (id?: string) => usuarios.find((u) => u._id === id)?.nome;

  const concluir = async (t: Tarefa) => {
    setTarefas((atual) => atual.map((x) => (x._id === t._id ? { ...x, status: 'concluida' } : x)));
    try {
      await atualizarTarefa(t._id, { status: 'concluida' });
    } catch {
      carregar();
    }
  };

  const remover = async (t: Tarefa) => {
    if (!window.confirm(`Excluir a tarefa "${t.titulo}"?`)) return;
    setTarefas((atual) => atual.filter((x) => x._id !== t._id));
    try {
      await excluirTarefa(t._id);
    } catch {
      carregar();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <CheckSquare size={12} /> Tarefas
          {tarefas.length > 0 && <span className="normal-case font-normal text-gray-300 dark:text-gray-700">({tarefas.length})</span>}
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
        >
          <Plus size={13} /> Nova tarefa
        </button>
      </div>

      {erro && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{erro}</p>}

      {loading ? (
        <p className="text-xs text-gray-400">Carregando…</p>
      ) : tarefas.length === 0 ? (
        <div
          onClick={() => setModalAberto(true)}
          className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-400 cursor-pointer hover:border-brand-300 dark:hover:border-brand-800"
        >
          Nenhuma tarefa vinculada a este processo ainda.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {tarefas.map((t) => (
            <li
              key={t._id}
              className="flex items-center gap-2.5 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 text-sm"
            >
              <button
                onClick={() => concluir(t)}
                disabled={t.status === 'concluida'}
                className={cn(
                  'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                  t.status === 'concluida'
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-brand-500',
                )}
                title="Marcar como concluída"
              >
                {t.status === 'concluida' && <Check size={10} />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={cn('truncate', t.status === 'concluida' ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300')}>
                  {t.titulo}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className={t.status === 'atrasada' ? 'text-red-500 font-medium' : ''}>
                    {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                  </span>
                  {nomeResponsavel(t.responsavel_id) && <span>· {nomeResponsavel(t.responsavel_id)}</span>}
                </div>
              </div>

              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full shrink-0', PRIORIDADE_COR[t.prioridade])}>
                {t.prioridade}
              </span>

              <button
                onClick={() => remover(t)}
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
        <NovaTarefaModal
          numeroProcesso={numeroProcesso}
          usuarios={usuarios}
          onFechar={() => setModalAberto(false)}
          onCriada={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function NovaTarefaModal({
  numeroProcesso,
  usuarios,
  onFechar,
  onCriada,
}: {
  numeroProcesso: string;
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
        numero_processo: numeroProcesso,
      });
      onCriada();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao criar tarefa');
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
            <CheckSquare size={15} className="text-brand-500" /> Nova tarefa
          </p>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-400 font-mono">{numeroProcesso}</p>

          <input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Título"
            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.data_vencimento}
              onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
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
          </div>

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
