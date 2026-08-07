'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Baby,
  Bookmark,
  BookmarkPlus,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  CheckSquare,
  Clock,
  FileStack,
  DollarSign,
  Gavel,
  History as HistoryIcon,
  Landmark,
  Leaf,
  Paperclip,
  Pencil,
  Presentation,
  Scale,
  ScrollText,
  Search,
  Sparkles,
  Star,
  StickyNote,
  Tag,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import {
  atualizarProcesso,
  buscarCliente,
  chaveMovimentacao,
  listarProcessos,
  listarPublicacoes,
  listarUsuarios,
  type AtualizarProcesso,
  type FiltrosProcessos,
  type Processo,
  type Publicacao,
  type TipoHonorario,
  type Usuario,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonLista } from '@/components/ui/SkeletonLista';
import { ArquivosProcesso } from '@/components/processos/ArquivosProcesso';
import { AnexoMovimentacao } from '@/components/processos/AnexoMovimentacao';
import { FinanceiroProcesso } from '@/components/processos/FinanceiroProcesso';
import { TarefasProcesso } from '@/components/processos/TarefasProcesso';
import { TimelineProcesso } from '@/components/processos/TimelineProcesso';
import HistoricoAmigavel from '@/components/common/HistoricoAmigavel';
import NotasRapidas from '@/components/common/NotasRapidas';
import { BotaoFavorito } from '@/components/common/BotaoFavorito';
import { useFavoritos } from '@/lib/useFavoritos';
import { ModoApresentacao } from '@/components/processos/ModoApresentacao';
import { CopilotoIaModal } from '@/components/processos/CopilotoIaModal';
import { ResumoIaCard } from '@/components/processos/ResumoIaCard';
import { ComparadorProcessos } from '@/components/processos/ComparadorProcessos';
import { gerarCapaProcesso } from '@/lib/capaProcesso';
import { BotaoExportar } from '@/components/ui/BotaoExportar';
import { exportarExcel, exportarPdf } from '@/lib/exportar';
import { useFiltrosSalvos } from '@/lib/useFiltrosSalvos';

