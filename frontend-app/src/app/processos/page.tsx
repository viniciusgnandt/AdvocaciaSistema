'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarClock,
  CheckSquare,
  Clock,
  DollarSign,
  Gavel,
  Landmark,
  Paperclip,
  Search,
  Tag,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import {
  buscarCliente,
  chaveMovimentacao,
  listarProcessos,
  listarPublicacoes,
  type FiltrosProcessos,
  type Processo,
  type Publicacao,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { ArquivosProcesso } from '@/components/processos/ArquivosProcesso';
import { AnexoMovimentacao } from '@/components/processos/AnexoMovimentacao';
import { FinanceiroProcesso } from '@/components/processos/FinanceiroProcesso';
import { TarefasProcesso } from '@/components/processos/TarefasProcesso';
import { BotaoExportar } from '@/components/ui/BotaoExportar';
import { exportarExcel, exportarPdf } from '@/lib/exportar';

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
  return !!(filtros.tribunal || filtros.classe || filtros.status || filtros.busca);
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
  const [selecionado, setSelecionado] = useState<Processo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resposta = await listarProcessos(filtros);
      setProcessos(resposta.itens);
      setTribunais(resposta.filtrosDisponiveis.tribunais);
      setClasses(resposta.filtrosDisponiveis.classes);
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

  const exportarComoExcel = () => {
    exportarExcel(
      processos.map((p) => ({
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
      processos.map((p) => [p.numero_cnj, p.tribunal ?? '', p.classe ?? '', p.parte_ativa ?? '', p.parte_passiva ?? '']),
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
            <FiltroProcessos filtros={filtros} onChange={setFiltros} tribunais={tribunais} classes={classes} />
          </div>
          {processos.length > 0 && <BotaoExportar onExcel={exportarComoExcel} onPdf={exportarComoPdf} />}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando…</p>
        ) : processos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center text-gray-400 text-sm">
            {temFiltroAtivo(filtros)
              ? 'Nenhum processo encontrado com os filtros atuais.'
              : 'Nenhum processo enriquecido ainda. Isso acontece automaticamente conforme novas publicações chegam.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
            <ul className="space-y-2 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
              {processos.map((p) => (
                <li
                  key={p._id}
                  onClick={() => setSelecionado(p)}
                  className={cn(
                    'rounded-xl border p-3 cursor-pointer transition-all',
                    selecionado?._id === p._id
                      ? 'border-brand-400 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10'
                      : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700',
                  )}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                    <span className="truncate">{tituloPartes(p) ?? formatarNumeroCnj(p.numero_cnj)}</span>
                    {p.provisorio && (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Provisório — aguardando DataJud" />
                    )}
                  </p>
                  {tituloPartes(p) && (
                    <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatarNumeroCnj(p.numero_cnj)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{p.classe ?? 'Classe não identificada'}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <Landmark size={11} /> {p.tribunal ?? '—'}
                    {p.orgao_julgador && <span className="truncate">· {p.orgao_julgador}</span>}
                  </div>
                </li>
              ))}
            </ul>

            {selecionado && <DetalheProcesso key={selecionado._id} processo={selecionado} />}
          </div>
        )}
      </main>
    </>
  );
}

function ClienteVinculado({ clienteId }: { clienteId: string }) {
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
      className="mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 hover:underline"
    >
      <UserRound size={11} /> Cliente: {nome}
    </button>
  );
}

function formatarNumeroCnj(numero: string) {
  if (numero.length !== 20) return numero;
  return `${numero.slice(0, 7)}-${numero.slice(7, 9)}.${numero.slice(9, 13)}.${numero.slice(13, 14)}.${numero.slice(14, 16)}.${numero.slice(16)}`;
}

type AbaProcesso = 'movimentacoes' | 'arquivos' | 'tarefas' | 'financeiro';

const ABAS_PROCESSO: { id: AbaProcesso; label: string; icon: typeof Gavel }[] = [
  { id: 'movimentacoes', label: 'Movimentações', icon: Gavel },
  { id: 'arquivos', label: 'Arquivos', icon: Paperclip },
  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet },
];

function DetalheProcesso({ processo }: { processo: Processo }) {
  const [aba, setAba] = useState<AbaProcesso>('movimentacoes');
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-6">
      <div>
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
        <p className="font-mono text-sm text-gray-500 dark:text-gray-400 mt-1">{formatarNumeroCnj(processo.numero_cnj)}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{processo.classe ?? 'Classe não identificada'}</p>
        {processo.cliente_id && <ClienteVinculado clienteId={processo.cliente_id} />}
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
        </div>
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
}: {
  filtros: FiltrosProcessos;
  onChange: (f: FiltrosProcessos) => void;
  tribunais: string[];
  classes: string[];
}) {
  const set = (parcial: Partial<FiltrosProcessos>) => onChange({ ...filtros, ...parcial });

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

      {temFiltroAtivo(filtros) && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5"
        >
          <X size={12} /> limpar
        </button>
      )}
    </div>
  );
}
