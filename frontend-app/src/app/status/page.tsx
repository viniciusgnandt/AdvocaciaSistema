'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Scale, XCircle } from 'lucide-react';
import { verificarSaudeApi } from '@/lib/api';
import { cn } from '@/lib/cn';

type Verificacao = { ok: boolean; latenciaMs: number; verificadoEm: Date };

export default function StatusPage() {
  const [verificacao, setVerificacao] = useState<Verificacao | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const checar = () => {
      setVerificando(true);
      const inicio = performance.now();
      verificarSaudeApi()
        .then((r) => setVerificacao({ ok: r.status === 'ok', latenciaMs: Math.round(performance.now() - inicio), verificadoEm: new Date() }))
        .catch(() => setVerificacao({ ok: false, latenciaMs: 0, verificadoEm: new Date() }))
        .finally(() => setVerificando(false));
    };
    checar();
    const intervalo = setInterval(checar, 30_000);
    return () => clearInterval(intervalo);
  }, []);

  const operacional = verificacao?.ok ?? false;

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950 flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Scale size={16} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Trilva — Status</span>
        </div>

        <div
          className={cn(
            'rounded-2xl border p-6 text-center',
            verificando
              ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
              : operacional
                ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40'
                : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40',
          )}
        >
          {verificando ? (
            <p className="text-sm text-gray-400">Verificando…</p>
          ) : operacional ? (
            <>
              <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Todos os sistemas operacionais</p>
            </>
          ) : (
            <>
              <XCircle size={32} className="mx-auto text-red-500 mb-2" />
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Instabilidade detectada</p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-gray-600 dark:text-gray-300">API</span>
            <span className={cn('flex items-center gap-1.5 font-medium', operacional ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', operacional ? 'bg-green-500' : 'bg-red-500')} />
              {operacional ? 'Operacional' : 'Fora do ar'}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-gray-600 dark:text-gray-300">Banco de dados</span>
            <span className={cn('flex items-center gap-1.5 font-medium', operacional ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', operacional ? 'bg-green-500' : 'bg-red-500')} />
              {operacional ? 'Conectado' : 'Indisponível'}
            </span>
          </div>
          {verificacao && (
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-gray-600 dark:text-gray-300">Tempo de resposta</span>
              <span className="text-gray-400">{verificacao.latenciaMs} ms</span>
            </div>
          )}
        </div>

        {verificacao && (
          <p className="text-center text-xs text-gray-400">
            Última verificação: {verificacao.verificadoEm.toLocaleTimeString('pt-BR')} — atualiza automaticamente a cada 30s
          </p>
        )}
      </div>
    </div>
  );
}
