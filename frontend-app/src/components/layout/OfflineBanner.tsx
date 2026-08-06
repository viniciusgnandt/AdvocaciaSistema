'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    setOffline(!navigator.onLine);
    const aoFicarOffline = () => setOffline(true);
    const aoFicarOnline = () => setOffline(false);
    window.addEventListener('offline', aoFicarOffline);
    window.addEventListener('online', aoFicarOnline);
    return () => {
      window.removeEventListener('offline', aoFicarOffline);
      window.removeEventListener('online', aoFicarOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 text-xs font-medium shadow-lg animate-fade-in">
      <WifiOff size={13} />
      Sem conexão — mostrando a última versão salva
    </div>
  );
}
