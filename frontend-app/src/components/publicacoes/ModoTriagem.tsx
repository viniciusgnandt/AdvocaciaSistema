'use client';

import { useEffect, useState } from 'react';
import { Archive, Check, Eye, X } from 'lucide-react';
import { ClassificacaoBadge, UrgenciaBadge } from '@/components/ui/Badge';
import type { Publicacao } from '@/lib/api';

function capitalizarNome(nome: string) {
  return nome
    .toLowerCase()
    .split(' ')
    .map((palavra) => (palavra.length > 2 ? palavra.charAt(0).toUpperCase() + palavra.slice(1) : palavra))
    .join(' ');
}

function tituloPartes(publicacao: Publicacao) {
  if (publicacao.parte_ativa && publicacao.parte_passiva) {
    return `${capitalizarNome(publicacao.parte_ativa)} x ${capitalizarNome(publicacao.parte_passiva)}`;
  }
  if (publicacao.parte_ativa) return capitalizarNome(publicacao.parte_ativa);
  return null;
}

export function ModoTriagem({
  itens,
  onAtualizar,
  onFechar,
}: {
  itens: Publicacao[];
  onAtualizar: (id: string, dados: Partial<Publicacao>) => void;
  onFechar: () => void;
}) {
  const [fila, setFila] = useState(itens);
  const [indice, setIndice] = useState(0);

  const atual = fila[indice];
  const restantes = fila.length - indice;

  const decidir = (status: 'lida' | 'triada' | 'arquivada') => {
    if (!atual) return;
    onAtualizar(atual._id, { status });
    setIndice((i) => i + 1);
  };

  const pular = () => setIndice((i) => i + 1);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
      else if (e.key.toLowerCase() === 'l') decidir('lida');
      else if (e.key.toLowerCase() === 't') decidir('triada');
      else if (e.key.toLowerCase() === 'a') decidir('arquivada');
      else if (e.key === 'ArrowRight' || e.key === ' ') pular();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, fila]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Triagem rápida {fila.length > 0 && `— ${Math.min(indice + 1, fila.length)} de ${fila.length}`}
          </p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        {!atual ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {restantes <= 0 && fila.length > 0 ? 'Tudo triado por aqui.' : 'Nenhuma publicação para triar.'}
            </p>
            <button
              onClick={onFechar}
              className="mt-4 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white transition"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 max-h-[50vh] overflow-y-auto">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-medium text-gray-600 dark:text-gray-300">
                  {atual.tribunal ?? '—'}
                </span>
                <span>{new Date(atual.data_disponibilizacao).toLocaleDateString('pt-BR')}</span>
                <ClassificacaoBadge valor={atual.classificacao} />
                <UrgenciaBadge valor={atual.urgencia} />
              </div>

              {tituloPartes(atual) ? (
                <>
                  <p className="mb-0.5 text-base font-semibold text-gray-800 dark:text-gray-200">{tituloPartes(atual)}</p>
                  <p className="mb-2 font-mono text-xs text-gray-400 dark:text-gray-500">{atual.numero_processo}</p>
                </>
              ) : (
                <p className="mb-2 font-mono text-sm text-gray-800 dark:text-gray-200">{atual.numero_processo}</p>
              )}
              {atual.nome_orgao && <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">{atual.nome_orgao}</p>}
              {atual.inteiro_teor_texto && (
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{atual.inteiro_teor_texto}</p>
              )}
            </div>

            <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <button
                onClick={() => decidir('lida')}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Check size={14} /> Lida <kbd className="ml-1 text-[10px] text-gray-400">L</kbd>
              </button>
              <button
                onClick={() => decidir('triada')}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Eye size={14} /> Triada <kbd className="ml-1 text-[10px] text-gray-400">T</kbd>
              </button>
              <button
                onClick={() => decidir('arquivada')}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Archive size={14} /> Arquivar <kbd className="ml-1 text-[10px] text-gray-400">A</kbd>
              </button>
              <button
                onClick={pular}
                className="ml-auto text-sm px-3 py-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Pular <kbd className="ml-1 text-[10px] text-gray-400">→</kbd>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
