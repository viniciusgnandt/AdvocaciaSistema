'use client';

import { ArrowRight, X } from 'lucide-react';
import { ClassificacaoBadge, StatusBadge, UrgenciaBadge } from '@/components/ui/Badge';
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

export function PublicacaoModal({
  publicacao,
  onFechar,
  onIrParaProcesso,
}: {
  publicacao: Publicacao;
  onFechar: () => void;
  onIrParaProcesso: (numeroProcesso: string) => void;
}) {
  const advogados = publicacao.advogados_destinatarios?.filter((a) => a.nome).map((a) => a.nome).join(', ');

  return (
    <div
      onClick={onFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in"
      >
        <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <div className="min-w-0">
            {tituloPartes(publicacao) && (
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-0.5">{tituloPartes(publicacao)}</p>
            )}
            <p className="font-mono text-xs text-gray-400">{publicacao.numero_processo}</p>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-medium text-gray-600 dark:text-gray-300">
              {publicacao.tribunal ?? '—'}
            </span>
            <span>{new Date(publicacao.data_disponibilizacao).toLocaleDateString('pt-BR')}</span>
            {publicacao.tipo_comunicacao && <span>· {publicacao.tipo_comunicacao}</span>}
            <ClassificacaoBadge valor={publicacao.classificacao} />
            <UrgenciaBadge valor={publicacao.urgencia} />
            <StatusBadge valor={publicacao.status} />
          </div>

          {publicacao.nome_orgao && <p className="text-sm text-gray-500 dark:text-gray-400">{publicacao.nome_orgao}</p>}

          {publicacao.inteiro_teor_texto && (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {publicacao.inteiro_teor_texto}
            </p>
          )}

          {advogados && <p className="text-xs text-gray-400 dark:text-gray-500">Advogados: {advogados}</p>}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4">
          <button
            onClick={() => onIrParaProcesso(publicacao.numero_processo)}
            className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
          >
            Ir para o processo <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
