'use client';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BuscaGlobal } from './BuscaGlobal';

export function Topbar({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-4 py-3 sm:px-6 sm:py-4">
      <div className="min-w-0">
        <h1 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 truncate">{titulo}</h1>
        {subtitulo && <p className="text-xs text-gray-400 dark:text-gray-500">{subtitulo}</p>}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <BuscaGlobal />
        <ThemeToggle />
      </div>
    </header>
  );
}
