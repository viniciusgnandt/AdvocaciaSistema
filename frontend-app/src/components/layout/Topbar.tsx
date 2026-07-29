'use client';

import { Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Topbar({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-6 py-4">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">{titulo}</h1>
        {subtitulo && <p className="text-xs text-gray-400 dark:text-gray-500">{subtitulo}</p>}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5 text-sm text-gray-400 w-64">
          <Search size={14} />
          <span>Buscar processo, cliente…</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400">
            ⌘K
          </kbd>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
