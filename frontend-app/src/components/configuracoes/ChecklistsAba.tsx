'use client';

import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Plus, Trash2, X } from 'lucide-react';
import {
  atualizarChecklistTemplate,
  criarChecklistTemplate,
  excluirChecklistTemplate,
  listarChecklistTemplates,
  type ChecklistTemplate,
  type ItemChecklist,
} from '@/lib/api';

export function ChecklistsAba() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<ChecklistTemplate | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await listarChecklistTemplates());
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar checklists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const remover = async (t: ChecklistTemplate) => {
    if (!window.confirm(`Excluir o checklist "${t.nome}"?`)) return;
    try {
      await excluirChecklistTemplate(t._id);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao excluir checklist');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Templates de checklist</p>
          <p className="text-xs text-gray-400">
            Um conjunto de tarefas padrão que pode ser aplicado de uma vez a um processo (ex.: entrada de ação trabalhista)
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
        >
          <Plus size={14} /> Novo checklist
        </button>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {erro}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-400">
          Nenhum checklist criado ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t._id}
              onClick={() => setEditando(t)}
              className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 cursor-pointer hover:border-brand-300 dark:hover:border-brand-800"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <ListChecks size={14} className="text-brand-500" /> {t.nome}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remover(t);
                  }}
                  className="p-1 rounded text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{t.itens.length} item(ns) — {t.itens.map((i) => i.titulo).join(', ')}</p>
            </li>
          ))}
        </ul>
      )}

      {modalAberto && (
        <ChecklistModal
          onFechar={() => setModalAberto(false)}
          onSalvo={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
      {editando && (
        <ChecklistModal
          template={editando}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function ChecklistModal({
  template,
  onFechar,
  onSalvo,
}: {
  template?: ChecklistTemplate;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const editando = !!template;
  const [nome, setNome] = useState(template?.nome ?? '');
  const [itens, setItens] = useState<ItemChecklist[]>(template?.itens ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const adicionarItem = () => setItens([...itens, { titulo: '', dias_prazo: 7 }]);
  const atualizarItem = (i: number, patch: Partial<ItemChecklist>) =>
    setItens(itens.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removerItem = (i: number) => setItens(itens.filter((_, idx) => idx !== i));

  const salvar = async () => {
    if (!nome.trim() || itens.length === 0 || itens.some((i) => !i.titulo.trim())) {
      setErro('Informe um nome e preencha o título de todos os itens.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      if (editando) await atualizarChecklistTemplate(template._id, { nome, itens });
      else await criarChecklistTemplate({ nome, itens });
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao salvar checklist');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div onClick={onFechar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{editando ? 'Editar checklist' : 'Novo checklist'}</p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nome do checklist</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Entrada de ação trabalhista"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Tarefas</span>
            <div className="space-y-2">
              {itens.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item.titulo}
                    onChange={(e) => atualizarItem(i, { titulo: e.target.value })}
                    placeholder="Título da tarefa"
                    className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="number"
                    value={item.dias_prazo}
                    onChange={(e) => atualizarItem(i, { dias_prazo: Number(e.target.value) })}
                    title="Prazo em dias"
                    className="w-16 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-2 text-gray-900 dark:text-gray-100"
                  />
                  <button onClick={() => removerItem(i)} className="p-2 rounded-lg text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={adicionarItem} className="mt-2 text-xs text-brand-600 dark:text-brand-400 hover:underline">
              + Adicionar tarefa
            </button>
          </div>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar checklist'}
          </button>
        </div>
      </div>
    </div>
  );
}
