'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Briefcase, Check, ChevronLeft, ChevronRight, Plus, ShieldCheck, Trash2, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { BotaoExportar } from '@/components/ui/BotaoExportar';
import { TerceirizacaoAba } from '@/components/financeiro/TerceirizacaoAba';
import { exportarExcel, exportarPdf } from '@/lib/exportar';
import {
  aprovarDespesa,
  atualizarLancamento,
  criarLancamento,
  excluirLancamento,
  listarLancamentos,
  rejeitarDespesa,
  resumoFinanceiro,
  usuarioLogado,
  type Lancamento,
  type ResumoFinanceiro,
  type TipoLancamento,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { paraNumero } from '@/lib/moeda';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mesAtualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatarMesLabel(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function somarMes(mes: string, delta: number) {
  const [ano, m] = mes.split('-').map(Number);
  const d = new Date(ano, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function FinanceiroPage() {
  const router = useRouter();
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [tipo, setTipo] = useState('');
  const [status, setStatus] = useState('');
  const [mes, setMes] = useState(mesAtualISO());
  const [aba, setAba] = useState<'lancamentos' | 'terceirizacao'>('lancamentos');
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [l, r] = await Promise.all([
        listarLancamentos({ tipo: tipo || undefined, status: status || undefined, mes }),
        resumoFinanceiro(mes),
      ]);
      setLancamentos(l);
      setResumo(r);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar financeiro');
    } finally {
      setLoading(false);
    }
  }, [tipo, status, mes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const marcarPago = async (l: Lancamento) => {
    setLancamentos((atual) => atual.map((x) => (x._id === l._id ? { ...x, status: 'pago' } : x)));
    try {
      await atualizarLancamento(l._id, { status: 'pago' });
      resumoFinanceiro(mes).then(setResumo);
    } catch {
      carregar();
    }
  };

  const aprovar = async (l: Lancamento) => {
    setLancamentos((atual) => atual.map((x) => (x._id === l._id ? { ...x, aprovacao_status: 'aprovado' } : x)));
    try {
      await aprovarDespesa(l._id);
    } catch {
      carregar();
    }
  };

  const rejeitar = async (l: Lancamento) => {
    setLancamentos((atual) => atual.map((x) => (x._id === l._id ? { ...x, aprovacao_status: 'rejeitado' } : x)));
    try {
      await rejeitarDespesa(l._id);
    } catch {
      carregar();
    }
  };

  const remover = async (l: Lancamento) => {
    let todasParcelas = false;
    if (l.grupo_parcelamento_id) {
      todasParcelas = window.confirm(
        `Esta é a parcela ${l.parcela_atual}/${l.parcela_total}. Clique OK para excluir TODAS as parcelas deste lançamento, ou Cancelar para excluir só esta.`,
      );
    } else if (!window.confirm(`Excluir "${l.descricao}"?`)) {
      return;
    }
    try {
      await excluirLancamento(l._id, todasParcelas);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao excluir lançamento');
    }
  };

  const exportarComoExcel = () => {
    exportarExcel(
      lancamentos.map((l) => ({
        Tipo: l.tipo === 'receita' ? 'Receita' : 'Despesa',
        Descrição: l.descricao,
        Valor: l.valor,
        Categoria: l.categoria ?? '',
        Processo: l.numero_processo ?? '',
        Vencimento: new Date(l.data_vencimento).toLocaleDateString('pt-BR'),
        Status: STATUS_LABEL[l.status] ?? l.status,
      })),
      `financeiro-${mes}`,
    );
  };

  const exportarComoPdf = () => {
    exportarPdf(
      `Financeiro — ${formatarMesLabel(mes)}`,
      ['Tipo', 'Descrição', 'Valor', 'Vencimento', 'Status'],
      lancamentos.map((l) => [
        l.tipo === 'receita' ? 'Receita' : 'Despesa',
        l.descricao,
        formatarMoeda(l.valor),
        new Date(l.data_vencimento).toLocaleDateString('pt-BR'),
        STATUS_LABEL[l.status] ?? l.status,
      ]),
      `financeiro-${mes}`,
    );
  };

  return (
    <>
      <Topbar titulo="Financeiro" subtitulo="Contas a receber e a pagar do escritório" />

      <main className="flex-1 px-6 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-800 p-0.5 w-fit">
            <button
              onClick={() => setAba('lancamentos')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                aba === 'lancamentos' ? 'bg-brand-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              <Wallet size={13} /> Lançamentos
            </button>
            <button
              onClick={() => setAba('terceirizacao')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                aba === 'terceirizacao' ? 'bg-brand-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              <Briefcase size={13} /> Terceirização
            </button>
          </div>

          {aba === 'lancamentos' && lancamentos.length > 0 && (
            <BotaoExportar onExcel={exportarComoExcel} onPdf={exportarComoPdf} />
          )}
        </div>

        {aba === 'terceirizacao' ? (
          <TerceirizacaoAba />
        ) : (
          <>
        <div className="flex items-center justify-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-2.5">
          <button
            onClick={() => setMes((m) => somarMes(m, -1))}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize w-40 text-center">
            {formatarMesLabel(mes)}
          </p>
          <button
            onClick={() => setMes((m) => somarMes(m, 1))}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight size={16} />
          </button>
          {mes !== mesAtualISO() && (
            <button
              onClick={() => setMes(mesAtualISO())}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline ml-2"
            >
              hoje
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={TrendingUp} label="A receber" value={loading ? '—' : formatarMoeda(resumo?.aReceber ?? 0)} tone="brand" />
          <StatCard icon={TrendingDown} label="A pagar" value={loading ? '—' : formatarMoeda(resumo?.aPagar ?? 0)} tone="warning" />
          <StatCard icon={ArrowUpCircle} label="Recebido" value={loading ? '—' : formatarMoeda(resumo?.recebido ?? 0)} />
          <StatCard icon={ArrowDownCircle} label="Pago" value={loading ? '—' : formatarMoeda(resumo?.pago ?? 0)} />
          <StatCard icon={AlertTriangle} label="Atrasados" value={loading ? '—' : (resumo?.atrasados ?? 0)} tone="warning" />
        </div>

        {erro && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        <div className="flex items-center gap-2">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
          >
            <option value="">Receitas e despesas</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={() => setModalAberto(true)}
            className="ml-auto flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
          >
            <Plus size={14} /> Novo lançamento
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando…</p>
        ) : lancamentos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center text-gray-400 text-sm">
            Nenhum lançamento por aqui.
          </div>
        ) : (
          <ul className="space-y-2">
            {lancamentos.map((l) => (
              <li
                key={l._id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    l.tipo === 'receita'
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                  )}
                >
                  {l.tipo === 'receita' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{l.descricao}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <span>{new Date(l.data_vencimento).toLocaleDateString('pt-BR')}</span>
                    {l.categoria && <span>· {l.categoria}</span>}
                    {l.aprovacao_status === 'pendente' && l.solicitado_por_nome && (
                      <span>· solicitado por {l.solicitado_por_nome}</span>
                    )}
                    {l.numero_processo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/processos?numero=${l.numero_processo}`);
                        }}
                        className="font-mono hover:text-brand-600 dark:hover:text-brand-400 hover:underline"
                      >
                        · {l.numero_processo}
                      </button>
                    )}
                  </div>
                </div>

                <span
                  className={cn(
                    'text-sm font-semibold shrink-0',
                    l.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                  )}
                >
                  {l.tipo === 'receita' ? '+' : '-'} {formatarMoeda(l.valor)}
                </span>

                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full shrink-0',
                    l.status === 'atrasado'
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : l.status === 'pago'
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
                  )}
                >
                  {STATUS_LABEL[l.status]}
                </span>

                {l.tipo === 'despesa' && l.aprovacao_status === 'pendente' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
                    Aguardando aprovação
                  </span>
                )}
                {l.tipo === 'despesa' && l.aprovacao_status === 'rejeitado' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 shrink-0">
                    Rejeitada
                  </span>
                )}

                {l.tipo === 'despesa' && l.aprovacao_status === 'pendente' && usuarioLogado()?.perfil === 'admin' && (
                  <>
                    <button
                      onClick={() => aprovar(l)}
                      title="Aprovar despesa"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 dark:hover:text-green-400 shrink-0"
                    >
                      <ShieldCheck size={14} />
                    </button>
                    <button
                      onClick={() => rejeitar(l)}
                      title="Rejeitar despesa"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}

                {l.status !== 'pago' && l.status !== 'cancelado' && l.aprovacao_status !== 'pendente' && l.aprovacao_status !== 'rejeitado' && (
                  <button
                    onClick={() => marcarPago(l)}
                    title="Marcar como pago"
                    className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 dark:hover:text-green-400 shrink-0"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={() => remover(l)}
                  title="Excluir"
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
          </>
        )}
      </main>

      {modalAberto && (
        <NovoLancamentoModal
          onFechar={() => setModalAberto(false)}
          onCriado={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </>
  );
}

function NovoLancamentoModal({ onFechar, onCriado }: { onFechar: () => void; onCriado: () => void }) {
  const [form, setForm] = useState({
    tipo: 'receita' as TipoLancamento,
    descricao: '',
    valor: '',
    categoria: '',
    numero_processo: '',
    data_vencimento: '',
    parcelado: false,
    parcelas: '2',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    const valorNumero = paraNumero(form.valor);
    const numParcelas = form.parcelado ? Number(form.parcelas) : undefined;
    if (!form.descricao.trim() || !form.data_vencimento || !valorNumero || valorNumero <= 0) {
      setErro('Preencha descrição, valor e vencimento.');
      return;
    }
    if (form.parcelado && (!numParcelas || numParcelas < 2)) {
      setErro('Número de parcelas deve ser pelo menos 2.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await criarLancamento({
        tipo: form.tipo,
        descricao: form.descricao,
        valor: valorNumero,
        categoria: form.categoria || undefined,
        numero_processo: form.numero_processo || undefined,
        data_vencimento: new Date(form.data_vencimento).toISOString(),
        parcelas: numParcelas,
      });
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao criar lançamento');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Novo lançamento</p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setForm({ ...form, tipo: 'receita' })}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition',
                form.tipo === 'receita'
                  ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400',
              )}
            >
              <ArrowUpCircle size={14} /> Receita
            </button>
            <button
              onClick={() => setForm({ ...form, tipo: 'despesa' })}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition',
                form.tipo === 'despesa'
                  ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400',
              )}
            >
              <ArrowDownCircle size={14} /> Despesa
            </button>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Descrição</span>
            <input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Valor (R$)</span>
              <input
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Vencimento</span>
              <input
                type="date"
                value={form.data_vencimento}
                onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Categoria (opcional)</span>
              <input
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Honorários, aluguel…"
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Processo (opcional)</span>
              <input
                value={form.numero_processo}
                onChange={(e) => setForm({ ...form, numero_processo: e.target.value })}
                placeholder="Número CNJ"
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 font-mono"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="parcelado"
              type="checkbox"
              checked={form.parcelado}
              onChange={(e) => setForm({ ...form, parcelado: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-700"
            />
            <label htmlFor="parcelado" className="text-sm text-gray-600 dark:text-gray-300">
              Receber/pagar em parcelas
            </label>
          </div>

          {form.parcelado && (
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Número de parcelas (valor acima = cada parcela, vencimento mensal a partir da data escolhida)
              </span>
              <input
                type="number"
                min={2}
                max={60}
                value={form.parcelas}
                onChange={(e) => setForm({ ...form, parcelas: e.target.value })}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          )}

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Criar lançamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
