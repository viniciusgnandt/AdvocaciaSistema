'use client';

import type { ReactNode } from 'react';

/** Ilustração de linha simples e neutra (uma pilha de papéis com uma lupa), reaproveitada
 * em toda listagem vazia do app - deliberadamente abstrata pra caber em qualquer contexto
 * (processos, clientes, tarefas, publicações...) sem parecer fora de lugar. */
function IlustracaoVazia() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="24" y="20" width="56" height="72" rx="4" className="fill-gray-50 dark:fill-gray-800/60 stroke-gray-200 dark:stroke-gray-700" strokeWidth="1.5" />
      <rect x="34" y="34" width="36" height="3" rx="1.5" className="fill-gray-200 dark:fill-gray-700" />
      <rect x="34" y="44" width="36" height="3" rx="1.5" className="fill-gray-200 dark:fill-gray-700" />
      <rect x="34" y="54" width="24" height="3" rx="1.5" className="fill-gray-200 dark:fill-gray-700" />
      <circle cx="82" cy="66" r="18" className="fill-brand-50 dark:fill-brand-900/20 stroke-brand-300 dark:stroke-brand-700" strokeWidth="2" />
      <path d="M82 58v16M74 66h16" className="stroke-brand-400 dark:stroke-brand-500" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-14 px-6 flex flex-col items-center text-center">
      <IlustracaoVazia />
      <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">{titulo}</p>
      {descricao && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 max-w-xs">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}
