'use client';

import { Search, X } from 'lucide-react';
import type { FiltrosPublicacoes } from '@/lib/api';

const STATUS_OPCOES = [
  { value: '', label: 'Todos os status' },
  { value: 'nao_lida', label: 'Não lida' },
  { value: 'lida', label: 'Lida' },
  { value: 'triada', label: 'Triada' },
  { value: 'vinculada', label: 'Vinculada' },
  { value: 'arquivada', label: 'Arquivada' },
];

const URGENCIA_OPCOES = [
  { value: '', label: 'Toda urgência' },
  { value: 'critica', label: 'Crítica' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

const CLASSIFICACAO_OPCOES = [
  { value: '', label: 'Todo tipo de ato' },
  { value: 'audiencia', label: 'Audiência' },
  { value: 'sentenca', label: 'Sentença' },
  { value: 'decisao', label: 'Decisão' },
  { value: 'despacho', label: 'Despacho' },
  { value: 'citacao', label: 'Citação' },
  { value: 'prazo', label: 'Prazo' },
  { value: 'embargos', label: 'Embargos' },
  { value: 'recurso', label: 'Recurso' },
  { value: 'penhora_bloqueio', label: 'Penhora/Bloqueio' },
  { value: 'outro', label: 'Outro' },
];

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FiltroBar({
  filtros,
  onChange,
  tribunais,
  tipos,
}: {
  filtros: FiltrosPublicacoes;
  onChange: (f: FiltrosPublicacoes) => void;
  tribunais: string[];
  tipos: string[];
}) {
  const set = (parcial: Partial<FiltrosPublicacoes>) => onChange({ ...filtros, ...parcial, pagina: 1 });
  const temFiltroAtivo = !!(
    filtros.status ||
    filtros.urgencia ||
    filtros.tribunal ||
    filtros.tipoComunicacao ||
    filtros.classificacao ||
    filtros.busca ||
    filtros.dataInicio ||
    filtros.dataFim
  );

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5 flex-1 min-w-[220px]">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={filtros.busca ?? ''}
            onChange={(e) => set({ busca: e.target.value })}
            placeholder="Buscar por processo, órgão ou texto…"
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
          />
        </div>

        <Select value={filtros.status ?? ''} onChange={(v) => set({ status: v })} options={STATUS_OPCOES} />
        <Select value={filtros.urgencia ?? ''} onChange={(v) => set({ urgencia: v })} options={URGENCIA_OPCOES} />
        <Select
          value={filtros.classificacao ?? ''}
          onChange={(v) => set({ classificacao: v })}
          options={CLASSIFICACAO_OPCOES}
        />

        {temFiltroAtivo && (
          <button
            onClick={() => onChange({ pagina: 1, limite: filtros.limite })}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5"
          >
            <X size={12} /> limpar tudo
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filtros.tribunal ?? ''}
          onChange={(v) => set({ tribunal: v })}
          options={[{ value: '', label: 'Todos os tribunais' }, ...tribunais.map((t) => ({ value: t, label: t }))]}
        />
        <Select
          value={filtros.tipoComunicacao ?? ''}
          onChange={(v) => set({ tipoComunicacao: v })}
          options={[{ value: '', label: 'Todos os tipos' }, ...tipos.map((t) => ({ value: t, label: t }))]}
        />

        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <span className="text-xs">De</span>
          <input
            type="date"
            value={filtros.dataInicio ?? ''}
            onChange={(e) => set({ dataInicio: e.target.value })}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
          />
          <span className="text-xs">até</span>
          <input
            type="date"
            value={filtros.dataFim ?? ''}
            onChange={(e) => set({ dataFim: e.target.value })}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
          />
        </div>
      </div>
    </div>
  );
}
