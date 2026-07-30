'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  atualizarMonitoramento,
  criarMonitoramentoOab,
  excluirMonitoramento,
  listarMonitoramentos,
  puxarMonitoramento,
  type Monitoramento,
} from '@/lib/api';
import { cn } from '@/lib/cn';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export function OabsMonitoradasCartao() {
  const [itens, setItens] = useState<Monitoramento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [puxando, setPuxando] = useState<string | null>(null);

  const [numeroOab, setNumeroOab] = useState('');
  const [ufOab, setUfOab] = useState('SP');
  const [adicionando, setAdicionando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const todos = await listarMonitoramentos();
      setItens(todos.filter((m) => m.tipo === 'oab'));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar OABs monitoradas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const adicionar = async () => {
    const numero = numeroOab.replace(/\D/g, '');
    if (!numero) {
      setErroForm('Informe o número da OAB.');
      return;
    }
    setAdicionando(true);
    setErroForm(null);
    try {
      await criarMonitoramentoOab(numero, ufOab);
      setNumeroOab('');
      await carregar();
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : 'erro ao adicionar OAB');
    } finally {
      setAdicionando(false);
    }
  };

  const alternarAtivo = async (m: Monitoramento) => {
    setItens((atual) => atual.map((i) => (i._id === m._id ? { ...i, ativo: !i.ativo } : i)));
    try {
      await atualizarMonitoramento(m._id, { ativo: !m.ativo });
    } catch {
      carregar();
    }
  };

  const remover = async (m: Monitoramento) => {
    if (!window.confirm(`Parar de monitorar a OAB ${m.valor}/${m.oab_uf}? As publicações já recebidas continuam salvas.`)) return;
    setItens((atual) => atual.filter((i) => i._id !== m._id));
    try {
      await excluirMonitoramento(m._id);
    } catch {
      carregar();
    }
  };

  const puxarAgora = async (m: Monitoramento) => {
    setPuxando(m._id);
    try {
      await puxarMonitoramento(m._id);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao buscar publicações');
    } finally {
      setPuxando(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">OABs monitoradas</p>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">
        Publicações são buscadas automaticamente para cada OAB cadastrada aqui — pode adicionar mais de uma.
      </p>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {erro}
        </div>
      )}

      <div className="flex items-end gap-2 mb-4">
        <label className="block flex-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Número da OAB</span>
          <input
            value={numeroOab}
            onChange={(e) => setNumeroOab(e.target.value)}
            placeholder="123456"
            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">UF</span>
          <select
            value={ufOab}
            onChange={(e) => setUfOab(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
          >
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={adicionar}
          disabled={adicionando}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 shrink-0"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>
      {erroForm && <p className="text-xs text-red-600 dark:text-red-400 mb-3">{erroForm}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : itens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-400">
          Nenhuma OAB monitorada ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {itens.map((m) => (
            <li
              key={m._id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
                  OAB {m.valor}/{m.oab_uf}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  {m.ultima_execucao_status === 'erro' && (
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertTriangle size={10} /> falhou na última busca
                    </span>
                  )}
                  {m.ultima_execucao_status === 'sucesso' && m.ultima_execucao_em && (
                    <span>última busca em {new Date(m.ultima_execucao_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  )}
                  {!m.ultima_execucao_em && <span>ainda não buscou publicações</span>}
                </p>
              </div>

              <button
                onClick={() => puxarAgora(m)}
                disabled={puxando === m._id}
                title="Buscar publicações agora"
                className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 shrink-0"
              >
                <RefreshCw size={14} className={puxando === m._id ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={() => alternarAtivo(m)}
                title={m.ativo ? 'Pausar monitoramento' : 'Reativar monitoramento'}
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-1 rounded-full border shrink-0 transition-colors',
                  m.ativo
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700',
                )}
              >
                {m.ativo && <Check size={11} />}
                {m.ativo ? 'Ativo' : 'Pausado'}
              </button>

              <button
                onClick={() => remover(m)}
                title="Remover"
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 dark:hover:text-red-400 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
