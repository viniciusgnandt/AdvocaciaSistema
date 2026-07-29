'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Sistema claro por padrao - dark mode e opt-in explicito do usuario, nao segue o SO.
    const salvo = localStorage.getItem('trilva-theme');
    const prefereDark = salvo === 'dark';
    setDark(prefereDark);
    document.documentElement.classList.toggle('dark', prefereDark);
  }, []);

  const alternar = () => {
    const novo = !dark;
    setDark(novo);
    document.documentElement.classList.toggle('dark', novo);
    localStorage.setItem('trilva-theme', novo ? 'dark' : 'light');
  };

  return (
    <button
      onClick={alternar}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
