'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DESTINOS: { tecla: string; rota: string; label: string }[] = [
  { tecla: 'd', rota: '/dashboard', label: 'Dashboard' },
  { tecla: 'u', rota: '/publicacoes', label: 'Publicações' },
  { tecla: 'p', rota: '/processos', label: 'Processos' },
  { tecla: 't', rota: '/tarefas', label: 'Tarefas' },
  { tecla: 'c', rota: '/clientes', label: 'Clientes' },
  { tecla: 'a', rota: '/agenda', label: 'Agenda' },
  { tecla: 'f', rota: '/financeiro', label: 'Financeiro' },
  { tecla: 'r', rota: '/relatorios', label: 'Relatórios' },
];

function alvoEhCampoDeTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  const tag = alvo.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo.isContentEditable;
}

export function AtalhosTeclado() {
  const router = useRouter();
  const [aguardandoG, setAguardandoG] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (alvoEhCampoDeTexto(e.target)) return;

      if (ajudaAberta && (e.key === 'Escape' || e.key === '?')) {
        setAjudaAberta(false);
        return;
      }
      if (ajudaAberta) return;

      if (aguardandoG) {
        setAguardandoG(false);
        clearTimeout(timeout);
        const destino = DESTINOS.find((d) => d.tecla === e.key.toLowerCase());
        if (destino) {
          e.preventDefault();
          router.push(destino.rota);
        }
        return;
      }

      if (e.key.toLowerCase() === 'g') {
        setAguardandoG(true);
        timeout = setTimeout(() => setAguardandoG(false), 1200);
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setAjudaAberta(true);
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearTimeout(timeout);
    };
  }, [aguardandoG, ajudaAberta, router]);

  if (!ajudaAberta) return null;

  return (
    <div
      onClick={() => setAjudaAberta(false)}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl p-5 animate-scale-in"
      >
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Atalhos de teclado</p>
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Busca global</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400">⌘K</kbd>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Esta ajuda</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400">?</kbd>
          </div>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Ir para (pressione G, depois a letra)</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {DESTINOS.map((d) => (
            <div key={d.rota} className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{d.label}</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400">
                G {d.tecla.toUpperCase()}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
