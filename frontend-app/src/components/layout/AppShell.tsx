'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Scale } from 'lucide-react';
import { getToken } from '@/lib/api';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';

const ROTAS_PUBLICAS = ['/login', '/registro', '/status'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const rotaPublica = ROTAS_PUBLICAS.includes(pathname) || pathname.startsWith('/portal/');
  const [pronto, setPronto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (rotaPublica) {
      setPronto(true);
      return;
    }
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setPronto(true);
  }, [pathname, rotaPublica, router]);

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  if (rotaPublica) return <>{children}</>;
  if (!pronto) return null;

  return (
    <div className="flex min-h-[100dvh]">
      <Sidebar mobileOpen={menuAberto} onClose={() => setMenuAberto(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-4 py-3 safe-top">
          <button
            onClick={() => setMenuAberto(true)}
            className="p-1.5 -ml-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center shrink-0">
              <Scale size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Trilva</span>
          </div>
        </header>

        <div className="flex-1 pb-16 md:pb-0">{children}</div>

        <MobileBottomNav onAbrirMenu={() => setMenuAberto(true)} />
      </div>
    </div>
  );
}
