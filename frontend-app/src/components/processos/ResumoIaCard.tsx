'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { resumoProcessoIa, resumoClienteIa } from '@/lib/api';
import { cn } from '@/lib/cn';

export function ResumoIaCard({ id, tipo = 'processo' }: { id: string; tipo?: 'processo' | 'cliente' }) {
  const [resumo, setResumo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [pedido, setPedido] = useState(false);

  const buscar = tipo === 'processo' ? resumoProcessoIa : resumoClienteIa;

  const carregar = (regenerar: boolean) => {
    setPedido(true);
    setCarregando(true);
    buscar(id, regenerar)
      .then((r) => setResumo(r.resumo))
      .catch(() => setResumo(null))
      .finally(() => setCarregando(false));
  };

  if (!pedido) {
    return (
      <button
        onClick={() => carregar(false)}
        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 mb-4 w-full justify-center"
      >
        <Sparkles size={12} /> Gerar resumo com IA
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-100 dark:border-brand-900/40 bg-brand-50/50 dark:bg-brand-900/10 p-3 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-brand-700 dark:text-brand-400 flex items-center gap-1.5">
          <Sparkles size={12} /> Resumo IA
        </p>
        <button
          onClick={() => carregar(true)}
          disabled={carregando}
          className="text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300"
          title="Regenerar resumo"
        >
          <RefreshCw size={12} className={cn(carregando && 'animate-spin')} />
        </button>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5">
        {carregando ? 'Gerando resumo…' : resumo}
      </p>
    </div>
  );
}
