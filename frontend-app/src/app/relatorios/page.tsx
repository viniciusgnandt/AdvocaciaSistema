'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock,
  DollarSign,
  Gavel,
  Landmark,
  ListChecks,
  Percent,
  PieChart as PieChartIcon,
  Scale,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import {
  listarClientes,
  listarLancamentos,
  listarProcessos,
  listarTarefas,
  listarUsuarios,
  type Cliente,
  type Lancamento,
  type Processo,
  type Tarefa,
  type Usuario,
} from '@/lib/api';
import { cn } from '@/lib/cn';

const CORES = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ultimosMeses(qtd: number): { chave: string; label: string }[] {
  const resultado: { chave: string; label: string }[] = [];
  const agora = new Date();
  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    resultado.push({
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    });
  }
  return resultado;
}

function mesAtualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type Categoria = 'processos' | 'financeiro' | 'tarefas' | 'clientes';

const CATEGORIAS: { id: Categoria; label: string; icon: typeof Gavel }[] = [
  { id: 'processos', label: 'Processos', icon: Gavel },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet },
  { id: 'tarefas', label: 'Tarefas', icon: ListChecks },
  { id: 'clientes', label: 'Clientes', icon: Users },
];

export default function RelatoriosPage() {
  const [categoria, setCategoria] = useState<Categoria>('processos');
  const [processos, setProcessos] = useState<Processo[] | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[] | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarProcessos(), listarTarefas(), listarLancamentos(), listarUsuarios(), listarClientes()])
      .then(([procResp, tarefasResp, lancResp, usuariosResp, clientesResp]) => {
        setProcessos(procResp.itens);
        setTarefas(tarefasResp);
        setLancamentos(lancResp);
        setUsuarios(usuariosResp);
        setClientes(clientesResp);
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'erro ao carregar relatórios'));
  }, []);

  const carregando = !processos || !tarefas || !lancamentos || !usuarios || !clientes;

  const saudeEscritorio = useMemo(() => {
    if (!processos || !tarefas || !lancamentos) return null;

    const totalTarefas = tarefas.length;
    const taxaConclusao = totalTarefas > 0 ? (tarefas.filter((t) => t.status === 'concluida').length / totalTarefas) * 100 : 100;

    const naoCancelados = lancamentos.filter((l) => l.status !== 'cancelado');
    const taxaInadimplencia = naoCancelados.length > 0 ? (naoCancelados.filter((l) => l.status === 'atrasado').length / naoCancelados.length) * 100 : 0;

    const mesAtual = mesAtualISO();
    const saldoMes =
      naoCancelados.filter((l) => l.tipo === 'receita' && l.status === 'pago' && l.data_vencimento.slice(0, 7) === mesAtual).reduce((a, l) => a + l.valor, 0) -
      naoCancelados.filter((l) => l.tipo === 'despesa' && l.status === 'pago' && l.data_vencimento.slice(0, 7) === mesAtual).reduce((a, l) => a + l.valor, 0);

    const seisDezenas = new Date();
    seisDezenas.setDate(seisDezenas.getDate() - 60);
    const ativos = processos.filter((p) => p.status === 'ativo');
    const taxaParados = ativos.length > 0 ? (ativos.filter((p) => p.datajud_atualizado_em && new Date(p.datajud_atualizado_em) < seisDezenas).length / ativos.length) * 100 : 0;

    const pontos =
      Math.min(taxaConclusao, 100) * 0.3 +
      Math.max(0, 100 - taxaInadimplencia * 2) * 0.3 +
      (saldoMes >= 0 ? 100 : Math.max(0, 100 + saldoMes / 100)) * 0.2 +
      Math.max(0, 100 - taxaParados) * 0.2;

    return Math.round(Math.max(0, Math.min(100, pontos)));
  }, [processos, tarefas, lancamentos]);

  return (
    <>
      <Topbar titulo="Relatórios" subtitulo="Visão consolidada de processos, tarefas, financeiro e clientes" />

      <main className="flex-1 px-4 py-6 sm:px-6 space-y-5">
        {erro && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        {saudeEscritorio !== null && <HealthMeter score={saudeEscritorio} />}

        <CategoriaDropdown categoria={categoria} onChange={setCategoria} />

        {carregando ? (
          <p className="text-sm text-gray-400">Carregando…</p>
        ) : (
          <>
            {categoria === 'processos' && <RelatorioProcessos processos={processos} />}
            {categoria === 'financeiro' && <RelatorioFinanceiro lancamentos={lancamentos} processos={processos} usuarios={usuarios} />}
            {categoria === 'tarefas' && <RelatorioTarefas tarefas={tarefas} usuarios={usuarios} />}
            {categoria === 'clientes' && <RelatorioClientes clientes={clientes} processos={processos} />}
          </>
        )}
      </main>
    </>
  );
}

