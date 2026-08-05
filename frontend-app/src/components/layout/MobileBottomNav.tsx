'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckSquare, Gavel, LayoutDashboard, Menu, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';

const ITENS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { href: '/processos', icon: Gavel, label: 'Processos' },
  { href: '/tarefas', icon: CheckSquare, label: 'Tarefas' },
  { href: '/financeiro', icon: Wallet, label: 'Financeiro' },
];

export function MobileBottomNav({ onAbrirMenu }: { onAbrirMenu: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur safe-bottom">
      {ITENS.map(({ href, icon: Icon, label }) => {
        const ativo = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium',
              ativo ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500',
            )}
          >
            <Icon size={19} />
            {label}
          </Link>
        );
      })}
      <button
        onClick={onAbrirMenu}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium text-gray-400 dark:text-gray-500"
      >
        <Menu size={19} />
        Mais
      </button>
    </nav>
  );
}
