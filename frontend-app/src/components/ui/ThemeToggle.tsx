'use client';

import { useEffect, useState } from 'react';
import { Clock, Moon, Sun } from 'lucide-react';

type ModoTema = 'light' | 'dark' | 'auto';

// horario "noturno" padrao para o modo automatico - das 19h as 7h
const HORA_ESCURECE = 19;
const HORA_CLAREIA = 7;

function ehHorarioNoturno() {
  const hora = new Date().getHours();
  return hora >= HORA_ESCURECE || hora < HORA_CLAREIA;
}

function aplicarTema(modo: ModoTema) {
  const escuro = modo === 'dark' || (modo === 'auto' && ehHorarioNoturno());
  document.documentElement.classList.toggle('dark', escuro);
  return escuro;
}

export function ThemeToggle() {
  const [modo, setModo] = useState<ModoTema>('light');
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    // Sistema claro por padrao - dark mode e opt-in explicito do usuario, nao segue o SO.
    const salvo = localStorage.getItem('trilva-theme');
    const modoInicial: ModoTema = salvo === 'dark' || salvo === 'auto' ? salvo : 'light';
    setModo(modoInicial);
    setEscuro(aplicarTema(modoInicial));
  }, []);

  useEffect(() => {
    if (modo !== 'auto') return;
    // reavalia a cada minuto - o horario de virada nao precisa de precisao maior que isso
    const intervalo = setInterval(() => setEscuro(aplicarTema('auto')), 60_000);
    return () => clearInterval(intervalo);
  }, [modo]);

  const alternar = () => {
    const proximo: ModoTema = modo === 'light' ? 'dark' : modo === 'dark' ? 'auto' : 'light';
    setModo(proximo);
    setEscuro(aplicarTema(proximo));
    localStorage.setItem('trilva-theme', proximo);
  };

  const titulo =
    modo === 'light'
      ? 'Tema claro — clique para escuro'
      : modo === 'dark'
        ? 'Tema escuro — clique para automático'
        : `Automático (escuro das ${HORA_ESCURECE}h às ${HORA_CLAREIA}h) — clique para claro`;

  return (
    <button
      onClick={alternar}
      title={titulo}
      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
    >
      {modo === 'auto' ? <Clock size={16} /> : escuro ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