function HealthMeter({ score }: { score: number }) {
  const cor = score >= 75 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  const corFundo = score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const label = score >= 75 ? 'Saudável' : score >= 50 ? 'Atenção' : 'Crítico';
  const mensagem =
    score >= 75
      ? 'O escritório está com indicadores saudáveis. Continue acompanhando.'
      : score >= 50
        ? 'Alguns indicadores merecem atenção — confira os alertas por categoria.'
        : 'Vários indicadores abaixo do esperado. Vale revisar tarefas atrasadas, inadimplência e processos parados.';

  return (
    <div className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
      <div className="relative w-20 h-20 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-gray-800" />
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            strokeWidth="3"
            strokeDasharray={`${score} ${100 - score}`}
            strokeLinecap="round"
            className={cor}
            stroke="currentColor"
            style={{ transition: 'stroke-dasharray 0.7s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-xl font-extrabold', cor)}>{score}</span>
          <span className="text-[9px] font-semibold text-gray-400 uppercase">/100</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('text-sm font-bold', cor)}>Saúde do escritório</span>
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full text-white', corFundo)}>{label}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{mensagem}</p>
        <details className="mt-1.5">
          <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 select-none">
            Como é calculada esta pontuação?
          </summary>
          <div className="mt-1 space-y-0.5 text-[10px] text-gray-400 dark:text-gray-500">
            <p>• Taxa de conclusão de tarefas — 30 pts</p>
            <p>• Taxa de inadimplência (invertida) — 30 pts</p>
            <p>• Saldo financeiro do mês — 20 pts</p>
            <p>• Processos ativos sem atualização há 60+ dias (invertido) — 20 pts</p>
          </div>
        </details>
      </div>
    </div>
  );
}

function CategoriaDropdown({ categoria, onChange }: { categoria: Categoria; onChange: (c: Categoria) => void }) {
  const [aberto, setAberto] = useState(false);
  const atual = CATEGORIAS.find((c) => c.id === categoria)!;
  const AtualIcon = atual.icon;

  return (
    <div className="relative w-fit">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <AtualIcon size={15} className="text-brand-600 dark:text-brand-400" />
        {atual.label}
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAberto(false)} />
          <div className="absolute left-0 top-full mt-1 z-40 w-48 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
            {CATEGORIAS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  onChange(id);
                  setAberto(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left',
                  id === categoria
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                )}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{children}</div>;
}

function Kpi({ icon: Icon, label, value, tone = 'default' }: { icon: typeof Gavel; label: string; value: string | number; tone?: 'default' | 'brand' | 'warning' | 'danger' | 'success' }) {
  const toneClasses = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    brand: 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
    warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    success: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  }[tone];

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', toneClasses)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">{value}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{label}</p>
      </div>
    </div>
  );
}

type Insight = { mensagem: string; variante: 'success' | 'warning' | 'danger' | 'info' };

const INSIGHT_ESTILO: Record<Insight['variante'], string> = {
  success: 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300',
  warning: 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  danger: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
  info: 'border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300',
};

const INSIGHT_ICONE: Record<Insight['variante'], typeof AlertTriangle> = {
  success: CheckSquare,
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: PieChartIcon,
};

function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {insights.map((insight, i) => {
        const Icon = INSIGHT_ICONE[insight.variante];
        return (
          <div key={i} className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', INSIGHT_ESTILO[insight.variante])}>
            <Icon size={15} className="shrink-0 mt-0.5" />
            <span>{insight.mensagem}</span>
          </div>
        );
      })}
    </div>
  );
}

