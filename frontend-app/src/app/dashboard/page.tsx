'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckSquare,
  Gavel,
  Landmark,
  Users,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import {
  buscarAgenda,
  buscarResumo,
  listarClientes,
  listarProcessos,
  listarTarefas,
  usuarioLogado,
  type AgendaEvento,
  type Processo,
  type ResumoPublicacoes,
  type Tarefa,
} from '@/lib/api';
import { cn } from '@/lib/cn';

const PRIORIDADE_COR: Record<string, string> = {
  baixa: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
  media: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  alta: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  critica: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

export default function DashboardPage() {
  const [resumo, setResumo] = useState<ResumoPublicacoes | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [totalProcessosAtivos, setTotalProcessosAtivos] = useState(0);
  const [processosComAudiencia, setProcessosComAudiencia] = useState<Processo[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const nome = usuarioLogado()?.nome?.split(' ')[0] ?? '';

  useEffect(() => {
    const paraISODate = (d: Date) => d.toISOString().slice(0, 10);
    const hoje = new Date();
    const daqui14 = new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000);

    Promise.all([
      buscarResumo(),
      listarTarefas({ status: 'pendente' }),
      listarProcessos({ status: 'ativo' }),
      listarProcessos({ status: 'ativo_audiencia_agendada', ordenacao: 'audiencia' }),
      listarClientes(),
      buscarAgenda(paraISODate(hoje), paraISODate(daqui14)),
    ])
      .then(([r, t, pAtivos, pAudiencia, c, a]) => {
        setResumo(r);
        setTarefas(t);
        setTotalProcessosAtivos(pAtivos.itens.length);
        setProcessosComAudiencia(pAudiencia.itens);
        setTotalClientes(c.length);
        setEventos(a.eventos);
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'erro ao carregar dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const tarefasAtrasadas = tarefas.filter((t) => t.status === 'atrasada').length;
  const proximasTarefas = [...tarefas]
    .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
    .slice(0, 5);
  const proximasAudiencias = processosComAudiencia.slice(0, 5);
  const proximosEventos = eventos.slice(0, 5);

  return (
    <>
      <Topbar titulo="Dashboard" subtitulo={nome ? `Bom te ver de volta, ${nome}` : 'Visão geral do escritório'} />

      <main className="flex-1 px-6 py-6 space-y-6">
        {erro && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Bell} label="Publicações não lidas" value={loading ? '—' : (resumo?.naoLidas ?? 0)} tone="brand" />
          <StatCard icon={AlertTriangle} label="Urgentes" value={loading ? '—' : (resumo?.urgentes ?? 0)} tone="warning" />
          <StatCard icon={CheckSquare} label="Tarefas atrasadas" value={loading ? '—' : tarefasAtrasadas} tone="warning" />
          <StatCard icon={Gavel} label="Processos ativos" value={loading ? '—' : totalProcessosAtivos} />
          <StatCard icon={Users} label="Clientes" value={loading ? '—' : totalClientes} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Painel titulo="Próximos prazos" href="/tarefas" icone={CheckSquare} vazio="Nenhum prazo pendente." loading={loading}>
            {proximasTarefas.map((t) => (
              <li key={t._id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full shrink-0', PRIORIDADE_COR[t.prioridade])}>
                  {t.prioridade}
                </span>
              </li>
            ))}
          </Painel>

          <Painel titulo="Próximos eventos" href="/agenda" icone={Calendar} vazio="Nada agendado nos próximos 14 dias." loading={loading}>
            {proximosEventos.map((e, i) => (
              <li key={`${e.publicacao_id}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{e.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{e.numero_processo}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(e.data).toLocaleDateString('pt-BR')}
                </span>
              </li>
            ))}
          </Painel>

          <Painel titulo="Audiências marcadas" href="/processos?status=ativo_audiencia_agendada" icone={Landmark} vazio="Nenhuma audiência agendada." loading={loading}>
            {proximasAudiencias.map((p) => (
              <li key={p._id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.parte_ativa ?? p.numero_cnj}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{p.numero_cnj}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {p.proxima_audiencia && new Date(p.proxima_audiencia).toLocaleDateString('pt-BR')}
                </span>
              </li>
            ))}
          </Painel>
        </div>
      </main>
    </>
  );
}

function Painel({
  titulo,
  href,
  icone: Icon,
  vazio,
  loading,
  children,
}: {
  titulo: string;
  href: string;
  icone: React.ElementType;
  vazio: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  const temConteudo = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <Icon size={14} className="text-gray-400" />
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{titulo}</p>
        <Link href={href} className="ml-auto text-xs text-brand-600 dark:text-brand-400 hover:underline">
          ver tudo
        </Link>
      </div>
      {loading ? (
        <p className="px-4 py-6 text-sm text-gray-400">Carregando…</p>
      ) : temConteudo ? (
        <ul className="divide-y divide-gray-50 dark:divide-gray-800/50">{children}</ul>
      ) : (
        <p className="px-4 py-6 text-sm text-gray-400">{vazio}</p>
      )}
    </div>
  );
}
