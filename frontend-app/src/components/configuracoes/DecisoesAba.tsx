'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Gavel, Plus, X } from 'lucide-react';
import {
  aprovarDecisao,
  criarDecisao,
  listarDecisoes,
  rejeitarDecisao,
  usuarioLogado,
  type Decisao,
} from '@/lib/api';

const STATUS_LABEL: Record<Decisao['status'], string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
};

const STATUS_COR: Record<Decisao['status'], string> = {
  pendente: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  aprovada: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  rejeitada: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export function DecisoesAba() {
  const [decisoes, setDecisoes] = useState<Decisao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ehAdmin = usuarioLogado()?.perfil === 'admin';

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setDecisoes(await listarDecisoes());
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar pedidos de decisão');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const decidir = async (id: string, aprovar: boolean) => {
    try {
      if (aprovar) await aprovarDecisao(id);
      else await rejeitarDecisao(id);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao registrar decisão');
    }
  };

  const pendentes = decisoes.filter((d) => d.status === 'pendente');
  const resolvidas = decisoes.filter((d) => d.status !== 'pendente');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Aprovação entre sócios</p>
          <p className="text-xs text-gray-400">
            Registre decisões que precisam do aval de um sócio/admin antes de seguir (ex.: aceitar um acordo, conceder um desconto)
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition"
        >
          <Plus size={14} /> Novo pedido
        </button>
      </div>

      {erro && <p className="text-xs text-red-600 dark:text-red-400 mb-3">{erro}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : decisoes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-10 text-center text-sm text-gray-400">
          Nenhum pedido de decisão registrado ainda.
        </div>
      ) : (
        <div className="space-y-5">
          {pendentes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pendentes ({pendentes.length})</p>
              {pendentes.map((d) => (
                <div key={d._id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.titulo}</p>
                      {d.descricao && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{d.descricao}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        Solicitado por {d.solicitado_por_nome}
                        {d.numero_processo && ` · processo ${d.numero_processo}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COR[d.status]}`}>{STATUS_LABEL[d.status]}</span>
                  </div>
                  {ehAdmin && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => decidir(d._id, true)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"
                      >
                        <Check size={12} /> Aprovar
                      </button>
                      <button
                        onClick={() => decidir(d._id, false)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                      >
                        <X size={12} /> Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {resolvidas.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Resolvidos</p>
              {resolvidas.map((d) => (
                <div key={d._id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 opacity-80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.titulo}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {d.decidido_por_nome && `${STATUS_LABEL[d.status]} por ${d.decidido_por_nome}`}
                        {d.decidido_em && ` em ${new Date(d.decidido_em).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COR[d.status]}`}>{STATUS_LABEL[d.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalAberto && (
        <NovoPedidoModal
          onFechar={() => setModalAberto(false)}
          onCriado={async () => {
            setModalAberto(false);
            await carregar();
          }}
        />
      )}
    </div>
  );
}

function NovoPedidoModal({ onFechar, onCriado }: { onFechar: () => void; onCriado: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    if (!titulo.trim()) {
      setErro('Informe um título.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await criarDecisao({ titulo: titulo.trim(), descricao: descricao.trim() || undefined, numero_processo: numeroProcesso.trim() || undefined });
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao registrar pedido');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div onClick={onFechar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Gavel size={15} className="text-brand-500" /> Pedir aprovação
          </p>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Título</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Aceitar acordo de R$ 15.000 com o cliente X"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Detalhes (opcional)</span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 resize-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Número do processo (opcional)</span>
            <input
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {salvando ? 'Enviando…' : 'Enviar pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}
