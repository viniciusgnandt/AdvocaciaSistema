'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Calendar,
  CheckSquare,
  Gavel,
  LayoutDashboard,
  LogOut,
  Scale,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { buscarPerfil, buscarTenant, limparSessao, tenantLogado, usuarioLogado, type SessaoTenant, type SessaoUsuario } from '@/lib/api';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', pronto: true },
  { href: '/publicacoes', icon: Bell, label: 'Publicações', pronto: true },
  { href: '/processos', icon: Gavel, label: 'Processos', pronto: true },
  { href: '/tarefas', icon: CheckSquare, label: 'Tarefas', pronto: true },
  { href: '/clientes', icon: Users, label: 'Clientes', pronto: true },
  { href: '/agenda', icon: Calendar, label: 'Agenda', pronto: true },
  { href: '/financeiro', icon: Wallet, label: 'Financeiro', pronto: true },
];

const LABEL_PERFIL: Record<string, string> = { admin: 'Admin', advogado: 'Advogado(a)', assistente: 'Assistente' };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [usuario, setUsuario] = useState<SessaoUsuario | null>(null);
  const [tenant, setTenant] = useState<SessaoTenant | null>(null);

  useEffect(() => {
    setUsuario(usuarioLogado());
    setTenant(tenantLogado());
  }, [pathname]);

  useEffect(() => {
    // o cache local (localStorage) so e' escrito no login - se o nome do
    // escritorio/usuario mudar depois (ex.: em Configuracoes, ou corrigido direto no
    // banco), a sidebar ficava mostrando o valor antigo ate' relogar. Busca o valor
    // atual da API uma vez ao montar e sincroniza o cache, sem exigir relogin.
    buscarTenant()
      .then((t) => {
        const atualizado = { id: t._id, nome_escritorio: t.nome_escritorio, status: t.status };
        setTenant(atualizado);
        localStorage.setItem('trilva_tenant', JSON.stringify(atualizado));
      })
      .catch(() => undefined);

    buscarPerfil()
      .then((u) => {
        const atualizado = { id: u._id, nome: u.nome, email: u.email, perfil: u.perfil, oab: u.oab };
        setUsuario(atualizado);
        localStorage.setItem('trilva_usuario', JSON.stringify(atualizado));
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sair = () => {
    limparSessao();
    router.push('/login');
  };

  const iniciais = usuario?.nome
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <aside className="hidden md:flex flex-col shrink-0 w-60 h-screen sticky top-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Scale size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
              {tenant?.nome_escritorio ?? 'Trilva'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">Escritório digital</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-3 overflow-y-auto">
        <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">
          Menu
        </p>
        <div className="space-y-1">
          {NAV.map(({ href, icon: Icon, label, pronto }) => {
            const ativo = pathname === href;
            return (
              <Link
                key={href}
                href={pronto ? href : '#'}
                aria-disabled={!pronto}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  ativo
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                    : pronto
                      ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                      : 'text-gray-300 dark:text-gray-700 cursor-not-allowed',
                )}
              >
                <Icon size={16} className="shrink-0" />
                {label}
                {!pronto && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                    em breve
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-3 pt-1 pb-2 border-t border-gray-100 dark:border-gray-800">
        <Link
          href="/configuracoes"
          className={cn(
            'flex items-center gap-3 px-3 py-2 mt-2 rounded-lg text-sm font-medium transition-colors',
            pathname === '/configuracoes'
              ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
          )}
        >
          <Settings size={16} className="shrink-0" />
          Configurações
        </Link>

        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {iniciais ?? '—'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{usuario?.nome ?? 'Visitante'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {usuario ? LABEL_PERFIL[usuario.perfil] : ''}
              {usuario?.oab ? ` · OAB ${usuario.oab}` : ''}
            </p>
          </div>
          <button
            onClick={sair}
            title="Sair"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