function formatarMoeda(valor?: number | null) {
  if (valor === undefined || valor === null) return null;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function capitalizarNome(nome: string) {
  return nome
    .toLowerCase()
    .split(' ')
    .map((palavra) => (palavra.length > 2 ? palavra.charAt(0).toUpperCase() + palavra.slice(1) : palavra))
    .join(' ');
}

function temFiltroAtivo(filtros: FiltrosProcessos) {
  return !!(filtros.tribunal || filtros.classe || filtros.status || filtros.busca || filtros.tag);
}

function idadeProcesso(processo: Processo): string | null {
  if (!processo.data_ajuizamento) return null;
  const inicio = new Date(processo.data_ajuizamento);
  if (Number.isNaN(inicio.getTime())) return null;
  const dias = Math.floor((Date.now() - inicio.getTime()) / (24 * 60 * 60 * 1000));
  if (dias < 0) return null;
  if (dias < 30) return `${dias}d`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses}m`;
  const anos = Math.floor(dias / 365);
  const mesesRestantes = Math.floor((dias % 365) / 30);
  return mesesRestantes > 0 ? `${anos}a ${mesesRestantes}m` : `${anos}a`;
}

function areaDireito(processo: Processo): { icone: typeof Scale; label: string } {
  const tribunal = processo.tribunal ?? '';
  const classe = (processo.classe ?? '').toLowerCase();

  if (classe.includes('trabalhist') || tribunal.startsWith('TRT')) return { icone: Briefcase, label: 'Trabalhista' };
  if (classe.includes('família') || classe.includes('familia') || classe.includes('alimentos') || classe.includes('divórcio') || classe.includes('divorcio')) {
    return { icone: Baby, label: 'Família' };
  }
  if (classe.includes('ambiental')) return { icone: Leaf, label: 'Ambiental' };
  if (tribunal.startsWith('TRF') || classe.includes('previdenciári') || classe.includes('previdenciari')) {
    return { icone: Landmark, label: 'Federal/Previdenciário' };
  }
  return { icone: Scale, label: 'Cível' };
}

function tituloPartes(processo: Processo) {
  if (processo.parte_ativa && processo.parte_passiva) {
    return `${capitalizarNome(processo.parte_ativa)} x ${capitalizarNome(processo.parte_passiva)}`;
  }
  if (processo.parte_ativa) return capitalizarNome(processo.parte_ativa);
  return null;
}

export default function ProcessosPage() {
  return (
    <Suspense fallback={null}>
      <ProcessosPageConteudo />
    </Suspense>
  );
}

function ProcessosPageConteudo() {
  const searchParams = useSearchParams();
  const numeroBuscado = searchParams.get('numero')?.replace(/\D/g, '');

  const [filtros, setFiltros] = useState<FiltrosProcessos>({});
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [tribunais, setTribunais] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selecionado, setSelecionado] = useState<Processo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [somenteFavoritos, setSomenteFavoritos] = useState(false);
  const { ehFavorito, alternar } = useFavoritos();
  const [comparando, setComparando] = useState(false);
  const [selecionadosComparar, setSelecionadosComparar] = useState<Set<string>>(new Set());
  const [comparadorAberto, setComparadorAberto] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resposta = await listarProcessos(filtros);
      setProcessos(resposta.itens);
      setTribunais(resposta.filtrosDisponiveis.tribunais);
      setClasses(resposta.filtrosDisponiveis.classes);
      setTags(resposta.filtrosDisponiveis.tags);
      const alvo = numeroBuscado ? resposta.itens.find((p) => p.numero_cnj === numeroBuscado) : undefined;
      setSelecionado((atual) => {
        const atualAindaVisivel = atual && resposta.itens.some((p) => p._id === atual._id);
        return alvo ?? (atualAindaVisivel ? atual : null) ?? resposta.itens[0] ?? null;
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar processos');
    } finally {
      setLoading(false);
    }
  }, [filtros, numeroBuscado]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, numeroBuscado]);

  const processoNaoEncontrado = !loading && numeroBuscado && !processos.some((p) => p.numero_cnj === numeroBuscado);

  const processosExibidos = [...processos]
    .filter((p) => !somenteFavoritos || ehFavorito('processo', p._id))
    .sort((a, b) => Number(ehFavorito('processo', b._id)) - Number(ehFavorito('processo', a._id)));

  const processosParaExportar =
    comparando && selecionadosComparar.size > 0
      ? processos.filter((p) => selecionadosComparar.has(p.numero_cnj))
      : processos;

  const exportarComoExcel = () => {
    exportarExcel(
      processosParaExportar.map((p) => ({
        'Nº CNJ': p.numero_cnj,
        Tribunal: p.tribunal ?? '',
        Classe: p.classe ?? '',
        'Parte ativa': p.parte_ativa ?? '',
        'Parte passiva': p.parte_passiva ?? '',
        'Valor da causa': p.valor_causa ?? '',
      })),
      'processos',
    );
  };

  const exportarComoPdf = () => {
    exportarPdf(
      'Processos',
      ['Nº CNJ', 'Tribunal', 'Classe', 'Parte ativa', 'Parte passiva'],
      processosParaExportar.map((p) => [p.numero_cnj, p.tribunal ?? '', p.classe ?? '', p.parte_ativa ?? '', p.parte_passiva ?? '']),
      'processos',
    );
  };

  return (
    <>
      <Topbar titulo="Processos" subtitulo="Classe, movimentações e timeline via DataJud (CNJ)" />

      <main className="flex-1 px-6 py-6">
        {erro && (
          <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        {processoNaoEncontrado && <ProcessoProvisorio numeroCnj={numeroBuscado!} />}

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <FiltroProcessos filtros={filtros} onChange={setFiltros} tribunais={tribunais} classes={classes} tags={tags} />
          </div>
          {processos.length > 0 && (
            <button
              onClick={() => setSomenteFavoritos((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border shrink-0',
                somenteFavoritos
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                  : 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700',
              )}
            >
              <Star size={12} fill={somenteFavoritos ? 'currentColor' : 'none'} />
              Favoritos
            </button>
          )}
          {processos.length > 0 && (
            <button
              onClick={() => {
                setComparando((v) => !v);
                setSelecionadosComparar(new Set());
              }}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border shrink-0',
                comparando
                  ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                  : 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700',
              )}
            >
              <Scale size={12} />
              Selecionar
            </button>
          )}
          {processos.length > 0 && <BotaoExportar onExcel={exportarComoExcel} onPdf={exportarComoPdf} />}
        </div>

        {comparando && (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 px-3 py-2 text-sm">
            <span className="text-brand-700 dark:text-brand-400">
              {selecionadosComparar.size === 0
                ? 'Selecione processos para comparar ou exportar em lote'
                : `${selecionadosComparar.size} selecionado${selecionadosComparar.size > 1 ? 's' : ''} — Exportar acima já usa só esses`}
            </span>
            <button
              onClick={() => setComparadorAberto(true)}
              disabled={selecionadosComparar.size < 2}
              className="ml-auto rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1 text-xs font-medium text-white"
            >
              Comparar
            </button>
          </div>
        )}

        {loading ? (
          <SkeletonLista />
        ) : processos.length === 0 ? (
          <EmptyState
            titulo={temFiltroAtivo(filtros) ? 'Nenhum processo encontrado' : 'Nenhum processo enriquecido ainda'}
            descricao={
              temFiltroAtivo(filtros)
                ? 'Tente ajustar ou limpar os filtros atuais.'
                : 'Isso acontece automaticamente conforme novas publicações chegam.'
            }
          />
        ) : processosExibidos.length === 0 ? (
          <EmptyState titulo="Nenhum processo favoritado ainda" descricao="Clique na estrela de um processo para fixá-lo aqui." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
            <ul className="space-y-2 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
              {processosExibidos.map((p) => (
                <li
                  key={p._id}
                  onClick={() => {
                    if (comparando) {
                      setSelecionadosComparar((atual) => {
                        const novo = new Set(atual);
                        if (novo.has(p.numero_cnj)) novo.delete(p.numero_cnj);
                        else novo.add(p.numero_cnj);
                        return novo;
                      });
                      return;
                    }
                    setSelecionado(p);
                  }}
                  className={cn(
                    'rounded-xl border p-3 cursor-pointer transition-all duration-150',
                    comparando && selecionadosComparar.has(p.numero_cnj)
                      ? 'border-brand-400 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10'
                      : !comparando && selecionado?._id === p._id
                        ? 'border-brand-400 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10'
                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md hover:shadow-gray-200/60 dark:hover:shadow-black/20 hover:-translate-y-0.5',
                  )}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                    {comparando && (
                      <input
                        type="checkbox"
                        checked={selecionadosComparar.has(p.numero_cnj)}
                        onChange={() => {}}
                        className="shrink-0 rounded border-gray-300 dark:border-gray-700"
                      />
                    )}
                    {(() => {
                      const saude = saudeProcesso(p);
                      return saude ? <span className={cn('shrink-0 w-2 h-2 rounded-full', saude.cor)} title={saude.titulo} /> : null;
                    })()}
                    <span className="truncate flex-1">{tituloPartes(p) ?? formatarNumeroCnj(p.numero_cnj)}</span>
                    {p.provisorio && (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Provisório — aguardando DataJud" />
                    )}
                    <BotaoFavorito favorito={ehFavorito('processo', p._id)} onClick={() => alternar('processo', p._id)} />
                  </p>
                  {tituloPartes(p) && (
                    <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatarNumeroCnj(p.numero_cnj)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{p.classe ?? 'Classe não identificada'}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {(() => {
                      const area = areaDireito(p);
                      const Icone = area.icone;
                      return (
                        <span className="shrink-0 inline-flex" title={area.label}>
                          <Icone size={11} />
                        </span>
                      );
                    })()}
                    {p.tribunal ?? '—'}
                    {p.orgao_julgador && <span className="truncate">· {p.orgao_julgador}</span>}
                    {idadeProcesso(p) && (
                      <span className="shrink-0 ml-auto flex items-center gap-1" title="Tempo desde o ajuizamento">
                        <Clock size={11} /> {idadeProcesso(p)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {selecionado && (
              <DetalheProcesso
                key={selecionado._id}
                processo={selecionado}
                onAtualizado={(atualizado) => {
                  setSelecionado(atualizado);
                  setProcessos((atual) => atual.map((p) => (p._id === atualizado._id ? atualizado : p)));
                }}
              />
            )}
          </div>
        )}
      </main>

      {comparadorAberto && (
        <ComparadorProcessos
          processos={processos.filter((p) => selecionadosComparar.has(p.numero_cnj))}
          onFechar={() => setComparadorAberto(false)}
        />
      )}
    </>
  );
}

function ClienteVinculado({ clienteId, litisconsorte }: { clienteId: string; litisconsorte?: boolean }) {
  const router = useRouter();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    buscarCliente(clienteId)
      .then((c) => setNome(c.nome))
      .catch(() => setNome(null));
  }, [clienteId]);

  if (!nome) return null;

  return (
    <button
      onClick={() => router.push('/clientes')}
      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 hover:underline"
    >
      <UserRound size={11} /> {litisconsorte ? 'Litisconsorte' : 'Cliente'}: {nome}
    </button>
  );
}

function formatarNumeroCnj(numero: string) {
  if (numero.length !== 20) return numero;
  return `${numero.slice(0, 7)}-${numero.slice(7, 9)}.${numero.slice(9, 13)}.${numero.slice(13, 14)}.${numero.slice(14, 16)}.${numero.slice(16)}`;
}

/** Semaforo de saude do processo: vermelho = audiencia em ate 3 dias ou +90 dias sem
 * atualizacao; amarelo = audiencia em ate 7 dias ou +45 dias sem atualizacao; verde = ok. */
function saudeProcesso(p: Processo): { cor: string; titulo: string } | null {
  if (p.status !== 'ativo') return null;
  const agora = Date.now();

  if (p.proxima_audiencia) {
    const dias = (new Date(p.proxima_audiencia).getTime() - agora) / 86_400_000;
    if (dias >= 0 && dias <= 3) return { cor: 'bg-red-500', titulo: 'Audiência em até 3 dias' };
    if (dias > 3 && dias <= 7) return { cor: 'bg-amber-400', titulo: 'Audiência em até 7 dias' };
  }
  if (p.datajud_atualizado_em) {
    const dias = (agora - new Date(p.datajud_atualizado_em).getTime()) / 86_400_000;
    if (dias > 90) return { cor: 'bg-red-500', titulo: 'Sem atualização há mais de 90 dias' };
    if (dias > 45) return { cor: 'bg-amber-400', titulo: 'Sem atualização há mais de 45 dias' };
  }
  return { cor: 'bg-green-500', titulo: 'Em dia' };
}

type AbaProcesso = 'timeline' | 'movimentacoes' | 'arquivos' | 'tarefas' | 'financeiro' | 'historico' | 'notas';

const ABAS_PROCESSO: { id: AbaProcesso; label: string; icon: typeof Gavel }[] = [
  { id: 'timeline', label: 'Timeline', icon: HistoryIcon },
  { id: 'movimentacoes', label: 'Movimentações', icon: Gavel },
  { id: 'arquivos', label: 'Arquivos', icon: Paperclip },
  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet },
  { id: 'historico', label: 'Histórico', icon: ScrollText },
  { id: 'notas', label: 'Notas', icon: StickyNote },
];

const LABEL_HONORARIO: Record<string, string> = {
  fixo: 'Valor fixo',
  percentual: 'Percentual sobre a causa',
  exito: 'Êxito',
  misto: 'Misto',
};

function DetalheProcesso({ processo, onAtualizado }: { processo: Processo; onAtualizado: (p: Processo) => void }) {
  const [aba, setAba] = useState<AbaProcesso>('movimentacoes');
  const [editando, setEditando] = useState(false);
  const [apresentando, setApresentando] = useState(false);
  const [copilotoAberto, setCopilotoAberto] = useState(false);
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {tituloPartes(processo) && (
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{tituloPartes(processo)}</p>
            )}
            {processo.provisorio && (
              <span
                title="Criado a partir de publicações — o DataJud ainda não indexou este processo"
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
              >
                <AlertCircle size={11} /> Provisório
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => gerarCapaProcesso(processo)}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5"
            >
              <FileStack size={13} /> Gerar capa
            </button>
            <button
              onClick={() => setApresentando(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5"
            >
              <Presentation size={13} /> Modo apresentação
            </button>
            <button
              onClick={() => setCopilotoAberto(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5"
            >
              <Sparkles size={13} /> Copiloto IA
            </button>
          </div>
        </div>
        <p className="font-mono text-sm text-gray-500 dark:text-gray-400 mt-1">{formatarNumeroCnj(processo.numero_cnj)}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{processo.classe ?? 'Classe não identificada'}</p>
        {(processo.cliente_id || (processo.clientes_adicionais?.length ?? 0) > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {processo.cliente_id && <ClienteVinculado clienteId={processo.cliente_id} />}
            {processo.clientes_adicionais?.map((id) => <ClienteVinculado key={id} clienteId={id} litisconsorte />)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard icon={Landmark} label="Tribunal" valor={processo.tribunal} />
        <InfoCard icon={Building2} label="Órgão julgador" valor={processo.orgao_julgador} />
        <InfoCard
          icon={Calendar}
          label="Ajuizado em"
          valor={processo.data_ajuizamento ? new Date(processo.data_ajuizamento).toLocaleDateString('pt-BR') : undefined}
        />
        <InfoCard icon={DollarSign} label="Valor da causa" valor={formatarMoeda(processo.valor_causa) ?? undefined} />
      </div>

      <TagsProcesso processo={processo} onAtualizado={onAtualizado} />

      <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1">
            <Scale size={12} /> Detalhes do processo
          </p>
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              <Pencil size={11} /> Editar
            </button>
          )}
        </div>

        {editando ? (
          <DetalhesProcessoForm processo={processo} onCancelar={() => setEditando(false)} onSalvo={(p) => { onAtualizado(p); setEditando(false); }} />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Fase processual</p>
              <p className="text-gray-700 dark:text-gray-300">{processo.fase_processual || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Advogado da parte contrária</p>
              <p className="text-gray-700 dark:text-gray-300">{processo.advogado_parte_contraria || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Honorários</p>
              <p className="text-gray-700 dark:text-gray-300">
                {processo.honorarios?.tipo
                  ? [
                      LABEL_HONORARIO[processo.honorarios.tipo],
                      processo.honorarios.valor_fixo ? formatarMoeda(processo.honorarios.valor_fixo) : null,
                      processo.honorarios.percentual ? `${processo.honorarios.percentual}%` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : '—'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Observações</p>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{processo.observacoes || '—'}</p>
            </div>
          </div>
        )}
      </div>

      {processo.assuntos.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
            <Tag size={12} /> Assuntos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {processo.assuntos.map((a) => (
              <span
                key={a}
                className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-1 border-b border-gray-100 dark:border-gray-800 -mb-px">
          {ABAS_PROCESSO.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                aba === id
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              )}
            >
              <Icon size={14} />
              {label}
              {id === 'movimentacoes' && processo.movimentacoes.length > 0 && (
                <span className="text-xs text-gray-300 dark:text-gray-600">({processo.movimentacoes.length})</span>
              )}
            </button>
          ))}
        </div>

        <div className="pt-5">
          {aba === 'timeline' && (
            <>
              <ResumoIaCard processoId={processo._id} />
              <TimelineProcesso numeroProcesso={processo.numero_cnj} movimentacoes={processo.movimentacoes} />
            </>
          )}

          {aba === 'movimentacoes' && (
            <div>
              {processo.provisorio ? (
                <PublicacoesRelacionadas numeroCnj={processo.numero_cnj} />
              ) : processo.movimentacoes.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma movimentação registrada.</p>
              ) : (
                <ol className="relative border-l border-gray-200 dark:border-gray-800 ml-1.5 space-y-4">
                  {processo.movimentacoes.map((m, i) => (
                    <li key={i} className="ml-4">
                      <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-brand-500 mt-1.5" />
                      <p className="text-sm text-gray-800 dark:text-gray-200">{m.descricao}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(m.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      <AnexoMovimentacao numeroProcesso={processo.numero_cnj} movimentacaoChave={chaveMovimentacao(m)} />
                    </li>
                  ))}
                </ol>
              )}

              {processo.datajud_atualizado_em && (
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-6">
                  Dados via DataJud (CNJ), atualizados em{' '}
                  {new Date(processo.datajud_atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              )}
            </div>
          )}

          {aba === 'arquivos' && <ArquivosProcesso escopo={{ numeroProcesso: processo.numero_cnj }} />}

          {aba === 'tarefas' && <TarefasProcesso numeroProcesso={processo.numero_cnj} />}

          {aba === 'financeiro' && <FinanceiroProcesso numeroProcesso={processo.numero_cnj} />}

          {aba === 'historico' && <HistoricoAmigavel entidade="processo" entidadeId={processo.numero_cnj} />}

          {aba === 'notas' && <NotasRapidas entidade="processo" entidadeId={processo.numero_cnj} />}
        </div>
      </div>

      {apresentando && (
        <ModoApresentacao
          processo={processo}
          titulo={tituloPartes(processo) ?? formatarNumeroCnj(processo.numero_cnj)}
          numeroFormatado={formatarNumeroCnj(processo.numero_cnj)}
          onFechar={() => setApresentando(false)}
        />
      )}

      {copilotoAberto && (
        <CopilotoIaModal processoId={processo._id} numeroCnj={processo.numero_cnj} onFechar={() => setCopilotoAberto(false)} />
      )}
    </div>
  );
}

function TagsProcesso({ processo, onAtualizado }: { processo: Processo; onAtualizado: (p: Processo) => void }) {
  const [novaTag, setNovaTag] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvarTags = async (tags: string[]) => {
    setSalvando(true);
    try {
      const atualizado = await atualizarProcesso(processo.numero_cnj, { tags });
      onAtualizado(atualizado);
    } finally {
      setSalvando(false);
    }
  };

  const adicionar = () => {
    const valor = novaTag.trim();
    if (!valor || processo.tags.includes(valor)) {
      setNovaTag('');
      return;
    }
    setNovaTag('');
    salvarTags([...processo.tags, valor]);
  };

  const remover = (tag: string) => {
    salvarTags(processo.tags.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tag size={12} className="text-gray-300 dark:text-gray-600 shrink-0" />
      {processo.tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800"
        >
          {tag}
          <button onClick={() => remover(tag)} disabled={salvando} className="hover:text-red-600 dark:hover:text-red-400">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={novaTag}
        onChange={(e) => setNovaTag(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            adicionar();
          }
        }}
        onBlur={adicionar}
        placeholder="+ tag"
        disabled={salvando}
        className="w-20 text-xs bg-transparent outline-none text-gray-500 dark:text-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
      />
    </div>
  );
}

function DetalhesProcessoForm({
  processo,
  onCancelar,
  onSalvo,
}: {
  processo: Processo;
  onCancelar: () => void;
  onSalvo: (p: Processo) => void;
}) {
  const [form, setForm] = useState<AtualizarProcesso>({
    fase_processual: processo.fase_processual,
    advogado_parte_contraria: processo.advogado_parte_contraria,
    observacoes: processo.observacoes,
    honorarios: processo.honorarios,
    status: processo.status,
    responsavel_id: processo.responsavel_id,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    listarUsuarios()
      .then(setUsuarios)
      .catch(() => undefined);
  }, []);

  const [conflito, setConflito] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    setConflito(false);
    try {
      const atualizado = await atualizarProcesso(processo.numero_cnj, { ...form, versao_esperada: processo.updated_at });
      onSalvo(atualizado);
    } catch (err) {
      if (err instanceof Error && err.message.includes('API 409')) {
        setConflito(true);
      } else {
        setErro(err instanceof Error ? err.message : 'erro ao salvar');
      }
    } finally {
      setSalvando(false);
    }
  };

  const divisoes = form.honorarios?.divisoes ?? [];
  const somaDivisoes = divisoes.reduce((acc, d) => acc + (d.percentual || 0), 0);

  const adicionarDivisao = () => {
    const disponivel = usuarios.find((u) => !divisoes.some((d) => d.usuario_id === u._id));
    if (!disponivel) return;
    setForm({
      ...form,
      honorarios: { ...form.honorarios, divisoes: [...divisoes, { usuario_id: disponivel._id, percentual: 0 }] },
    });
  };

  const atualizarDivisao = (index: number, patch: Partial<{ usuario_id: string; percentual: number }>) => {
    const novas = divisoes.map((d, i) => (i === index ? { ...d, ...patch } : d));
    setForm({ ...form, honorarios: { ...form.honorarios, divisoes: novas } });
  };

  const removerDivisao = (index: number) => {
    setForm({ ...form, honorarios: { ...form.honorarios, divisoes: divisoes.filter((_, i) => i !== index) } });
  };

  const inputCls =
    'w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Fase processual</span>
          <input
            value={form.fase_processual ?? ''}
            onChange={(e) => setForm({ ...form, fase_processual: e.target.value })}
            placeholder="Ex.: Instrução, recursal…"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Advogado da parte contrária</span>
          <input
            value={form.advogado_parte_contraria ?? ''}
            onChange={(e) => setForm({ ...form, advogado_parte_contraria: e.target.value })}
            className={inputCls}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Advogado responsável</span>
        <select
          value={form.responsavel_id ?? ''}
          onChange={(e) => setForm({ ...form, responsavel_id: e.target.value || undefined })}
          className={inputCls}
        >
          <option value="">—</option>
          {usuarios.map((u) => (
            <option key={u._id} value={u._id}>
              {u.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Status</span>
        <select value={form.status ?? ''} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
          <option value="ativo">Ativo</option>
          <option value="suspenso">Suspenso</option>
          <option value="encerrado">Encerrado</option>
          <option value="arquivado">Arquivado</option>
        </select>
        {form.status === 'encerrado' && form.honorarios?.tipo && (
          <p className="text-[11px] text-brand-600 dark:text-brand-400 mt-1">
            Ao salvar, um lançamento de honorários de êxito será criado automaticamente no Financeiro.
          </p>
        )}
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Honorários</span>
          <select
            value={form.honorarios?.tipo ?? ''}
            onChange={(e) =>
              setForm({ ...form, honorarios: { ...form.honorarios, tipo: (e.target.value || undefined) as TipoHonorario | undefined } })
            }
            className={inputCls}
          >
            <option value="">—</option>
            <option value="fixo">Valor fixo</option>
            <option value="percentual">Percentual sobre a causa</option>
            <option value="exito">Êxito</option>
            <option value="misto">Misto</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Valor fixo (R$)</span>
          <input
            value={form.honorarios?.valor_fixo ?? ''}
            onChange={(e) => setForm({ ...form, honorarios: { ...form.honorarios, valor_fixo: e.target.value ? Number(e.target.value) : undefined } })}
            type="number"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Percentual (%)</span>
          <input
            value={form.honorarios?.percentual ?? ''}
            onChange={(e) => setForm({ ...form, honorarios: { ...form.honorarios, percentual: e.target.value ? Number(e.target.value) : undefined } })}
            type="number"
            className={inputCls}
          />
        </label>
      </div>

      {form.honorarios?.tipo && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Split entre sócios/advogados</span>
            {divisoes.length > 0 && (
              <span className={cn('text-xs', somaDivisoes === 100 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
                {somaDivisoes}% distribuído
              </span>
            )}
          </div>
          <div className="space-y-2">
            {divisoes.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={d.usuario_id}
                  onChange={(e) => atualizarDivisao(i, { usuario_id: e.target.value })}
                  className={cn(inputCls, 'flex-1')}
                >
                  {usuarios.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={d.percentual || ''}
                  onChange={(e) => atualizarDivisao(i, { percentual: Number(e.target.value) })}
                  placeholder="%"
                  className={cn(inputCls, 'w-20')}
                />
                <button onClick={() => removerDivisao(i)} className="p-2 rounded-lg text-gray-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          {divisoes.length < usuarios.length && (
            <button onClick={adicionarDivisao} className="mt-2 text-xs text-brand-600 dark:text-brand-400 hover:underline">
              + Adicionar sócio/advogado
            </button>
          )}
        </div>
      )}

      <label className="block">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Observações</span>
        <textarea
          value={form.observacoes ?? ''}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          rows={3}
          className={cn(inputCls, 'resize-none')}
        />
      </label>

      {conflito && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 space-y-2">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Este processo foi alterado por outra pessoa enquanto você editava. Recarregue para ver a versão mais recente
            antes de salvar suas mudanças.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
          >
            Recarregar página
          </button>
        </div>
      )}

      {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={salvar}
          disabled={salvando}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-1.5 text-sm font-medium text-white transition disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button onClick={onCancelar} className="text-sm px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, valor }: { icon: typeof Landmark; label: string; valor?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
      <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mb-1">
        <Icon size={11} /> {label}
      </p>
      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{valor ?? '—'}</p>
    </div>
  );
}

/**
 * Enquanto o DataJud nao indexou o processo (defasagem normal, especialmente em casos
 * recentes), mostramos o que ja sabemos a partir das proprias publicacoes - nao deixa
 * o advogado sem nada so porque o enriquecimento externo ainda nao rodou.
 */
function ProcessoProvisorio({ numeroCnj }: { numeroCnj: string }) {
  const [publicacoes, setPublicacoes] = useState<Publicacao[] | null>(null);

  useEffect(() => {
    listarPublicacoes({ busca: numeroCnj, limite: 50 })
      .then((r) => setPublicacoes(r.itens.filter((p) => p.numero_processo === numeroCnj)))
      .catch(() => setPublicacoes([]));
  }, [numeroCnj]);

  if (publicacoes === null) return null;
  if (publicacoes.length === 0) {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/50 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
        <AlertCircle size={14} className="shrink-0" />
        Processo não encontrado.
      </div>
    );
  }

  const maisRecente = publicacoes[0];
  const ativa = publicacoes.find((p) => p.parte_ativa)?.parte_ativa;
  const passiva = publicacoes.find((p) => p.parte_passiva)?.parte_passiva;
  const eventos = publicacoes
    .filter((p) => p.audiencia_data || p.prazo_data_limite)
    .map((p) => ({
      tipo: p.audiencia_data ? ('audiencia' as const) : ('prazo' as const),
      data: p.audiencia_data ?? p.prazo_data_limite!,
    }));

  return (
    <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-5">
      <div className="flex items-start gap-2 mb-4">
        <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Esse processo ainda não foi enriquecido com dados do DataJud (indexação externa tem defasagem, principalmente
          em casos recentes). Mostrando o que já sabemos a partir das publicações recebidas.
        </p>
      </div>

      {(ativa || passiva) && (
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {ativa && passiva ? `${capitalizarNome(ativa)} x ${capitalizarNome(passiva)}` : capitalizarNome(ativa ?? passiva!)}
        </p>
      )}
      <p className="font-mono text-sm text-gray-500 dark:text-gray-400 mb-4">{formatarNumeroCnj(numeroCnj)}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <InfoCard icon={Landmark} label="Tribunal" valor={maisRecente.tribunal} />
        {maisRecente.nome_orgao && <InfoCard icon={Building2} label="Órgão" valor={maisRecente.nome_orgao} />}
        {maisRecente.classe_processual && <InfoCard icon={Tag} label="Classe" valor={maisRecente.classe_processual} />}
      </div>

      {eventos.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
            <CalendarClock size={12} /> Datas identificadas
          </p>
          <ul className="space-y-1">
            {eventos.map((e, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Clock size={12} className="text-gray-400" />
                {e.tipo === 'audiencia' ? 'Audiência' : 'Prazo'} —{' '}
                {new Date(e.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">
          Publicações ({publicacoes.length})
        </p>
        <ul className="space-y-2">
          {publicacoes.map((p) => (
            <li key={p._id} className="rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3">
              <p className="text-xs text-gray-400 mb-1">
                {new Date(p.data_disponibilizacao).toLocaleDateString('pt-BR')}
                {p.tipo_comunicacao && ` · ${p.tipo_comunicacao}`}
              </p>
              {p.inteiro_teor_texto && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{p.inteiro_teor_texto}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Usado dentro de um processo provisorio ja existente: lista as publicacoes e datas
 * identificadas no lugar das movimentacoes (que so o DataJud fornece). */
function PublicacoesRelacionadas({ numeroCnj }: { numeroCnj: string }) {
  const [publicacoes, setPublicacoes] = useState<Publicacao[] | null>(null);

  useEffect(() => {
    listarPublicacoes({ busca: numeroCnj, limite: 50 })
      .then((r) => setPublicacoes(r.itens.filter((p) => p.numero_processo === numeroCnj)))
      .catch(() => setPublicacoes([]));
  }, [numeroCnj]);

  if (publicacoes === null) return <p className="text-sm text-gray-400">Carregando…</p>;

  const eventos = publicacoes
    .filter((p) => p.audiencia_data || p.prazo_data_limite)
    .map((p) => ({
      tipo: p.audiencia_data ? ('audiencia' as const) : ('prazo' as const),
      data: p.audiencia_data ?? p.prazo_data_limite!,
    }));

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4">
      <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
        Ainda sem movimentações do DataJud — mostrando o que já sabemos a partir das publicações recebidas.
      </p>

      {eventos.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
            <CalendarClock size={12} /> Datas identificadas
          </p>
          <ul className="space-y-1">
            {eventos.map((e, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Clock size={12} className="text-gray-400" />
                {e.tipo === 'audiencia' ? 'Audiência' : 'Prazo'} —{' '}
                {new Date(e.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-2">
        {publicacoes.map((p) => (
          <li key={p._id} className="rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3">
            <p className="text-xs text-gray-400 mb-1">
              {new Date(p.data_disponibilizacao).toLocaleDateString('pt-BR')}
              {p.tipo_comunicacao && ` · ${p.tipo_comunicacao}`}
            </p>
            {p.inteiro_teor_texto && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{p.inteiro_teor_texto}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ORDENACAO_OPCOES = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'numero', label: 'Número do processo' },
  { value: 'nome', label: 'Nome da parte' },
  { value: 'audiencia', label: 'Próxima audiência' },
];

function FiltroProcessos({
  filtros,
  onChange,
  tribunais,
  classes,
  tags,
}: {
  filtros: FiltrosProcessos;
  onChange: (f: FiltrosProcessos) => void;
  tribunais: string[];
  classes: string[];
  tags: string[];
}) {
  const set = (parcial: Partial<FiltrosProcessos>) => onChange({ ...filtros, ...parcial });
  const { salvos, salvar, remover } = useFiltrosSalvos<FiltrosProcessos>('processos');
  const [nomeNovoFiltro, setNomeNovoFiltro] = useState<string | null>(null);

  return (
    <div className="mb-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5 flex-1 min-w-[200px]">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          value={filtros.busca ?? ''}
          onChange={(e) => set({ busca: e.target.value })}
          placeholder="Buscar por processo ou nome das partes…"
          className="bg-transparent text-sm outline-none flex-1 placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
        />
      </div>

      <select
        value={filtros.status ?? ''}
        onChange={(e) => set({ status: e.target.value })}
        className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
      >
        <option value="">Todos os status</option>
        <optgroup label="Ativo">
          <option value="ativo">Todos os ativos</option>
          <option value="ativo_audiencia_agendada">Audiência agendada</option>
          <option value="ativo_aguardando_sentenca">Aguardando sentença</option>
        </optgroup>
        <option value="suspenso">Suspenso</option>
        <option value="encerrado">Encerrado</option>
        <option value="arquivado">Arquivado</option>
      </select>

      <select
        value={filtros.ordenacao ?? 'recentes'}
        onChange={(e) => set({ ordenacao: e.target.value })}
        className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
      >
        {ORDENACAO_OPCOES.map((o) => (
          <option key={o.value} value={o.value}>
            Ordenar: {o.label}
          </option>
        ))}
      </select>

      <select
        value={filtros.tribunal ?? ''}
        onChange={(e) => set({ tribunal: e.target.value })}
        className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
      >
        <option value="">Todos os tribunais</option>
        {tribunais.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        value={filtros.classe ?? ''}
        onChange={(e) => set({ classe: e.target.value })}
        className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300 max-w-[220px]"
      >
        <option value="">Todas as classes</option>
        {classes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {tags.length > 0 && (
        <select
          value={filtros.tag ?? ''}
          onChange={(e) => set({ tag: e.target.value })}
          className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300 max-w-[160px]"
        >
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}

      {temFiltroAtivo(filtros) && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5"
        >
          <X size={12} /> limpar
        </button>
      )}

      {salvos.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            const item = salvos.find((s) => s.id === e.target.value);
            if (item) onChange(item.filtros);
          }}
          className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300 max-w-[180px]"
        >
          <option value="">Filtros salvos…</option>
          {salvos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      )}

      {salvos.length > 0 &&
        (() => {
          const atual = filtros;
          const selecionadoParaRemover = salvos.find((s) => JSON.stringify(s.filtros) === JSON.stringify(atual));
          return selecionadoParaRemover ? (
            <button
              onClick={() => remover(selecionadoParaRemover.id)}
              title={`Remover filtro salvo "${selecionadoParaRemover.nome}"`}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1.5"
            >
              <Bookmark size={12} className="fill-current" />
            </button>
          ) : null;
        })()}

      {temFiltroAtivo(filtros) &&
        (nomeNovoFiltro === null ? (
          <button
            onClick={() => setNomeNovoFiltro('')}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5"
          >
            <BookmarkPlus size={12} /> salvar filtro
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={nomeNovoFiltro}
              onChange={(e) => setNomeNovoFiltro(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nomeNovoFiltro.trim()) {
                  salvar(nomeNovoFiltro.trim(), filtros);
                  setNomeNovoFiltro(null);
                } else if (e.key === 'Escape') {
                  setNomeNovoFiltro(null);
                }
              }}
              placeholder="Nome do filtro"
              className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-700 dark:text-gray-300 w-32"
            />
            <button
              onClick={() => {
                if (nomeNovoFiltro.trim()) {
                  salvar(nomeNovoFiltro.trim(), filtros);
                  setNomeNovoFiltro(null);
                }
              }}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-1"
            >
              salvar
            </button>
            <button
              onClick={() => setNomeNovoFiltro(null)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-1"
            >
              <X size={12} />
            </button>
          </div>
        ))}
    </div>
  );
}
