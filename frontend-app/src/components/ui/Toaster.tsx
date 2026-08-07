'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { inscrever, type ToastItem } from '@/lib/toast';

const DURACAO_MS = 3500;

export function Toaster() {
  const [itens, setItens] = useState<ToastItem[]>([]);

  useEffect(() => {
    return inscrever((item) => {
      setItens((atual) => [...atual, item]);
      setTimeout(() => {
        setItens((atual) => atual.filter((i) => i.id !== item.id));
      }, DURACAO_MS);
    });
  }, []);

  if (itens.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end">
      {itens.map((item) => (
        <div
          key={item.id}
          className={
            'flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-xl text-sm animate-fade-in max-w-sm ' +
            (item.tipo === 'sucesso'
              ? 'bg-white dark:bg-gray-900 border-green-200 dark:border-green-900 text-gray-800 dark:text-gray-200'
              : 'bg-white dark:bg-gray-900 border-critical-200 dark:border-critical-900 text-gray-800 dark:text-gray-200')
          }
        >
          {item.tipo === 'sucesso' ? (
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
          ) : (
            <XCircle size={16} className="text-critical-500 shrink-0" />
          )}
          <span className="truncate">{item.mensagem}</span>
        </div>
      ))}
    </div>
  );
}
