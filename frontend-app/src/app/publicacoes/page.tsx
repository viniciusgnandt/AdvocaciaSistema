'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Archive, CalendarDays, Check, Eye, Inbox, ListChecks, RefreshCw, X } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { FiltroBar } from '@/components/publicacoes/FiltroBar';
import { PublicacaoItem } from '@/components/publicacoes/PublicacaoItem';
import { PublicacaoModal } from '@/components/publicacoes/PublicacaoModal';
import { ModoTriagem } from '@/components/publicacoes/ModoTriagem';
import {
  atualizarPublicacao,
  atualizarPublicacoesEmMassa,
  buscarResumo,
  listarPublicacoes,
  puxarNovasPublicacoes,
  type FiltrosPublicacoes,
  type Publicacao,
  type ResumoPublicacoes,
} from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PublicacoesPage() {
  const router = useRouter();
  const [filtros, setFiltros] = useState<FiltrosPublicacoes>({ limite: 20, pagina: 1 });
  const [itens, setItens] = useState<Publicacao[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [tribunais, setTribunais] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [resumo, setResumo] = useState<ResumoPublicacoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<Publicacao | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aplicandoEmMassa, setAplicandoEmMassa] = useState(false);
  const [triagemAberta, setTriagemAberta] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [lista, resumoDados] = await Promise.all([listarPublicacoes(filtros), buscarResumo()]);
      setItens(lista.itens);
      setTotal(lista.total);
      setTotalPaginas(lista.totalPaginas);
      setTribunais(lista.filtrosDisponiveis.tribunais);
      setTipos(lista.filtrosDisponiveis.tipos);
      setResumo(resumoDados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar publicações');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const puxarNovas = useCallback(async () => {
    setPulling(true);
    try {
      await puxarNovasPublicacoes();
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao puxar publicações');
    } finally {
      setPulling(false);
    }
  }, [carregar]);

  const atualizar = useCallback(
    async (id: string, dados: Partial<Publicacao>) => {
      setItens((atual) => atual.map((p) => (p._id === id ? { ...p, ...dados } : p)));
      try {
        await atualizarPublicacao(id, dados);
      } catch {
        carregar();
      }
    },
    [carregar],
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    setSelecionados(new Set());
  }, [filtros]);

  const toggleSelecao = useCallback((id: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }, []);

  const selecionarTodos = () => setSelecionados(new Set(itens.map((p) => p._id)));
  const limparSelecao = () => setSelecionados(new Set());

  const aplicarEmMassa = async (dados: Partial<Pick<Publicacao, 'status' | 'urgencia'>>) => {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    setAplicandoEmMassa(true);
    setItens((atual) => atual.map((p) => (ids.includes(p._id) ? { ...p, ...dados } : p)));
    try {
      await atualizarPublicacoesEmMassa(ids, dados);
      limparSelecao();
      buscarResumo().then(setResumo);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao aplicar ação em massa');
      carregar();
    } finally {
      setAplicandoEmMassa(false);
    }
  };

  return (
    <>
      <Topbar titulo="Publicações" subtitulo="Monitoramento judicial via DJEN" />

      <main className="flex-1 px-6 py-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Inbox} label="Total" value={resumo?.total ?? '—'} />
          <StatCard icon={AlertTriangle} label="Urgentes" value={resumo?.urgentes ?? '—'} tone="warning" />
          <StatCard icon={CalendarDays} label="Hoje" value={resumo?.hoje ?? '—'} tone="brand" />
          <StatCard icon={CalendarDays} label="Últimos 7 dias" value={resumo?.semana ?? '—'} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <FiltroBar filtros={filtros} onChange={setFiltros} tribunais={tribunais} tipos={tipos} />
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setTriagemAberta(true)}
              disabled={itens.filter((p) => p.status === 'nao_lida').length === 0}
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              <ListChecks size={14} /> Triagem rápida
            </button>
            <button
              onClick={puxarNovas}
              disabled={pulling}
              className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={pulling ? 'animate-spin' : ''} />
              {pulling ? 'Buscando…' : 'Puxar novas'}
            </button>
          </div>
        </div>

        {erro && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        {selecionados.size > 0 && (
          <div className="sticky top-[73px] z-10 flex items-center gap-3 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/30 px-4 py-2.5">
            <p className="text-sm text-brand-700 dark:text-brand-300 font-medium">
              {selecionados.size} selecionada{selecionados.size > 1 ? 's' : ''}
            </p>
            <button onClick={limparSelecao} className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
              <X size={12} /> limpar
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                disabled={aplicandoEmMassa}
                onClick={() => aplicarEmMassa({ status: 'lida' })}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <Check size={12} /> Marcar como lida
              </button>
              <button
                disabled={aplicandoEmMassa}
                onClick={() => aplicarEmMassa({ status: 'triada' })}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <Eye size={12} /> Marcar como triada
              </button>
              <button
                disabled={aplicandoEmMassa}
                onClick={() => aplicarEmMassa({ status: 'arquivada' })}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <Archive size={12} /> Arquivar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando…</p>
        ) : itens.length === 0 ? (
          <EmptyState titulo="Nenhuma publicação encontrada" descricao="Tente ajustar os filtros atuais ou puxar novas publicações." />
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <button onClick={selecionarTodos} className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline">
                Selecionar todos ({itens.length})
              </button>
              {selecionados.size > 0 && (
                <>
                  <span>·</span>
                  <button onClick={limparSelecao} className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline">
                    Limpar seleção
                  </button>
                </>
              )}
            </div>

            <ul className="space-y-3">
              {itens.map((p) => (
                <PublicacaoItem
                  key={p._id}
                  publicacao={p}
                  selecionada={selecionados.has(p._id)}
                  onToggleSelecao={toggleSelecao}
                  onAbrir={(pub) => {
                    setSelecionada(pub);
                    if (pub.status === 'nao_lida') atualizar(pub._id, { status: 'lida' });
                  }}
                  onAtualizar={atualizar}
                />
              ))}
            </ul>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-400">
                {total} publicação(ões) · página {filtros.pagina ?? 1} de {totalPaginas}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={(filtros.pagina ?? 1) <= 1}
                  onClick={() => setFiltros((f) => ({ ...f, pagina: (f.pagina ?? 1) - 1 }))}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  disabled={(filtros.pagina ?? 1) >= totalPaginas}
                  onClick={() => setFiltros((f) => ({ ...f, pagina: (f.pagina ?? 1) + 1 }))}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {selecionada && (
        <PublicacaoModal
          publicacao={selecionada}
          onFechar={() => setSelecionada(null)}
          onIrParaProcesso={(numeroProcesso) => router.push(`/processos?numero=${numeroProcesso}`)}
        />
      )}

      {triagemAberta && (
        <ModoTriagem
          itens={itens.filter((p) => p.status === 'nao_lida')}
          onAtualizar={atualizar}
          onFechar={() => {
            setTriagemAberta(false);
            buscarResumo().then(setResumo);
          }}
        />
      )}
    </>
  );
}
