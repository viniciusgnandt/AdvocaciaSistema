import { cn } from '@/lib/cn';

const urgenciaVariants: Record<string, string> = {
  baixa: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  media: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  alta: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  critica: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
};

const statusVariants: Record<string, string> = {
  nao_lida: 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800',
  lida: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  triada: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  vinculada: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  arquivada: 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700',
};

const labels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
  nao_lida: 'Não lida',
  lida: 'Lida',
  triada: 'Triada',
  vinculada: 'Vinculada',
  arquivada: 'Arquivada',
};

const classificacaoVariants: Record<string, string> = {
  audiencia: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  sentenca: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  decisao: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  despacho: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  citacao: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  prazo: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  embargos: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  recurso: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  penhora_bloqueio: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  outro: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

const classificacaoLabels: Record<string, string> = {
  audiencia: 'Audiência',
  sentenca: 'Sentença',
  decisao: 'Decisão',
  despacho: 'Despacho',
  citacao: 'Citação',
  prazo: 'Prazo',
  embargos: 'Embargos',
  recurso: 'Recurso',
  penhora_bloqueio: 'Penhora/Bloqueio',
  outro: 'Outro',
};

export function ClassificacaoBadge({ valor }: { valor: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        classificacaoVariants[valor] ?? classificacaoVariants.outro,
      )}
    >
      {classificacaoLabels[valor] ?? valor}
    </span>
  );
}

export function UrgenciaBadge({ valor }: { valor: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        urgenciaVariants[valor] ?? urgenciaVariants.baixa,
      )}
    >
      {labels[valor] ?? valor}
    </span>
  );
}

export function StatusBadge({ valor }: { valor: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        statusVariants[valor] ?? statusVariants.lida,
      )}
    >
      {labels[valor] ?? valor}
    </span>
  );
}
