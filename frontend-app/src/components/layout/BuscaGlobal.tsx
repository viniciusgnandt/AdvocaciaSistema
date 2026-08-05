'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gavel, Search, UserRound, X } from 'lucide-react';
import { listarClientes, listarProcessos, type Cliente, type Processo } from '@/lib/api';

export function BuscaGlobal() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAberto(true);
      }
      if (e.key === 'Escape') setAberto(false);
    };
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, []);

  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 50);
  }, [aberto]);

  useEffect(() => {
    if (!aberto || termo.trim().length < 2) {
      setClientes([]);
      setProcessos([]);
      return;
    }
    setBuscando(true);
    const timeout = setTimeout(() => {
      Promise.all([
        listarClientes(termo).catch(() => []),
        listarProcessos({ busca: termo }).catch(() => ({ itens: [] as Processo[] })),
      ])
        .then(([c, p]) => {
          setClientes(c.slice(0, 6));
          setProcessos((p as { itens: Processo[] }).itens.slice(0, 6));
        })
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [termo, aberto]);

  const irPara = (destino: string) => {
    setAberto(false);
    setTermo('');
    router.push(destino);
  };

  const semResultado = termo.trim().length >= 2 && !buscando && clientes.length === 0 && processos.length === 0;

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5 text-sm text-gray-400 w-64"
      >
        <Search size={14} />
        <span>Buscar processo, cliente…</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400">
          ⌘K
        </kbd>
      </button>

      <button
        onClick={() => setAberto(true)}
        className="sm:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Buscar"
      >
        <Search size={18} />
      </button>

      {aberto && (
        <div
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 pt-20 sm:pt-32 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-3">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar processo, cliente…"
                className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-gray-100"
              />
              <button onClick={() => setAberto(false)} className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={15} />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {termo.trim().length < 2 && (
                <p className="px-4 py-6 text-center text-xs text-gray-400">Digite ao menos 2 letras para buscar.</p>
              )}
              {buscando && <p className="px-4 py-6 text-center text-xs text-gray-400">Buscando…</p>}
              {semResultado && <p className="px-4 py-6 text-center text-xs text-gray-400">Nada encontrado para "{termo}".</p>}

              {clientes.length > 0 && (
                <div className="py-2">
                  <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Clientes</p>
                  {clientes.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => irPara(`/clientes?id=${c._id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <UserRound size={14} className="text-gray-400 shrink-0" />
                      <span className="truncate text-gray-800 dark:text-gray-200">{c.nome}</span>
                    </button>
                  ))}
                </div>
              )}

              {processos.length > 0 && (
                <div className="py-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Processos</p>
                  {processos.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => irPara(`/processos?numero=${p.numero_cnj}`)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Gavel size={14} className="text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-gray-800 dark:text-gray-200 font-mono text-xs">{p.numero_cnj}</p>
                        {p.parte_ativa && <p className="truncate text-xs text-gray-400">{p.parte_ativa}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
