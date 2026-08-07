'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Bell, CalendarClock, CheckSquare, Gavel } from 'lucide-react';
import { listarDocumentosVencendo, listarPublicacoes, listarProcessos, listarTarefas, type Publicacao, type Tarefa } from '@/lib/api';
import { cn } from '@/lib/cn';

type Notificacao = {
  id: string;
  tipo: 'publicacao' | 'tarefa' | 'processo_esquecido' | 'documento_vencendo';
  titulo: string;
  subtitulo: string;
  destino: string;
  critica: boolean;
};

const DIAS_PROCESSO_ESQUECIDO = 60;

async function carregarNotificacoes(): Promise<Notificacao[]> {
  const [publicacoesResp, tarefas, processosResp, documentosVencendo] = await Promise.all([
    listarPublicacoes({ status: 'nao_lida', urgencia: 'critica', limite: 8 }),
    listarTarefas({ atrasadas: true }),
    listarProcessos({ status: 'ativo' }),
    listarDocumentosVencendo(30).catch(() => []),
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

  const agora = Date.now();
  const doProcessosEsquecidos: Notificacao[] = processosResp.itens
    .filter((p) => {
      if (p.proxima_audiencia && new Date(p.proxima_audiencia).getTime() > agora) return false;
      if (!p.datajud_atualizado_em) return false;
      const dias = (agora - new Date(p.datajud_atualizado_em).getTime()) / 86_400_000;
      return dias > DIAS_PROCESSO_ESQUECIDO;
    })
    .slice(0, 8)
    .map((p) => ({
      id: `proc-${p._id}`,
      tipo: 'processo_esquecido' as const,
      titulo: p.parte_ativa ? `${p.parte_ativa}${p.parte_passiva ? ` x ${p.parte_passiva}` : ''}` : p.numero_cnj,
      subtitulo: `Sem movimentação há mais de ${DIAS_PROCESSO_ESQUECIDO} dias`,
      destino: `/processos?numero=${p.numero_cnj}`,
      critica: false,
    }));

  const doDocumentosVencendo: Notificacao[] = documentosVencendo.map((d) => {
    const vencido = new Date(d.data_validade!) < new Date();
    return {
      id: `doc-${d._id}`,
      tipo: 'documento_vencendo' as const,
      titulo: d.nome,
      subtitulo: vencido
        ? `Venceu em ${new Date(`${d.data_validade}T00:00:00`).toLocaleDateString('pt-BR')}`
        : `Vence em ${new Date(`${d.data_validade}T00:00:00`).toLocaleDateString('pt-BR')}`,
      destino: d.numero_processo ? `/processos?numero=${d.numero_processo}` : '/clientes',
      critica: vencido,
    };
  });

  return [...doPublicacoes, ...doProcessosEsquecidos, ...doDocumentosVencendo, ...doTarefas];
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
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-critical-500 border border-white dark:border-gray-900" />
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
                      n.critica ? 'bg-critical-50 dark:bg-critical-900/30 text-critical-600 dark:text-critical-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {n.tipo === 'publicacao' ? (
                      <AlertTriangle size={12} />
                    ) : n.tipo === 'processo_esquecido' ? (
                      <Gavel size={12} />
                    ) : n.tipo === 'documento_vencendo' ? (
                      <CalendarClock size={12} />
                    ) : (
                      <CheckSquare size={12} />
                    )}
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