function Cartao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{titulo}</p>
      {subtitulo && <p className="text-xs text-gray-400 mb-2">{subtitulo}</p>}
      {children}
    </div>
  );
}

function maisFrequente(valores: (string | undefined)[]): string {
  const contagem = new Map<string, number>();
  valores.forEach((v) => {
    if (!v) return;
    contagem.set(v, (contagem.get(v) ?? 0) + 1);
  });
  let melhor = '—';
  let max = 0;
  contagem.forEach((qtd, chave) => {
    if (qtd > max) {
      max = qtd;
      melhor = chave;
    }
  });
  return melhor;
}

// ---------------------------------------------------------------------------
// Processos
// ---------------------------------------------------------------------------

function RelatorioProcessos({ processos }: { processos: Processo[] }) {
  const kpis = useMemo(() => {
    const total = processos.length;
    const ativos = processos.filter((p) => p.status === 'ativo').length;
    const suspensos = processos.filter((p) => p.status === 'suspenso').length;
    const encerrados = processos.filter((p) => p.status === 'encerrado').length;
    const arquivados = processos.filter((p) => p.status === 'arquivado').length;
    const mesAtual = mesAtualISO();
    const novosEsteMes = processos.filter((p) => p.data_ajuizamento?.slice(0, 7) === mesAtual).length;
    const comValor = processos.filter((p) => p.valor_causa);
    const valorTotal = comValor.reduce((acc, p) => acc + (p.valor_causa ?? 0), 0);
    const ticketMedio = comValor.length > 0 ? valorTotal / comValor.length : 0;
    const comAudiencia = processos.filter((p) => p.proxima_audiencia && new Date(p.proxima_audiencia) > new Date()).length;
    const provisorios = processos.filter((p) => p.provisorio).length;

    return { total, ativos, suspensos, encerrados, arquivados, novosEsteMes, valorTotal, ticketMedio, comAudiencia, provisorios };
  }, [processos]);

  const porStatus = useMemo(() => {
    const contagem = new Map<string, number>();
    processos.forEach((p) => contagem.set(p.status, (contagem.get(p.status) ?? 0) + 1));
    const LABEL: Record<string, string> = { ativo: 'Ativo', suspenso: 'Suspenso', encerrado: 'Encerrado', arquivado: 'Arquivado' };
    return Array.from(contagem.entries()).map(([status, total]) => ({ nome: LABEL[status] ?? status, total }));
  }, [processos]);

  const porTribunal = useMemo(() => {
    const contagem = new Map<string, number>();
    processos.forEach((p) => {
      const chave = p.tribunal ?? 'Não identificado';
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    });
    return Array.from(contagem.entries())
      .map(([tribunal, total]) => ({ nome: tribunal, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [processos]);

  const tribunalTop = porTribunal[0]?.nome ?? '—';
  const classeTop = maisFrequente(processos.map((p) => p.classe));

  const insights = useMemo<Insight[]>(() => {
    const lista: Insight[] = [];
    const seisDezenas = new Date();
    seisDezenas.setDate(seisDezenas.getDate() - 60);
    const parados = processos.filter(
      (p) => p.status === 'ativo' && p.datajud_atualizado_em && new Date(p.datajud_atualizado_em) < seisDezenas,
    ).length;
    if (parados > 0) {
      lista.push({ mensagem: `${parados} processo${parados > 1 ? 's' : ''} ativo${parados > 1 ? 's' : ''} sem atualização há mais de 60 dias — vale conferir.`, variante: 'warning' });
    }
    if (kpis.comAudiencia > 0) {
      lista.push({ mensagem: `${kpis.comAudiencia} processo${kpis.comAudiencia > 1 ? 's' : ''} com audiência futura agendada.`, variante: 'info' });
    }
    if (kpis.novosEsteMes === 0) {
      lista.push({ mensagem: 'Nenhum processo novo ajuizado este mês.', variante: 'warning' });
    } else {
      lista.push({ mensagem: `${kpis.novosEsteMes} processo${kpis.novosEsteMes > 1 ? 's' : ''} novo${kpis.novosEsteMes > 1 ? 's' : ''} este mês.`, variante: 'success' });
    }
    if (kpis.provisorios > 0) {
      lista.push({ mensagem: `${kpis.provisorios} processo${kpis.provisorios > 1 ? 's' : ''} ainda provisório${kpis.provisorios > 1 ? 's' : ''} (não indexado pelo DataJud).`, variante: 'info' });
    }
    return lista;
  }, [processos, kpis]);

  return (
    <div className="space-y-5">
      <InsightsPanel insights={insights} />

      <KpiGrid>
        <Kpi icon={Gavel} label="Total de processos" value={kpis.total} tone="brand" />
        <Kpi icon={TrendingUp} label="Ativos" value={kpis.ativos} tone="success" />
        <Kpi icon={Clock} label="Suspensos" value={kpis.suspensos} tone="warning" />
        <Kpi icon={CheckSquare} label="Encerrados" value={kpis.encerrados} />
        <Kpi icon={Landmark} label="Arquivados" value={kpis.arquivados} />
        <Kpi icon={Calendar} label="Novos este mês" value={kpis.novosEsteMes} tone="brand" />
        <Kpi icon={DollarSign} label="Valor total das causas" value={formatarMoeda(kpis.valorTotal)} />
        <Kpi icon={Banknote} label="Ticket médio (valor causa)" value={formatarMoeda(kpis.ticketMedio)} />
        <Kpi icon={Building2} label="Tribunal mais frequente" value={tribunalTop} />
        <Kpi icon={Scale} label="Classe mais frequente" value={classeTop} />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Cartao titulo="Processos por status" subtitulo={`${processos.length} processos no total`}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={porStatus} dataKey="total" nameKey="nome" cx="50%" cy="50%" outerRadius={90} label>
                {porStatus.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Cartao>

        <Cartao titulo="Processos por tribunal" subtitulo="Top 8 tribunais com mais processos">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porTribunal} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 12 }} width={60} />
              <Tooltip />
              <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Cartao>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

function RelatorioFinanceiro({ lancamentos, processos, usuarios }: { lancamentos: Lancamento[]; processos: Processo[]; usuarios: Usuario[] }) {
  const kpis = useMemo(() => {
    const mesAtual = mesAtualISO();
    const naoCancelados = lancamentos.filter((l) => l.status !== 'cancelado');

    const aReceber = naoCancelados.filter((l) => l.tipo === 'receita' && l.status !== 'pago').reduce((acc, l) => acc + l.valor, 0);
    const aPagar = naoCancelados.filter((l) => l.tipo === 'despesa' && l.status !== 'pago').reduce((acc, l) => acc + l.valor, 0);
    const recebidoMes = naoCancelados
      .filter((l) => l.tipo === 'receita' && l.status === 'pago' && l.data_vencimento.slice(0, 7) === mesAtual)
      .reduce((acc, l) => acc + l.valor, 0);
    const pagoMes = naoCancelados
      .filter((l) => l.tipo === 'despesa' && l.status === 'pago' && l.data_vencimento.slice(0, 7) === mesAtual)
      .reduce((acc, l) => acc + l.valor, 0);
    const saldoMes = recebidoMes - pagoMes;
    const atrasados = naoCancelados.filter((l) => l.status === 'atrasado').length;
    const ticketMedio = naoCancelados.length > 0 ? naoCancelados.reduce((acc, l) => acc + l.valor, 0) / naoCancelados.length : 0;
    const honorariosExito = naoCancelados.filter((l) => l.categoria === 'honorarios_exito').reduce((acc, l) => acc + l.valor, 0);

    const em30dias = new Date();
    em30dias.setDate(em30dias.getDate() + 30);
    const proximos30 = naoCancelados
      .filter((l) => l.tipo === 'receita' && l.status === 'pendente' && new Date(l.data_vencimento) <= em30dias)
      .reduce((acc, l) => acc + l.valor, 0);

    const taxaInadimplencia = naoCancelados.length > 0 ? (atrasados / naoCancelados.length) * 100 : 0;

    return { aReceber, aPagar, recebidoMes, pagoMes, saldoMes, atrasados, ticketMedio, honorariosExito, proximos30, taxaInadimplencia };
  }, [lancamentos]);

  const faturamentoMensal = useMemo(() => {
    const meses = ultimosMeses(6);
    return meses.map(({ chave, label }) => {
      const doMes = lancamentos.filter((l) => l.data_vencimento.slice(0, 7) === chave && l.status !== 'cancelado');
      const receitas = doMes.filter((l) => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0);
      const despesas = doMes.filter((l) => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0);
      return { mes: label, Receitas: receitas, Despesas: despesas };
    });
  }, [lancamentos]);

  const honorariosPorSocio = useMemo(() => {
    const nomePorId = new Map(usuarios.map((u) => [u._id, u.nome.split(' ')[0]]));
    const processoPorNumero = new Map(processos.map((p) => [p.numero_cnj, p]));
    const totalPorSocio = new Map<string, number>();

    lancamentos
      .filter((l) => l.categoria === 'honorarios_exito' && l.numero_processo)
      .forEach((l) => {
        const processo = processoPorNumero.get(l.numero_processo!);
        const divisoes = processo?.honorarios?.divisoes ?? [];
        if (divisoes.length === 0) return;
        divisoes.forEach((d) => {
          const nome = nomePorId.get(d.usuario_id) ?? 'Desconhecido';
          const parte = (l.valor * d.percentual) / 100;
          totalPorSocio.set(nome, (totalPorSocio.get(nome) ?? 0) + parte);
        });
      });

    return Array.from(totalPorSocio.entries()).map(([nome, total]) => ({ nome, total }));
  }, [lancamentos, processos, usuarios]);

  const fluxoProjetado = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const semanas: { label: string; inicio: Date; fim: Date }[] = [];
    for (let i = 0; i < 13; i++) {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() + i * 7);
      const fim = new Date(inicio);
      fim.setDate(fim.getDate() + 6);
      semanas.push({ label: `${inicio.getDate()}/${inicio.getMonth() + 1}`, inicio, fim });
    }

    const pendentes = lancamentos.filter((l) => l.status === 'pendente' || l.status === 'atrasado');
    let acumulado = 0;
    return semanas.map(({ label, inicio, fim }) => {
      const daSemana = pendentes.filter((l) => {
        const venc = new Date(l.data_vencimento);
        return venc >= inicio && venc <= fim;
      });
      const receitas = daSemana.filter((l) => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0);
      const despesas = daSemana.filter((l) => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0);
      acumulado += receitas - despesas;
      return { semana: label, Líquido: receitas - despesas, 'Saldo acumulado': acumulado };
    });
  }, [lancamentos]);

  const insights = useMemo<Insight[]>(() => {
    const lista: Insight[] = [];
    if (kpis.taxaInadimplencia > 15) {
      lista.push({ mensagem: `Taxa de inadimplência em ${kpis.taxaInadimplencia.toFixed(0)}% — acima do saudável (15%).`, variante: 'danger' });
    } else if (kpis.taxaInadimplencia > 0) {
      lista.push({ mensagem: `Taxa de inadimplência controlada: ${kpis.taxaInadimplencia.toFixed(0)}%.`, variante: 'success' });
    }
    if (kpis.saldoMes < 0) {
      lista.push({ mensagem: `Saldo do mês negativo: ${formatarMoeda(kpis.saldoMes)}.`, variante: 'danger' });
    } else if (kpis.saldoMes > 0) {
      lista.push({ mensagem: `Saldo do mês positivo: ${formatarMoeda(kpis.saldoMes)}.`, variante: 'success' });
    }
    if (kpis.atrasados > 0) {
      lista.push({ mensagem: `${kpis.atrasados} lançamento${kpis.atrasados > 1 ? 's' : ''} atrasado${kpis.atrasados > 1 ? 's' : ''} pedindo atenção.`, variante: 'warning' });
    }
    if (kpis.honorariosExito > 0) {
      lista.push({ mensagem: `${formatarMoeda(kpis.honorariosExito)} em honorários de êxito acumulados.`, variante: 'info' });
    }
    return lista;
  }, [kpis]);

  return (
    <div className="space-y-5">
      <InsightsPanel insights={insights} />

      <KpiGrid>
        <Kpi icon={TrendingUp} label="A receber" value={formatarMoeda(kpis.aReceber)} tone="success" />
        <Kpi icon={TrendingDown} label="A pagar" value={formatarMoeda(kpis.aPagar)} tone="danger" />
        <Kpi icon={Wallet} label="Recebido este mês" value={formatarMoeda(kpis.recebidoMes)} tone="success" />
        <Kpi icon={Wallet} label="Pago este mês" value={formatarMoeda(kpis.pagoMes)} tone="danger" />
        <Kpi icon={DollarSign} label="Saldo do mês" value={formatarMoeda(kpis.saldoMes)} tone={kpis.saldoMes >= 0 ? 'success' : 'danger'} />
        <Kpi icon={AlertTriangle} label="Lançamentos atrasados" value={kpis.atrasados} tone="warning" />
        <Kpi icon={Banknote} label="Ticket médio" value={formatarMoeda(kpis.ticketMedio)} />
        <Kpi icon={Briefcase} label="Honorários de êxito acumulados" value={formatarMoeda(kpis.honorariosExito)} tone="brand" />
        <Kpi icon={Calendar} label="Receitas previstas (30 dias)" value={formatarMoeda(kpis.proximos30)} tone="brand" />
        <Kpi icon={Percent} label="Taxa de inadimplência" value={`${kpis.taxaInadimplencia.toFixed(1)}%`} tone={kpis.taxaInadimplencia > 15 ? 'danger' : 'default'} />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Cartao titulo="Faturamento mensal" subtitulo="Receitas x despesas, últimos 6 meses">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={faturamentoMensal}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatarMoeda(Number(v))} />
              <Legend />
              <Bar dataKey="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Cartao>

        {honorariosPorSocio.length > 0 && (
          <Cartao titulo="Honorários de êxito por sócio/advogado" subtitulo="Split configurado no processo, aplicado sobre os lançamentos já gerados">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={honorariosPorSocio}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatarMoeda(Number(v))} />
                <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Cartao>
        )}

        <Cartao titulo="Fluxo de caixa projetado (90 dias)" subtitulo="Lançamentos pendentes/atrasados já cadastrados, por semana">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={fluxoProjetado}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
              <XAxis dataKey="semana" tick={{ fontSize: 10 }} interval={1} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatarMoeda(Number(v))} />
              <Legend />
              <Bar dataKey="Líquido" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Saldo acumulado" stroke="#16a34a" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Cartao>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------

