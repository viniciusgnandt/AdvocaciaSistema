'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Gavel, Landmark, Scale, Wallet } from 'lucide-react';
import { buscarPortal, type PortalDados } from '@/lib/api';
import { cn } from '@/lib/cn';

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_PROCESSO_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
  arquivado: 'Arquivado',
};

const STATUS_LANCAMENTO_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
};

export default function PortalClientePage() {
  const params = useParams<{ token: string }>();
  const [dados, setDados] = useState<PortalDados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    buscarPortal(params.token)
      .then(setDados)
      .catch((err) => setErro(err instanceof Error ? err.message : 'link inválido ou expirado'));
  }, [params.token]);

  if (erro) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Scale size={28} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Este link não é válido ou o acesso foi desativado.</p>
          <p className="text-xs text-gray-400 mt-1">Entre em contato com o escritório para obter um novo link.</p>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-400">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 sm:px-8">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Scale size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Portal do cliente</p>
            <p className="text-xs text-gray-400">{dados.cliente.nome}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 sm:px-8 space-y-6">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
            <Gavel size={13} /> Processos ({dados.processos.length})
          </h2>
          {dados.processos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum processo vinculado ainda.</p>
          ) : (
            <div className="space-y-3">
              {dados.processos.map((p) => (
                <div key={p.numero_cnj} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{p.numero_cnj}</p>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        p.status === 'ativo'
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
                      )}
                    >
                      {STATUS_PROCESSO_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{p.classe ?? 'Classe não identificada'}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Landmark size={11} /> {p.tribunal ?? '—'}
                  </p>
                  {p.proxima_audiencia && (
                    <p className="text-xs text-brand-600 dark:text-brand-400 mt-1.5">
                      Próxima audiência: {new Date(p.proxima_audiencia).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {p.ultimas_movimentacoes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Últimas movimentações</p>
                      {p.ultimas_movimentacoes.map((m, i) => (
                        <div key={i} className="text-xs text-gray-600 dark:text-gray-300">
                          <span className="text-gray-400">{new Date(m.data).toLocaleDateString('pt-BR')}</span> — {m.descricao}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {dados.documentos.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
              <FileText size={13} /> Documentos ({dados.documentos.length})
            </h2>
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {dados.documentos.map((d) => (
                <div key={d._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-700 dark:text-gray-300 truncate">{d.nome}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {dados.lancamentos.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
              <Wallet size={13} /> Financeiro ({dados.lancamentos.length})
            </h2>
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {dados.lancamentos.map((l) => (
                <div key={l._id} className="flex items-center justify-between px-4 py-2.5 text-sm gap-2">
                  <div className="min-w-0">
                    <p className="text-gray-700 dark:text-gray-300 truncate">{l.descricao}</p>
                    <p className="text-xs text-gray-400">{new Date(l.data_vencimento).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('font-semibold', l.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {l.tipo === 'receita' ? '+' : '-'} {formatarMoeda(l.valor)}
                    </p>
                    <p className="text-xs text-gray-400">{STATUS_LANCAMENTO_LABEL[l.status] ?? l.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
