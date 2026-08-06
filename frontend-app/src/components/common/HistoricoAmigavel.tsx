'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { listarHistoricoDaEntidade, type LogAuditoria } from '@/lib/api';
import { cn } from '@/lib/cn';

const ROTULOS_ACAO: Record<LogAuditoria['acao'], string> = {
  criar: 'criou o registro',
  atualizar: 'atualizou o registro',
  excluir: 'excluiu o registro',
};

const CORES_ACAO: Record<LogAuditoria['acao'], string> = {
  criar: 'bg-emerald-500',
  atualizar: 'bg-sky-500',
  excluir: 'bg-rose-500',
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
  const mesAno = new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return mesAno;
}

function nomeDoEmail(email: string): string {
  const usuario = email.split('@')[0] ?? email;
  return usuario
    .split(/[._]/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

export default function HistoricoAmigavel({
  entidade,
  entidadeId,
}: {
  entidade: 'cliente' | 'processo';
  entidadeId: string;
}) {
  const [logs, setLogs] = useState<LogAuditoria[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    listarHistoricoDaEntidade(entidade, entidadeId)
      .then((dados) => {
        if (ativo) setLogs(dados);
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar o histórico.');
      });
    return () => {
      ativo = false;
    };
  }, [entidade, entidadeId]);

  if (erro) {
    return <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>;
  }

  if (!logs) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Carregando histórico...</p>;
  }

  if (logs.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Nenhuma alteração registrada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        <History className="h-4 w-4" />
        Histórico de alterações
      </div>
      <ol className="relative ml-1.5 space-y-4 border-l border-neutral-200 pl-4 dark:border-neutral-700">
        {logs.map((log) => (
          <li key={log._id} className="relative">
            <span
              className={cn(
                'absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-neutral-900',
                CORES_ACAO[log.acao],
              )}
            />
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {nomeDoEmail(log.usuario_email)}
              </span>{' '}
              {log.descricao || ROTULOS_ACAO[log.acao]}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{tempoRelativo(log.created_at)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
