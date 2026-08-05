'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Topbar } from '@/components/layout/Topbar';
import { listarLancamentos, listarProcessos, listarTarefas, listarUsuarios, type Lancamento, type Processo, type Tarefa, type Usuario } from '@/lib/api';

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

export default function RelatoriosPage() {
  const [processos, setProcessos] = useState<Processo[] | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[] | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarProcessos(), listarTarefas(), listarLancamentos(), listarUsuarios()])
      .then(([procResp, tarefasResp, lancResp, usuariosResp]) => {
        setProcessos(procResp.itens);
        setTarefas(tarefasResp);
        setLancamentos(lancResp);
        setUsuarios(usuariosResp);
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'erro ao carregar relatórios'));
  }, []);

  const porStatus = useMemo(() => {
    if (!processos) return [];
    const contagem = new Map<string, number>();
    processos.forEach((p) => contagem.set(p.status, (contagem.get(p.status) ?? 0) + 1));
    const LABEL: Record<string, string> = { ativo: 'Ativo', suspenso: 'Suspenso', encerrado: 'Encerrado', arquivado: 'Arquivado' };
    return Array.from(contagem.entries()).map(([status, total]) => ({ nome: LABEL[status] ?? status, total }));
  }, [processos]);

  const porTribunal = useMemo(() => {
    if (!processos) return [];
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

  const faturamentoMensal = useMemo(() => {
    if (!lancamentos) return [];
    const meses = ultimosMeses(6);
    return meses.map(({ chave, label }) => {
      const doMes = lancamentos.filter((l) => l.data_vencimento.slice(0, 7) === chave && l.status !== 'cancelado');
      const receitas = doMes.filter((l) => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0);
      const despesas = doMes.filter((l) => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0);
      return { mes: label, Receitas: receitas, Despesas: despesas };
    });
  }, [lancamentos]);

  const tarefasPorResponsavel = useMemo(() => {
    if (!tarefas || !usuarios) return [];
    const nomePorId = new Map(usuarios.map((u) => [u._id, u.nome.split(' ')[0]]));
    const contagem = new Map<string, { concluidas: number; pendentes: number }>();
    tarefas.forEach((t) => {
      const nome = t.responsavel_id ? (nomePorId.get(t.responsavel_id) ?? 'Sem responsável') : 'Sem responsável';
      const atual = contagem.get(nome) ?? { concluidas: 0, pendentes: 0 };
      if (t.status === 'concluida') atual.concluidas += 1;
      else atual.pendentes += 1;
      contagem.set(nome, atual);
    });
    return Array.from(contagem.entries()).map(([nome, v]) => ({ nome, Concluídas: v.concluidas, Pendentes: v.pendentes }));
  }, [tarefas, usuarios]);

  const carregando = !processos || !tarefas || !lancamentos || !usuarios;

  return (
    <>
      <Topbar titulo="Relatórios" subtitulo="Visão consolidada de processos, tarefas e financeiro" />

      <main className="flex-1 px-4 py-6 sm:px-6 space-y-5">
        {erro && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        {carregando ? (
          <p className="text-sm text-gray-400">Carregando…</p>
        ) : (
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

            <Cartao titulo="Processos por status" subtitulo={`${processos?.length ?? 0} processos no total`}>
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

            <Cartao titulo="Tarefas por responsável" subtitulo="Concluídas x pendentes">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tarefasPorResponsavel}>
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
        )}
      </main>
    </>
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