function RelatorioTarefas({ tarefas, usuarios }: { tarefas: Tarefa[]; usuarios: Usuario[] }) {
  const nomePorId = useMemo(() => new Map(usuarios.map((u) => [u._id, u.nome.split(' ')[0]])), [usuarios]);

  const kpis = useMemo(() => {
    const total = tarefas.length;
    const concluidas = tarefas.filter((t) => t.status === 'concluida').length;
    const atrasadas = tarefas.filter((t) => t.status === 'atrasada').length;
    const emAberto = total - concluidas;
    const taxaConclusao = total > 0 ? (concluidas / total) * 100 : 0;
    const criticasAbertas = tarefas.filter((t) => t.status !== 'concluida' && t.prioridade === 'critica').length;

    const daqui7dias = new Date();
    daqui7dias.setDate(daqui7dias.getDate() + 7);
    const vencendoSemana = tarefas.filter(
      (t) => t.status !== 'concluida' && new Date(t.data_vencimento) <= daqui7dias && new Date(t.data_vencimento) >= new Date(),
    ).length;
    const semResponsavel = tarefas.filter((t) => !t.responsavel_id).length;

    const abertasPorResponsavel = new Map<string, number>();
    tarefas
      .filter((t) => t.status !== 'concluida' && t.responsavel_id)
      .forEach((t) => abertasPorResponsavel.set(t.responsavel_id!, (abertasPorResponsavel.get(t.responsavel_id!) ?? 0) + 1));

    let topResponsavel = '—';
    let maxAbertas = 0;
    abertasPorResponsavel.forEach((qtd, id) => {
      if (qtd > maxAbertas) {
        maxAbertas = qtd;
        topResponsavel = nomePorId.get(id) ?? '—';
      }
    });
    const mediaAbertas = abertasPorResponsavel.size > 0 ? Array.from(abertasPorResponsavel.values()).reduce((a, b) => a + b, 0) / abertasPorResponsavel.size : 0;

    return { total, concluidas, atrasadas, emAberto, taxaConclusao, criticasAbertas, vencendoSemana, semResponsavel, topResponsavel, mediaAbertas };
  }, [tarefas, nomePorId]);

  const porResponsavel = useMemo(() => {
    const contagem = new Map<string, { concluidas: number; pendentes: number }>();
    tarefas.forEach((t) => {
      const nome = t.responsavel_id ? (nomePorId.get(t.responsavel_id) ?? 'Sem responsável') : 'Sem responsável';
      const atual = contagem.get(nome) ?? { concluidas: 0, pendentes: 0 };
      if (t.status === 'concluida') atual.concluidas += 1;
      else atual.pendentes += 1;
      contagem.set(nome, atual);
    });
    return Array.from(contagem.entries()).map(([nome, v]) => ({ nome, Concluídas: v.concluidas, Pendentes: v.pendentes }));
  }, [tarefas, nomePorId]);

  const insights = useMemo<Insight[]>(() => {
    const lista: Insight[] = [];
    if (kpis.criticasAbertas > 0) {
      lista.push({ mensagem: `${kpis.criticasAbertas} tarefa${kpis.criticasAbertas > 1 ? 's' : ''} crítica${kpis.criticasAbertas > 1 ? 's' : ''} em aberto — priorize.`, variante: 'danger' });
    }
    if (kpis.atrasadas > 0) {
      lista.push({ mensagem: `${kpis.atrasadas} tarefa${kpis.atrasadas > 1 ? 's' : ''} atrasada${kpis.atrasadas > 1 ? 's' : ''}.`, variante: 'warning' });
    }
    if (kpis.taxaConclusao >= 70) {
      lista.push({ mensagem: `Boa taxa de conclusão: ${kpis.taxaConclusao.toFixed(0)}%.`, variante: 'success' });
    }
    if (kpis.semResponsavel > 0) {
      lista.push({ mensagem: `${kpis.semResponsavel} tarefa${kpis.semResponsavel > 1 ? 's' : ''} sem responsável definido.`, variante: 'info' });
    }
    return lista;
  }, [kpis]);

  return (
    <div className="space-y-5">
      <InsightsPanel insights={insights} />

      <KpiGrid>
        <Kpi icon={ListChecks} label="Total de tarefas" value={kpis.total} tone="brand" />
        <Kpi icon={CheckSquare} label="Concluídas" value={kpis.concluidas} tone="success" />
        <Kpi icon={Clock} label="Em aberto" value={kpis.emAberto} />
        <Kpi icon={AlertTriangle} label="Atrasadas" value={kpis.atrasadas} tone="warning" />
        <Kpi icon={Percent} label="Taxa de conclusão" value={`${kpis.taxaConclusao.toFixed(0)}%`} tone="success" />
        <Kpi icon={AlertTriangle} label="Críticas em aberto" value={kpis.criticasAbertas} tone="danger" />
        <Kpi icon={Calendar} label="Vencendo em 7 dias" value={kpis.vencendoSemana} tone="warning" />
        <Kpi icon={UserRound} label="Sem responsável" value={kpis.semResponsavel} />
        <Kpi icon={UserRound} label="Responsável com mais tarefas abertas" value={kpis.topResponsavel} tone="brand" />
        <Kpi icon={ListChecks} label="Média de tarefas abertas por pessoa" value={kpis.mediaAbertas.toFixed(1)} />
      </KpiGrid>

      <Cartao titulo="Tarefas por responsável" subtitulo="Concluídas x pendentes">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={porResponsavel}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
            <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Concluídas" stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Pendentes" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Cartao>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

function RelatorioClientes({ clientes, processos }: { clientes: Cliente[]; processos: Processo[] }) {
  const kpis = useMemo(() => {
    const total = clientes.length;
    const ativos = clientes.filter((c) => c.status === 'ativo').length;
    const inativos = clientes.filter((c) => c.status === 'inativo').length;
    const prospects = clientes.filter((c) => c.status === 'prospect').length;
    const pf = clientes.filter((c) => c.tipo === 'pf').length;
    const pj = clientes.filter((c) => c.tipo === 'pj').length;

    const processosPorCliente = new Map<string, number>();
    processos.forEach((p) => {
      if (!p.cliente_id) return;
      processosPorCliente.set(p.cliente_id, (processosPorCliente.get(p.cliente_id) ?? 0) + 1);
    });
    const semProcesso = clientes.filter((c) => !processosPorCliente.get(c._id)).length;
    const comMultiplos = clientes.filter((c) => (processosPorCliente.get(c._id) ?? 0) > 1).length;

    const origemTop = maisFrequente(clientes.map((c) => c.origem_lead));
    const contatoCompleto = clientes.filter((c) => c.email && (c.telefone || c.whatsapp)).length;

    return { total, ativos, inativos, prospects, pf, pj, semProcesso, comMultiplos, origemTop, contatoCompleto };
  }, [clientes, processos]);

  const porTipo = useMemo(
    () => [
      { nome: 'Pessoa física', total: kpis.pf },
      { nome: 'Pessoa jurídica', total: kpis.pj },
    ],
    [kpis],
  );

  const porStatus = useMemo(() => {
    const LABEL: Record<string, string> = { ativo: 'Ativo', inativo: 'Inativo', prospect: 'Prospect' };
    const contagem = new Map<string, number>();
    clientes.forEach((c) => contagem.set(c.status, (contagem.get(c.status) ?? 0) + 1));
    return Array.from(contagem.entries()).map(([status, total]) => ({ nome: LABEL[status] ?? status, total }));
  }, [clientes]);

  const insights = useMemo<Insight[]>(() => {
    const lista: Insight[] = [];
    if (kpis.semProcesso > 0) {
      lista.push({ mensagem: `${kpis.semProcesso} cliente${kpis.semProcesso > 1 ? 's' : ''} sem nenhum processo vinculado.`, variante: 'warning' });
    }
    if (kpis.prospects > 0) {
      lista.push({ mensagem: `${kpis.prospects} prospect${kpis.prospects > 1 ? 's' : ''} aguardando conversão.`, variante: 'info' });
    }
    if (kpis.contatoCompleto < kpis.total) {
      const faltando = kpis.total - kpis.contatoCompleto;
      lista.push({ mensagem: `${faltando} cliente${faltando > 1 ? 's' : ''} com dados de contato incompletos.`, variante: 'warning' });
    }
    if (kpis.comMultiplos > 0) {
      lista.push({ mensagem: `${kpis.comMultiplos} cliente${kpis.comMultiplos > 1 ? 's' : ''} com mais de um processo — boa retenção.`, variante: 'success' });
    }
    return lista;
  }, [kpis]);

  return (
    <div className="space-y-5">
      <InsightsPanel insights={insights} />

      <KpiGrid>
        <Kpi icon={Users} label="Total de clientes" value={kpis.total} tone="brand" />
        <Kpi icon={CheckSquare} label="Ativos" value={kpis.ativos} tone="success" />
        <Kpi icon={Clock} label="Inativos" value={kpis.inativos} />
        <Kpi icon={UserRound} label="Prospects" value={kpis.prospects} tone="warning" />
        <Kpi icon={UserRound} label="Pessoa física" value={kpis.pf} />
        <Kpi icon={Building2} label="Pessoa jurídica" value={kpis.pj} />
        <Kpi icon={AlertTriangle} label="Sem processo vinculado" value={kpis.semProcesso} tone="warning" />
        <Kpi icon={Gavel} label="Com mais de 1 processo" value={kpis.comMultiplos} tone="brand" />
        <Kpi icon={PieChartIcon} label="Origem mais comum" value={kpis.origemTop} />
        <Kpi icon={CheckSquare} label="Com contato completo" value={kpis.contatoCompleto} tone="success" />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Cartao titulo="Clientes por status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={porStatus} dataKey="total" nameKey="nome" cx="50%" cy="50%" outerRadius={85} label>
                {porStatus.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Cartao>

        <Cartao titulo="Pessoa física x jurídica">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={porTipo} dataKey="total" nameKey="nome" cx="50%" cy="50%" outerRadius={85} label>
                {porTipo.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Cartao>
      </div>
    </div>
  );
}
