'use client';

import { useEffect } from 'react';
import { Building2, Calendar, DollarSign, Landmark, Presentation, Scale, X } from 'lucide-react';
import { type Processo } from '@/lib/api';

function formatarMoeda(valor?: number | null) {
  if (valor === undefined || valor === null) return null;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const LABEL_STATUS: Record<string, string> = {
  ativo: 'Em andamento',
  suspenso: 'Suspenso',
  arquivado: 'Arquivado',
  encerrado: 'Encerrado',
};

export function ModoApresentacao({
  processo,
  titulo,
  numeroFormatado,
  onFechar,
}: {
  processo: Processo;
  titulo: string;
  numeroFormatado: string;
  onFechar: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onFechar]);

  const movimentacoesRecentes = [...processo.movimentacoes]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 8);

  return (
    <div className="fixed inset-0 z-[80] bg-white dark:bg-gray-950 overflow-y-auto print:static">
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-10 sm:py-16">
        <button
          onClick={onFechar}
          className="fixed top-5 right-5 print:hidden flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
        >
          <X size={15} /> Fechar (Esc)
        </button>

        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-6 print:hidden">
          <Presentation size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">Modo apresentação</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-gray-100 text-balance">{titulo}</h1>
        <p className="font-mono text-base text-gray-400 dark:text-gray-500 mt-2">{numeroFormatado}</p>

        <div className="mt-3 inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
          {LABEL_STATUS[processo.status] ?? processo.status}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
          {processo.tribunal && (
            <div className="flex items-start gap-3">
              <Landmark size={18} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Tribunal</p>
                <p className="text-base text-gray-800 dark:text-gray-200">{processo.tribunal}</p>
              </div>
            </div>
          )}
          {processo.orgao_julgador && (
            <div className="flex items-start gap-3">
              <Building2 size={18} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Órgão julgador</p>
                <p className="text-base text-gray-800 dark:text-gray-200">{processo.orgao_julgador}</p>
              </div>
            </div>
          )}
          {processo.data_ajuizamento && (
            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Ajuizado em</p>
                <p className="text-base text-gray-800 dark:text-gray-200">
                  {new Date(processo.data_ajuizamento).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}
          {formatarMoeda(processo.valor_causa) && (
            <div className="flex items-start gap-3">
              <DollarSign size={18} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Valor da causa</p>
                <p className="text-base text-gray-800 dark:text-gray-200">{formatarMoeda(processo.valor_causa)}</p>
              </div>
            </div>
          )}
          {processo.proxima_audiencia && (
            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Próxima audiência</p>
                <p className="text-base text-gray-800 dark:text-gray-200">
                  {new Date(processo.proxima_audiencia).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}
          {processo.fase_processual && (
            <div className="flex items-start gap-3">
              <Scale size={18} className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Fase processual</p>
                <p className="text-base text-gray-800 dark:text-gray-200">{processo.fase_processual}</p>
              </div>
            </div>
          )}
        </div>

        {movimentacoesRecentes.length > 0 && (
          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Andamento recente</p>
            <ol className="relative border-l border-gray-200 dark:border-gray-800 ml-1.5 space-y-6">
              {movimentacoesRecentes.map((m, i) => (
                <li key={i} className="ml-5">
                  <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-brand-500 mt-1.5" />
                  <p className="text-base text-gray-800 dark:text-gray-200">{m.descricao}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(m.data).toLocaleDateString('pt-BR')}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
