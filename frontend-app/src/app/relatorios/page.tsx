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

  return (
    <>
      <Topbar titulo="Relatórios" subtitulo="Visão consolidada de processos, tarefas, financeiro e clientes" />

      <main className="flex-1 px-4 py-6 sm:px-6 space-y-5">
        {erro && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 p-1 w-fit overflow-x-auto">
          {CATEGORIAS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCategoria(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                categoria === id ? 'bg-brand-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

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

  return (
    <div className="space-y-5">
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

  return (
    <div className="space-y-5">
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

  return (
    <div className="space-y-5">
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

  return (
    <div className="space-y-5">
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
