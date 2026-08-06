'use client';

import { X } from 'lucide-react';
import { type Processo } from '@/lib/api';

function formatarMoeda(valor?: number | null) {
  if (valor === undefined || valor === null) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const LABEL_STATUS: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
  arquivado: 'Arquivado',
};

const LABEL_HONORARIO: Record<string, string> = {
  fixo: 'Valor fixo',
  percentual: 'Percentual',
  exito: 'Êxito',
  misto: 'Misto',
};

function tituloPartes(p: Processo) {
  if (p.parte_ativa && p.parte_passiva) return `${p.parte_ativa} x ${p.parte_passiva}`;
  return p.parte_ativa ?? p.numero_cnj;
}

const LINHAS: { label: string; render: (p: Processo) => string }[] = [
  { label: 'Status', render: (p) => LABEL_STATUS[p.status] ?? p.status },
  { label: 'Tribunal', render: (p) => p.tribunal ?? '—' },
  { label: 'Classe', render: (p) => p.classe ?? '—' },
  { label: 'Fase processual', render: (p) => p.fase_processual ?? '—' },
  {
    label: 'Ajuizado em',
    render: (p) => (p.data_ajuizamento ? new Date(p.data_ajuizamento).toLocaleDateString('pt-BR') : '—'),
  },
  {
    label: 'Próxima audiência',
    render: (p) => (p.proxima_audiencia ? new Date(p.proxima_audiencia).toLocaleDateString('pt-BR') : '—'),
  },
  { label: 'Valor da causa', render: (p) => formatarMoeda(p.valor_causa) },
  { label: 'Honorários', render: (p) => (p.honorarios?.tipo ? LABEL_HONORARIO[p.honorarios.tipo] : '—') },
  { label: 'Advogado da parte contrária', render: (p) => p.advogado_parte_contraria ?? '—' },
  { label: 'Tags', render: (p) => (p.tags.length > 0 ? p.tags.join(', ') : '—') },
];

export function ComparadorProcessos({ processos, onFechar }: { processos: Processo[]; onFechar: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] bg-white dark:bg-gray-950 overflow-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur px-6 py-3.5">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Comparador de processos ({processos.length})</p>
        <button onClick={onFechar} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          <X size={16} /> Fechar
        </button>
      </div>

      <div className="p-6 overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 pb-3 pr-4 sticky left-0 bg-white dark:bg-gray-950 w-40">
                &nbsp;
              </th>
              {processos.map((p) => (
                <th key={p._id} className="text-left align-top pb-3 pr-6 min-w-[220px]">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tituloPartes(p)}</p>
                  <p className="font-mono text-xs text-gray-400 mt-0.5">{p.numero_cnj}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((linha) => (
              <tr key={linha.label} className="border-t border-gray-100 dark:border-gray-800">
                <td className="text-xs font-medium text-gray-400 py-3 pr-4 sticky left-0 bg-white dark:bg-gray-950 align-top">
                  {linha.label}
                </td>
                {processos.map((p) => (
                  <td key={p._id} className="text-sm text-gray-700 dark:text-gray-300 py-3 pr-6 align-top">
                    {linha.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
