'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Bell, CheckSquare } from 'lucide-react';
import { listarPublicacoes, listarTarefas, type Publicacao, type Tarefa } from '@/lib/api';
import { cn } from '@/lib/cn';

type Notificacao = {
  id: string;
  tipo: 'publicacao' | 'tarefa';
  titulo: string;
  subtitulo: string;
  destino: string;
  critica: boolean;
};

async function carregarNotificacoes(): Promise<Notificacao[]> {
  const [publicacoesResp, tarefas] = await Promise.all([
    listarPublicacoes({ status: 'nao_lida', urgencia: 'critica', limite: 8 }),
    listarTarefas({ atrasadas: true }),
  ]);

  const doPublicacoes: Notificacao[] = publicacoesResp.itens.map((p: Publicacao) => ({
    id: `pub-${p._id}`,
    tipo: 'publicacao',
    titulo: p.tipo_comunicacao ?? 'Publicação urgente',
    subtitulo: p.nome_orgao ?? p.numero_processo,
    destino: '/publicacoes',
    critica: true,
  }));

  const doTarefas: Notificacao[] = tarefas.slice(0, 8).map((t: Tarefa) => ({
    id: `tar-${t._id}`,
    tipo: 'tarefa',
    titulo: t.titulo,
    subtitulo: `Venceu em ${new Date(t.data_vencimento).toLocaleDateString('pt-BR')}`,
    destino: '/tarefas',
    critica: false,
  }));

  return [...doPublicacoes, ...doTarefas];
}

export function NotificacoesBell() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    carregarNotificacoes()
      .then(setNotificacoes)
      .catch(() => undefined);
    const intervalo = setInterval(() => {
      carregarNotificacoes()
        .then(setNotificacoes)
        .catch(() => undefined);
    }, 60_000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  const total = notificacoes.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Notificações"
      >
        <Bell size={17} />
        {total > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white dark:border-gray-900" />
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-1 z-40 w-80 max-w-[90vw] rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden animate-scale-in">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificações</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">Tudo em dia por aqui.</p>
            ) : (
              notificacoes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setAberto(false);
                    router.push(n.destino);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span
                    className={cn(
                      'mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                      n.critica ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {n.tipo === 'publicacao' ? <AlertTriangle size={12} /> : <CheckSquare size={12} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{n.titulo}</p>
                    <p className="text-xs text-gray-400 truncate">{n.subtitulo}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
