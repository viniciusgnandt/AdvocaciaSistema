'use client';

import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Phone, StickyNote, Trash2, Users, Video } from 'lucide-react';
import { criarNota, excluirNota, listarNotas, usuarioLogado, type CanalContato, type Nota } from '@/lib/api';

const CANAIS: { valor: CanalContato; label: string; icon: typeof Phone }[] = [
  { valor: 'ligacao', label: 'Ligação', icon: Phone },
  { valor: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { valor: 'email', label: 'E-mail', icon: Mail },
  { valor: 'reuniao', label: 'Reunião', icon: Video },
  { valor: 'presencial', label: 'Presencial', icon: Users },
];

const CANAL_LABEL: Record<CanalContato, string> = {
  ligacao: 'Ligação',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  reuniao: 'Reunião',
  presencial: 'Presencial',
};

function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} dia${d > 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function NotasRapidas({ entidade, entidadeId }: { entidade: 'processo' | 'cliente'; entidadeId: string }) {
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [texto, setTexto] = useState('');
  const [canal, setCanal] = useState<CanalContato | null>(null);
  const [salvando, setSalvando] = useState(false);
  const usuario = usuarioLogado();

  useEffect(() => {
    listarNotas(entidade, entidadeId)
      .then(setNotas)
      .catch(() => setNotas([]));
  }, [entidade, entidadeId]);

  const adicionar = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    try {
      const nota = await criarNota(entidade, entidadeId, texto.trim(), canal ?? undefined);
      setNotas((atual) => [nota, ...(atual ?? [])]);
      setTexto('');
      setCanal(null);
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id: string) => {
    setNotas((atual) => atual?.filter((n) => n._id !== id) ?? null);
    excluirNota(id).catch(() => undefined);
  };

  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        <StickyNote className="h-4 w-4" />
        {entidade === 'cliente' ? 'Notas e contatos' : 'Notas rápidas'}
      </div>

      {entidade === 'cliente' && (
        <div className="flex flex-wrap gap-1.5">
          {CANAIS.map(({ valor, label, icon: Icon }) => (
            <button
              key={valor}
              onClick={() => setCanal((atual) => (atual === valor ? null : valor))}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                canal === valor
                  ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-400'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon size={11} /> {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              adicionar();
            }
          }}
          rows={2}
          placeholder={canal ? `Registrar ${CANAL_LABEL[canal].toLowerCase()}…` : 'Anotar algo rápido sobre este caso…'}
          className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
        />
        <button
          onClick={adicionar}
          disabled={salvando || !texto.trim()}
          className="shrink-0 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 px-3 py-2 text-xs font-medium text-white self-end"
        >
          Salvar
        </button>
      </div>

      {notas === null ? (
        <p className="text-sm text-neutral-400">Carregando…</p>
      ) : notas.length === 0 ? (
        <p className="text-sm text-neutral-400">Nenhuma nota ainda.</p>
      ) : (
        <ul className="space-y-2">
          {notas.map((n) => (
            <li key={n._id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-2.5 text-sm">
              {n.canal && (
                <span className="inline-block mb-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {CANAL_LABEL[n.canal]}
                </span>
              )}
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{n.texto}</p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-gray-400">
                  {n.usuario_nome} · {tempoRelativo(n.created_at)}
                </p>
                {(n.usuario_id === usuario?.id || usuario?.perfil === 'admin') && (
                  <button onClick={() => remover(n._id)} className="text-gray-300 hover:text-red-600 dark:hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
