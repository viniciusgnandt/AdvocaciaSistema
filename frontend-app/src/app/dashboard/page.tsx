'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  Cake,
  Calendar,
  CheckSquare,
  Gavel,
  Landmark,
  Printer,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import {
  buscarAgenda,
  buscarResumo,
  listarClientes,
  listarLancamentos,
  listarProcessos,
  listarTarefas,
  usuarioLogado,
  type AgendaEvento,
  type Cliente,
  type Lancamento,
  type Processo,
  type ResumoPublicacoes,
  type Tarefa,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { exportarPdf } from '@/lib/exportar';

function formatarNumeroCnj(numero: string): string {
  if (numero.length !== 20) return numero;
  return `${numero.slice(0, 7)}-${numero.slice(7, 9)}.${numero.slice(9, 13)}.${numero.slice(13, 14)}.${numero.slice(14, 16)}.${numero.slice(16)}`;
}

function imprimirAudienciasDaSemana(processos: Processo[]) {
  const linhas = processos.map((p) => [
    p.proxima_audiencia
      ? new Date(p.proxima_audiencia).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : '—',
    p.parte_ativa && p.parte_passiva ? `${p.parte_ativa} x ${p.parte_passiva}` : (p.parte_ativa ?? '—'),
    formatarNumeroCnj(p.numero_cnj),
    p.tribunal ?? '—',
    p.orgao_julgador ?? '—',
  ]);
  exportarPdf('Audiências da semana', ['Data/hora', 'Partes', 'Processo', 'Tribunal', 'Órgão julgador'], linhas, 'audiencias-da-semana');
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function chaveSemanaAtual() {
  const hoje = new Date();
  const inicioAno = new Date(hoje.getFullYear(), 0, 1);
  const semana = Math.ceil(((hoje.getTime() - inicioAno.getTime()) / 86_400_000 + inicioAno.getDay() + 1) / 7);
  return `${hoje.getFullYear()}-W${semana}`;
}

function ResumoSemanal({ tarefas, lancamentos }: { tarefas: Tarefa[]; lancamentos: Lancamento[] }) {
  const [visivel, setVisivel] = useState(false);
  const chave = chaveSemanaAtual();

  useEffect(() => {
    const visto = localStorage.getItem('trilva_resumo_semana_visto');
    setVisivel(visto !== chave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fechar = () => {
    localStorage.setItem('trilva_resumo_semana_visto', chave);
    setVisivel(false);
  };

  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const concluidas = tarefas.filter((t) => t.status === 'concluida' && t.concluida_em && new Date(t.concluida_em) >= seteDiasAtras).length;
  const perdidas = tarefas.filter((t) => t.status === 'atrasada' && new Date(t.data_vencimento) >= seteDiasAtras && new Date(t.data_vencimento) <= new Date()).length;
  const vencendoSemana = tarefas.filter((t) => t.status !== 'concluida' && new Date(t.data_vencimento) >= new Date() && new Date(t.data_vencimento) <= new Date(Date.now() + 7 * 86_400_000)).length;

  const naoCancelados = lancamentos.filter((l) => l.status !== 'cancelado');
  const recebido = naoCancelados
    .filter((l) => l.tipo === 'receita' && l.status === 'pago' && new Date(l.data_vencimento) >= seteDiasAtras)
    .reduce((acc, l) => acc + l.valor, 0);
  const pago = naoCancelados
    .filter((l) => l.tipo === 'despesa' && l.status === 'pago' && new Date(l.data_vencimento) >= seteDiasAtras)
    .reduce((acc, l) => acc + l.valor, 0);

  if (!visivel) return null;

  return (
    <div className="rounded-xl border border-brand-200 dark:border-brand-900 bg-brand-50/60 dark:bg-brand-900/10 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-brand-600 dark:text-brand-400" /> Resumo dos últimos 7 dias
        </p>
        <button onClick={fechar} className="p-1 rounded text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{concluidas}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tarefas concluídas</p>
        </div>
        <div>
          <p className={cn('text-lg font-semibold', perdidas > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100')}>{perdidas}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Prazos perdidos</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">{formatarMoeda(recebido)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Recebido</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatarMoeda(pago)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pago</p>
        </div>
      </div>
      {vencendoSemana > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          De olho: {vencendoSemana} tarefa{vencendoSemana > 1 ? 's' : ''} vencendo nos próximos 7 dias.
        </p>
      )}
    </div>
  );
}

function ehHoje(data: string | Date) {
  const d = new Date(data);
  const hoje = new Date();
  return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate();
}

type ItemFeedDiario = {
  id: string;
  tipo: 'tarefa' | 'audiencia' | 'prazo';
  titulo: string;
  subtitulo?: string;
  hora?: string;
  href: string;
};

function FeedDiario({ tarefas, eventos }: { tarefas: Tarefa[]; eventos: AgendaEvento[] }) {
  const itens: ItemFeedDiario[] = [
    ...tarefas
      .filter((t) => t.status !== 'concluida' && ehHoje(t.data_vencimento))
      .map((t) => ({
        id: `tar-${t._id}`,
        tipo: 'tarefa' as const,
        titulo: t.titulo,
        subtitulo: t.numero_processo,
        hora: new Date(t.data_vencimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        href: '/tarefas',
      })),
    ...eventos
      .filter((e) => ehHoje(e.data))
      .map((e) => ({
        id: `evt-${e.publicacao_id}`,
        tipo: e.tipo,
        titulo: e.titulo,
        subtitulo: e.numero_processo,
        hora: new Date(e.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        href: '/publicacoes',
      })),
  ].sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''));

  const ICONE: Record<ItemFeedDiario['tipo'], typeof CheckSquare> = {
    tarefa: CheckSquare,
    audiencia: Gavel,
    prazo: AlertTriangle,
  };

  const hojeFormatado = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <Calendar size={14} className="text-brand-500" /> Hoje
        </p>
        <p className="text-xs text-gray-400 capitalize">{hojeFormatado}</p>
      </div>
      {itens.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">Nada pendente para hoje. 🎉</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {itens.map((item) => {
            const Icone = ICONE[item.tipo];
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <span
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                    item.tipo === 'tarefa'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                  )}
                >
                  <Icone size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.titulo}</p>
                  {item.subtitulo && <p className="text-xs text-gray-400 font-mono truncate">{item.subtitulo}</p>}
                </div>
                {item.hora && <span className="text-xs text-gray-400 shrink-0">{item.hora}</span>}
              </Link>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function proximosAniversarios(clientes: Cliente[]) {
  const hoje = new Date();
  const hojeMesDia = hoje.getMonth() * 31 + hoje.getDate();

  return clientes
    .filter((c) => c.tipo === 'pf' && c.data_nascimento)
    .map((c) => {
      const [, mesStr, diaStr] = c.data_nascimento!.split('-');
      const mes = Number(mesStr) - 1;
      const dia = Number(diaStr);
      let diasAte = new Date(hoje.getFullYear(), mes, dia).getTime() - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
      diasAte = Math.round(diasAte / (24 * 60 * 60 * 1000));
      if (diasAte < 0) diasAte += 365;
      return { cliente: c, mes, dia, diasAte };
    })
    .filter((a) => a.diasAte <= 30)
    .sort((a, b) => a.diasAte - b.diasAte);
}

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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const nome = usuarioLogado()?.nome?.split(' ')[0] ?? '';

  useEffect(() => {
    const paraISODate = (d: Date) => d.toISOString().slice(0, 10);
    const hoje = new Date();
    const daqui14 = new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000);

    Promise.all([
      buscarResumo(),
      listarTarefas({}),
      listarProcessos({ status: 'ativo' }),
      listarProcessos({ status: 'ativo_audiencia_agendada', ordenacao: 'audiencia' }),
      listarClientes(),
      buscarAgenda(paraISODate(hoje), paraISODate(daqui14)),
      listarLancamentos({}),
    ])
      .then(([r, t, pAtivos, pAudiencia, c, a, l]) => {
        setResumo(r);
        setTarefas(t);
        setTotalProcessosAtivos(pAtivos.itens.length);
        setProcessosComAudiencia(pAudiencia.itens);
        setTotalClientes(c.length);
        setClientes(c);
        setEventos(a.eventos);
        setLancamentos(l);
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'erro ao carregar dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const tarefasAtrasadas = tarefas.filter((t) => t.status === 'atrasada').length;
  const proximasTarefas = tarefas
    .filter((t) => t.status === 'pendente' || t.status === 'em_andamento' || t.status === 'atrasada')
    .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
    .slice(0, 5);
  const proximasAudiencias = processosComAudiencia.slice(0, 5);
  const daqui7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const audienciasDaSemana = processosComAudiencia.filter(
    (p) => p.proxima_audiencia && new Date(p.proxima_audiencia) <= daqui7Dias,
  );
  const proximosEventos = eventos.slice(0, 5);
  const aniversarios = proximosAniversarios(clientes).slice(0, 5);

  return (
    <>
      <Topbar titulo="Dashboard" subtitulo={nome ? `Bom te ver de volta, ${nome}` : 'Visão geral do escritório'} />

      <main className="relative flex-1 px-6 py-6 space-y-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        {erro && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        {!loading && <ResumoSemanal tarefas={tarefas} lancamentos={lancamentos} />}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Bell} label="Publicações não lidas" value={loading ? '—' : (resumo?.naoLidas ?? 0)} tone="brand" />
          <StatCard icon={AlertTriangle} label="Urgentes" value={loading ? '—' : (resumo?.urgentes ?? 0)} tone="warning" />
          <StatCard icon={CheckSquare} label="Tarefas atrasadas" value={loading ? '—' : tarefasAtrasadas} tone="warning" />
          <StatCard icon={Gavel} label="Processos ativos" value={loading ? '—' : totalProcessosAtivos} />
          <StatCard icon={Users} label="Clientes" value={loading ? '—' : totalClientes} />
        </div>

        {!loading && <FeedDiario tarefas={tarefas} eventos={eventos} />}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
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

          <Painel
            titulo="Audiências marcadas"
            href="/processos?status=ativo_audiencia_agendada"
            icone={Landmark}
            vazio="Nenhuma audiência agendada."
            loading={loading}
            acao={
              audienciasDaSemana.length > 0 && (
                <button
                  onClick={() => imprimirAudienciasDaSemana(audienciasDaSemana)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  title="Imprimir relatório da semana"
                >
                  <Printer size={13} />
                </button>
              )
            }
          >
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

          <Painel titulo="Aniversários" href="/clientes" icone={Cake} vazio="Nenhum aniversário nos próximos 30 dias." loading={loading}>
            {aniversarios.map(({ cliente, mes, dia, diasAte }) => (
              <li key={cliente._id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{cliente.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {diasAte === 0 ? 'Hoje!' : diasAte === 1 ? 'Amanhã' : `Em ${diasAte} dias`}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {String(dia).padStart(2, '0')}/{String(mes + 1).padStart(2, '0')}
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
  acao,
  children,
}: {
  titulo: string;
  href: string;
  icone: React.ElementType;
  vazio: string;
  loading: boolean;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  const temConteudo = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <Icon size={14} className="text-gray-400" />
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{titulo}</p>
        <div className="ml-auto flex items-center gap-3">
          {acao}
          <Link href={href} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
            ver tudo
          </Link>
        </div>
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
