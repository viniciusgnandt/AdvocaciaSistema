'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';
import { Sidebar } from './Sidebar';

const ROTAS_PUBLICAS = ['/login', '/registro'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const rotaPublica = ROTAS_PUBLICAS.includes(pathname);
  const [pronto, setPronto] = useState(false);

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

  if (rotaPublica) return <>{children}</>;
  if (!pronto) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
