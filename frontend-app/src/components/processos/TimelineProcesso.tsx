'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckSquare, Gavel, Wallet } from 'lucide-react';
import { listarLancamentos, listarPublicacoes, listarTarefas, type Movimentacao } from '@/lib/api';
import { cn } from '@/lib/cn';

type EventoTimeline = {
  data: Date;
  tipo: 'movimentacao' | 'publicacao' | 'tarefa' | 'financeiro';
  titulo: string;
  subtitulo?: string;
};

const ESTILO: Record<EventoTimeline['tipo'], { icon: typeof Gavel; cor: string }> = {
  movimentacao: { icon: Gavel, cor: 'bg-brand-500' },
  publicacao: { icon: Bell, cor: 'bg-amber-500' },
  tarefa: { icon: CheckSquare, cor: 'bg-violet-500' },
  financeiro: { icon: Wallet, cor: 'bg-emerald-500' },
};

const LABEL_TIPO: Record<EventoTimeline['tipo'], string> = {
  movimentacao: 'Movimentação',
  publicacao: 'Publicação',
  tarefa: 'Tarefa',
  financeiro: 'Financeiro',
};

export function TimelineProcesso({ numeroProcesso, movimentacoes }: { numeroProcesso: string; movimentacoes: Movimentacao[] }) {
  const [eventos, setEventos] = useState<EventoTimeline[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      listarPublicacoes({ busca: numeroProcesso, limite: 100 }).catch(() => ({ itens: [] })),
      listarTarefas({ numeroProcesso }).catch(() => []),
      listarLancamentos({ numeroProcesso }).catch(() => []),
    ])
      .then(([publicacoesResp, tarefas, lancamentos]) => {
        if (cancelado) return;
        const doMovimentacoes: EventoTimeline[] = movimentacoes.map((m) => ({
          data: new Date(m.data),
          tipo: 'movimentacao',
          titulo: m.descricao,
        }));
        const doPublicacoes: EventoTimeline[] = publicacoesResp.itens.map((p) => ({
          data: new Date(p.data_disponibilizacao),
          tipo: 'publicacao',
          titulo: p.tipo_comunicacao ?? 'Publicação',
          subtitulo: p.nome_orgao,
        }));
        const doTarefas: EventoTimeline[] = tarefas.map((t) => ({
          data: new Date(t.data_vencimento),
          tipo: 'tarefa',
          titulo: t.titulo,
          subtitulo: t.status === 'concluida' ? 'Concluída' : `Prazo · ${t.status}`,
        }));
        const doFinanceiro: EventoTimeline[] = lancamentos.map((l) => ({
          data: new Date(l.data_vencimento),
          tipo: 'financeiro',
          titulo: l.descricao,
          subtitulo: l.tipo === 'receita' ? 'Receita' : 'Despesa',
        }));

        setEventos(
          [...doMovimentacoes, ...doPublicacoes, ...doTarefas, ...doFinanceiro].sort(
            (a, b) => b.data.getTime() - a.data.getTime(),
          ),
        );
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'erro ao carregar timeline'));
    return () => {
      cancelado = true;
    };
  }, [numeroProcesso, movimentacoes]);

  if (erro) return <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>;
  if (!eventos) return <p className="text-sm text-gray-400">Carregando…</p>;
  if (eventos.length === 0) return <p className="text-sm text-gray-400">Nenhum evento encontrado para este processo ainda.</p>;

  return (
    <ol className="relative border-l border-gray-100 dark:border-gray-800 pl-4 space-y-4">
      {eventos.map((evento, i) => {
        const { icon: Icon, cor } = ESTILO[evento.tipo];
        return (
          <li key={i} className="ml-2">
            <span className={cn('absolute -left-[9px] w-4 h-4 rounded-full flex items-center justify-center', cor)}>
              <Icon size={9} className="text-white" />
            </span>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-800 dark:text-gray-200">{evento.titulo}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 shrink-0">
                {LABEL_TIPO[evento.tipo]}
              </span>
            </div>
            {evento.subtitulo && <p className="text-xs text-gray-400 dark:text-gray-500">{evento.subtitulo}</p>}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {evento.data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
