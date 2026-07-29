'use client';

import { useState } from 'react';
import { Archive, Check, Eye, MoreVertical, ShieldAlert } from 'lucide-react';
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

export function PublicacaoItem({
  publicacao,
  onAbrir,
  onAtualizar,
  selecionada = false,
  onToggleSelecao,
}: {
  publicacao: Publicacao;
  onAbrir: (p: Publicacao) => void;
  onAtualizar: (id: string, dados: Partial<Publicacao>) => void;
  selecionada?: boolean;
  onToggleSelecao?: (id: string) => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const advogados = publicacao.advogados_destinatarios?.filter((a) => a.nome).map((a) => a.nome).join(', ');

  return (
    <li
      onClick={() => onAbrir(publicacao)}
      className={`relative rounded-xl border p-4 hover:shadow-sm transition-all cursor-pointer flex gap-3 ${
        selecionada
          ? 'border-brand-300 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-900/10'
          : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-brand-300 dark:hover:border-brand-800'
      }`}
    >
      {onToggleSelecao && (
        <input
          type="checkbox"
          checked={selecionada}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelecao(publicacao._id)}
          className="mt-1 shrink-0 rounded border-gray-300 dark:border-gray-700"
        />
      )}
      <div className="min-w-0 flex-1">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-medium text-gray-600 dark:text-gray-300">
          {publicacao.tribunal ?? '—'}
        </span>
        <span>{new Date(publicacao.data_disponibilizacao).toLocaleDateString('pt-BR')}</span>
        {publicacao.tipo_comunicacao && <span>· {publicacao.tipo_comunicacao}</span>}
        <div className="ml-auto flex items-center gap-2">
          <ClassificacaoBadge valor={publicacao.classificacao} />
          <UrgenciaBadge valor={publicacao.urgencia} />
          <StatusBadge valor={publicacao.status} />

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <MoreVertical size={14} />
            </button>
            {menuAberto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(false)} />
                <div className="absolute right-0 top-7 z-20 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-1 animate-scale-in">
                  <MenuItem
                    icon={Check}
                    label="Marcar como lida"
                    onClick={() => {
                      onAtualizar(publicacao._id, { status: 'lida' });
                      setMenuAberto(false);
                    }}
                  />
                  <MenuItem
                    icon={Eye}
                    label="Marcar como triada"
                    onClick={() => {
                      onAtualizar(publicacao._id, { status: 'triada' });
                      setMenuAberto(false);
                    }}
                  />
                  <MenuItem
                    icon={ShieldAlert}
                    label="Marcar urgência crítica"
                    onClick={() => {
                      onAtualizar(publicacao._id, { urgencia: 'critica' });
                      setMenuAberto(false);
                    }}
                  />
                  <MenuItem
                    icon={Archive}
                    label="Arquivar"
                    onClick={() => {
                      onAtualizar(publicacao._id, { status: 'arquivada' });
                      setMenuAberto(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {tituloPartes(publicacao) ? (
        <>
          <p className="mb-0.5 text-sm font-medium text-gray-800 dark:text-gray-200">{tituloPartes(publicacao)}</p>
          <p className="mb-1 font-mono text-xs text-gray-400 dark:text-gray-500">{publicacao.numero_processo}</p>
        </>
      ) : (
        <p className="mb-1 font-mono text-sm text-gray-800 dark:text-gray-200">{publicacao.numero_processo}</p>
      )}
      {publicacao.nome_orgao && <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">{publicacao.nome_orgao}</p>}
      {publicacao.inteiro_teor_texto && (
        <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{publicacao.inteiro_teor_texto}</p>
      )}
      {advogados && <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Advogados: {advogados}</p>}
      </div>
    </li>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Check;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <Icon size={14} className="shrink-0" />
      {label}
    </button>
  );
}
