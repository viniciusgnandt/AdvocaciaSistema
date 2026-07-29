'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Clock, Gavel, Landmark, Users } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { StatusBadge, UrgenciaBadge } from '@/components/ui/Badge';
import { buscarAgenda, type AgendaEvento } from '@/lib/api';
import { cn } from '@/lib/cn';

function hojeISO(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: '7 dias', dias: 7 },
  { label: '15 dias', dias: 15 },
  { label: '30 dias', dias: 30 },
  { label: '90 dias', dias: 90 },
];

export default function AgendaPage() {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO(30));
  const [presetAtivo, setPresetAtivo] = useState(30);
  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resposta = await buscarAgenda(dataInicio, dataFim);
      setEventos(resposta.eventos);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const aplicarPreset = (dias: number) => {
    setPresetAtivo(dias);
    setDataInicio(hojeISO());
    setDataFim(hojeISO(dias));
  };

  const grupos = useMemo(() => {
    const mapa = new Map<string, AgendaEvento[]>();
    for (const evento of eventos) {
      const chave = evento.data ? evento.data.slice(0, 10) : 'sem-data';
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(evento);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [eventos]);

  return (
    <>
      <Topbar titulo="Agenda" subtitulo="Audiências e prazos identificados automaticamente nas publicações" />

      <main className="flex-1 px-6 py-6 space-y-5">
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.dias}
                onClick={() => aplicarPreset(p.dias)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                  presetAtivo === p.dias
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                )}
              >
                Próximos {p.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              De
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setPresetAtivo(-1);
                  setDataInicio(e.target.value);
                }}
                className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1 text-gray-700 dark:text-gray-300"
              />
            </label>
            <label className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              até
              <input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setPresetAtivo(-1);
                  setDataFim(e.target.value);
                }}
                className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1 text-gray-700 dark:text-gray-300"
              />
            </label>
          </div>
        </div>

        {erro && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando…</p>
        ) : grupos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center text-gray-400 text-sm">
            Nenhuma audiência ou prazo no período selecionado.
          </div>
        ) : (
          <div className="space-y-5">
            {grupos.map(([data, itens]) => (
              <div key={data}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  {new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </p>
                <ul className="space-y-2">
                  {itens.map((evento) => {
                    const hora = evento.data
                      ? new Date(evento.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : null;
                    return (
                      <li
                        key={`${evento.tipo}-${evento.publicacao_id}`}
                        onClick={() => router.push(`/processos?numero=${evento.numero_processo}`)}
                        className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 cursor-pointer hover:border-brand-300 dark:hover:border-brand-800 hover:shadow-sm transition-all"
                      >
                        <div
                          className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                            evento.tipo === 'audiencia'
                              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                              : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                          )}
                        >
                          {evento.tipo === 'audiencia' ? <Gavel size={16} /> : <CalendarClock size={16} />}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{evento.titulo}</p>
                            {hora && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                <Clock size={11} /> {hora}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-mono">
                            <Landmark size={11} className="shrink-0" /> {evento.tribunal ?? '—'} ·{' '}
                            {evento.numero_processo}
                          </p>

                          {evento.nome_orgao && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">{evento.nome_orgao}</p>
                          )}

                          {evento.advogados.length > 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-start gap-1">
                              <Users size={11} className="shrink-0 mt-0.5" /> {evento.advogados.join(', ')}
                            </p>
                          )}

                          {evento.resumo && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2">{evento.resumo}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <UrgenciaBadge valor={evento.urgencia} />
                          <StatusBadge valor={evento.status} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
