'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Calculator,
  Calendar,
  Check,
  LayoutGrid,
  List,
  Landmark,
  Plus,
  Repeat,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { CalculadoraPrazo } from '@/components/tarefas/CalculadoraPrazo';
import { CalculadoraAtualizacaoMonetaria } from '@/components/tarefas/CalculadoraAtualizacaoMonetaria';
import {
  atualizarTarefa,
  criarTarefa,
  excluirTarefa,
  listarTarefas,
  listarUsuarios,
  usuarioLogado,
  type StatusTarefa,
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

const COLUNAS: { status: StatusTarefa; titulo: string; corPonto: string }[] = [
  { status: 'pendente', titulo: 'Pendente', corPonto: 'bg-gray-400' },
  { status: 'em_andamento', titulo: 'Em andamento', corPonto: 'bg-brand-500' },
  { status: 'atrasada', titulo: 'Atrasada', corPonto: 'bg-red-500' },
  { status: 'concluida', titulo: 'Concluída', corPonto: 'bg-green-500' },
];

export default function TarefasPage() {
  const router = useRouter();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [visao, setVisao] = useState<'quadro' | 'lista'>('quadro');
  const [somenteMinhas, setSomenteMinhas] = useState(false);
  const [responsavelFiltro, setResponsavelFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [calculadoraAberta, setCalculadoraAberta] = useState(false);
  const [calculadoraMonetariaAberta, setCalculadoraMonetariaAberta] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<Tarefa | null>(null);
  const [colunaSobre, setColunaSobre] = useState<StatusTarefa | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const usuario = usuarioLogado();

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([listarTarefas(), listarUsuarios()]);
      setTarefas(t);
      setUsuarios(u);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const nomeResponsavel = (id?: string) => usuarios.find((u) => u._id === id)?.nome;
  const iniciais = (nome: string) =>
    nome
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (somenteMinhas && usuario && t.responsavel_id !== usuario.id) return false;
      if (responsavelFiltro && t.responsavel_id !== responsavelFiltro) return false;
      return true;
    });
  }, [tarefas, somenteMinhas, responsavelFiltro, usuario]);

  const moverStatus = async (id: string, status: StatusTarefa) => {
    let nota_conclusao: string | undefined;
    if (status === 'concluida') {
      const resposta = window.prompt('O que foi feito? (opcional, deixe em branco para pular)');
      if (resposta === null) return;
      nota_conclusao = resposta.trim() || undefined;
    }
    setTarefas((atual) => atual.map((t) => (t._id === id ? { ...t, status } : t)));
    try {
      await atualizarTarefa(id, { status, ...(nota_conclusao ? { nota_conclusao } : {}) });
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

  const total = tarefasFiltradas.length;
  const atrasadas = tarefasFiltradas.filter((t) => t.status === 'atrasada').length;
  const concluidas = tarefasFiltradas.filter((t) => t.status === 'concluida').length;
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <>
      <Topbar titulo="Tarefas" subtitulo="Prazos e afazeres do escritório" />

      <main className="flex-1 px-6 py-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Calendar} label="Total" value={loading ? '—' : total} tone="brand" />
          <StatCard icon={AlertTriangle} label="Atrasadas" value={loading ? '—' : atrasadas} tone="warning" />
          <StatCard icon={Check} label="Concluídas" value={loading ? '—' : concluidas} />
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col justify-center gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Progresso</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{loading ? '—' : `${progresso}%`}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${loading ? 0 : progresso}%` }}
              />
            </div>
          </div>
        </div>

        {erro && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-800 p-0.5">
            <button
              onClick={() => setVisao('quadro')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                visao === 'quadro' ? 'bg-brand-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              <LayoutGrid size={13} /> Quadro
            </button>
            <button
              onClick={() => setVisao('lista')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                visao === 'lista' ? 'bg-brand-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              <List size={13} /> Lista
            </button>
          </div>

          <button
            onClick={() => setSomenteMinhas((v) => !v)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg border transition-colors',
              somenteMinhas
                ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300'
                : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300',
            )}
          >
            Minhas tarefas
          </button>

          <select
            value={responsavelFiltro}
            onChange={(e) => setResponsavelFiltro(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
          >
            <option value="">Todos os responsáveis</option>
            {usuarios.map((u) => (
              <option key={u._id} value={u._id}>
                {u.nome}
              </option>
            ))}
          </select>

          <button
            onClick={() => setCalculadoraAberta(true)}
            className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Calculator size={14} /> Calcular prazo
          </button>

          <button
            onClick={() => setCalculadoraMonetariaAberta(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Calculator size={14} /> Atualização monetária
          </button>

          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
          >
            <Plus size={14} /> Nova tarefa
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando…</p>
        ) : tarefasFiltradas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center text-gray-400 text-sm">
            Nenhuma tarefa por aqui.
          </div>
        ) : visao === 'quadro' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
            {COLUNAS.map((coluna) => {
              const itens = tarefasFiltradas.filter((t) => t.status === coluna.status);
              return (
                <div
                  key={coluna.status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setColunaSobre(coluna.status);
                  }}
                  onDragLeave={() => setColunaSobre((atual: StatusTarefa | null) => (atual === coluna.status ? null : atual))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/tarefa-id');
                    if (id) moverStatus(id, coluna.status);
                    setColunaSobre(null);
                  }}
                  className={cn(
                    'rounded-xl border bg-gray-50/50 dark:bg-gray-900/50 overflow-hidden transition-colors',
                    colunaSobre === coluna.status
                      ? 'border-brand-300 dark:border-brand-700 bg-brand-50/40 dark:bg-brand-900/10'
                      : 'border-gray-100 dark:border-gray-800',
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                    <span className={cn('w-1.5 h-1.5 rounded-full', coluna.corPonto)} />
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{coluna.titulo}</p>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                      {itens.length}
                    </span>
                  </div>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {itens.map((t) => (
                      <div
                        key={t._id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/tarefa-id', t._id)}
                        onClick={() => setTarefaEditando(t)}
                        className="rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 space-y-2 cursor-grab active:cursor-grabbing hover:border-brand-300 dark:hover:border-brand-800 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug flex items-center gap-1">
                            {t.recorrencia && (
                              <span title="Tarefa recorrente" className="shrink-0 inline-flex">
                                <Repeat size={11} className="text-gray-300 dark:text-gray-600" />
                              </span>
                            )}
                            {t.titulo}
                          </p>
                          <span className={cn('shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border', PRIORIDADE_COR[t.prioridade])}>
                            {t.prioridade}
                          </span>
                        </div>

                        {t.numero_processo && (
                          <p
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/processos?numero=${t.numero_processo}`);
                            }}
                            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 font-mono truncate"
                          >
                            <Landmark size={10} className="shrink-0" /> {t.numero_processo}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'text-[11px]',
                              t.status === 'atrasada' ? 'text-red-500 font-medium' : 'text-gray-400',
                            )}
                          >
                            {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                          </span>
                          {t.responsavel_id && nomeResponsavel(t.responsavel_id) && (
                            <span
                              title={nomeResponsavel(t.responsavel_id)}
                              className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-[9px] font-bold flex items-center justify-center shrink-0"
                            >
                              {iniciais(nomeResponsavel(t.responsavel_id)!)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {itens.length === 0 && (
                      <p className="text-xs text-gray-300 dark:text-gray-700 px-1 py-2 text-center">arraste tarefas aqui</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="space-y-2">
            {tarefasFiltradas.map((t) => (
              <li
                key={t._id}
                onClick={() => setTarefaEditando(t)}
                className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 cursor-pointer hover:border-brand-300 dark:hover:border-brand-800"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moverStatus(t._id, t.status === 'concluida' ? 'pendente' : 'concluida');
                  }}
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

                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm flex items-center gap-1', t.status === 'concluida' ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200')}>
                    {t.recorrencia && (
                              <span title="Tarefa recorrente" className="shrink-0 inline-flex">
                                <Repeat size={11} className="text-gray-300 dark:text-gray-600" />
                              </span>
                            )}
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
                  {t.status === 'concluida' && t.nota_conclusao && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic truncate">"{t.nota_conclusao}"</p>
                  )}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    remover(t);
                  }}
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

      {calculadoraAberta && <CalculadoraPrazo onFechar={() => setCalculadoraAberta(false)} />}
      {calculadoraMonetariaAberta && <CalculadoraAtualizacaoMonetaria onFechar={() => setCalculadoraMonetariaAberta(false)} />}

      {modalAberto && (
        <TarefaModal
          usuarios={usuarios}
          tarefas={tarefas}
          onFechar={() => setModalAberto(false)}
          onSalva={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}

      {tarefaEditando && (
        <TarefaModal
          tarefa={tarefaEditando}
          usuarios={usuarios}
          tarefas={tarefas}
          onFechar={() => setTarefaEditando(null)}
          onSalva={() => {
            setTarefaEditando(null);
            carregar();
          }}
          onExcluir={() => {
            setTarefaEditando(null);
            remover(tarefaEditando);
          }}
        />
      )}
    </>
  );
}

function TarefaModal({
  tarefa,
  usuarios,
  tarefas,
  onFechar,
  onSalva,
  onExcluir,
}: {
  tarefa?: Tarefa;
  usuarios: Usuario[];
  tarefas: Tarefa[];
  onFechar: () => void;
  onSalva: () => void;
  onExcluir?: () => void;
}) {
  const cargaPorUsuario = new Map<string, number>();
  for (const t of tarefas) {
    if (t.status === 'concluida') continue;
    if (t.responsavel_id) cargaPorUsuario.set(t.responsavel_id, (cargaPorUsuario.get(t.responsavel_id) ?? 0) + 1);
    for (const extra of t.responsaveis_adicionais ?? []) {
      cargaPorUsuario.set(extra, (cargaPorUsuario.get(extra) ?? 0) + 1);
    }
  }
  const menorCarga = usuarios.length > 0 ? Math.min(...usuarios.map((u) => cargaPorUsuario.get(u._id) ?? 0)) : 0;
  const sugeridoId = usuarios.find((u) => (cargaPorUsuario.get(u._id) ?? 0) === menorCarga)?._id;
  const editando = !!tarefa;
  const [form, setForm] = useState({
    titulo: tarefa?.titulo ?? '',
    descricao: tarefa?.descricao ?? '',
    data_vencimento: tarefa ? tarefa.data_vencimento.slice(0, 10) : '',
    prioridade: tarefa?.prioridade ?? 'media',
    status: tarefa?.status ?? ('pendente' as StatusTarefa),
    responsavel_id: tarefa?.responsavel_id ?? '',
    responsaveis_adicionais: tarefa?.responsaveis_adicionais ?? ([] as string[]),
    numero_processo: tarefa?.numero_processo ?? '',
    recorrencia: tarefa?.recorrencia ?? ('' as Tarefa['recorrencia'] | ''),
  });
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
      if (editando) {
        await atualizarTarefa(tarefa._id, {
          titulo: form.titulo,
          descricao: form.descricao || undefined,
          data_vencimento: new Date(form.data_vencimento).toISOString(),
          prioridade: form.prioridade,
          status: form.status,
          responsavel_id: form.responsavel_id || undefined,
          responsaveis_adicionais: form.responsaveis_adicionais,
          numero_processo: form.numero_processo || undefined,
          recorrencia: form.recorrencia || '',
        });
      } else {
        await criarTarefa({
          titulo: form.titulo,
          descricao: form.descricao || undefined,
          data_vencimento: new Date(form.data_vencimento).toISOString(),
          prioridade: form.prioridade,
          responsavel_id: form.responsavel_id || undefined,
          responsaveis_adicionais: form.responsaveis_adicionais,
          numero_processo: form.numero_processo || undefined,
          recorrencia: form.recorrencia || undefined,
        });
      }
      onSalva();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao salvar tarefa');
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
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{editando ? 'Editar tarefa' : 'Nova tarefa'}</p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
              <Landmark size={11} /> Número do processo (opcional)
            </span>
            <input
              value={form.numero_processo}
              onChange={(e) => setForm({ ...form, numero_processo: e.target.value })}
              placeholder="Número CNJ"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 font-mono"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Título</span>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Descrição (opcional)</span>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={2}
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
                onChange={(e) => setForm({ ...form, prioridade: e.target.value as Tarefa['prioridade'] })}
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
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
              <Repeat size={11} /> Repetir
            </span>
            <select
              value={form.recorrencia}
              onChange={(e) => setForm({ ...form, recorrencia: e.target.value as Tarefa['recorrencia'] | '' })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              <option value="">Não repetir</option>
              <option value="diaria">Diariamente</option>
              <option value="semanal">Semanalmente</option>
              <option value="mensal">Mensalmente</option>
              <option value="anual">Anualmente</option>
            </select>
            {form.recorrencia && (
              <span className="text-[11px] text-gray-400 mt-1 block">
                Ao concluir, uma nova tarefa igual será criada automaticamente na próxima data.
              </span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
                <User size={11} /> Responsável
              </span>
              <select
                value={form.responsavel_id}
                onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              >
                <option value="">Sem responsável</option>
                {usuarios.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.nome} ({cargaPorUsuario.get(u._id) ?? 0} tarefa{(cargaPorUsuario.get(u._id) ?? 0) === 1 ? '' : 's'})
                    {u._id === sugeridoId ? ' — menor carga' : ''}
                  </option>
                ))}
              </select>
              {!editando && sugeridoId && sugeridoId !== form.responsavel_id && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, responsavel_id: sugeridoId })}
                  className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline mt-1"
                >
                  Sugestão: {usuarios.find((u) => u._id === sugeridoId)?.nome} tem menos tarefas em aberto
                </button>
              )}
            </label>

            {usuarios.filter((u) => u._id !== form.responsavel_id).length > 0 && (
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
                  <Users size={11} /> Responsáveis extras
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {usuarios
                    .filter((u) => u._id !== form.responsavel_id)
                    .map((u) => {
                      const marcado = form.responsaveis_adicionais.includes(u._id);
                      return (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              responsaveis_adicionais: marcado
                                ? form.responsaveis_adicionais.filter((id) => id !== u._id)
                                : [...form.responsaveis_adicionais, u._id],
                            })
                          }
                          className={cn(
                            'text-xs px-2 py-1 rounded-full border',
                            marcado
                              ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-400'
                              : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400',
                          )}
                        >
                          {u.nome}
                        </button>
                      );
                    })}
                </div>
              </label>
            )}

            {editando && (
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as StatusTarefa })}
                  className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                >
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <div className="flex items-center gap-2">
            {editando && onExcluir && (
              <button
                onClick={onExcluir}
                className="p-2.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Excluir tarefa"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex-1 rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
