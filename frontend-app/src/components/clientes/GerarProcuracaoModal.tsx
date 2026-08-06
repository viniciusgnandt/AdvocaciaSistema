'use client';

import { useEffect, useState } from 'react';
import { FileSignature, X } from 'lucide-react';
import { listarUsuarios, type Cliente, type Usuario } from '@/lib/api';
import { gerarProcuracaoPdf } from '@/lib/procuracao';

export function GerarProcuracaoModal({
  cliente,
  processosVinculados,
  onFechar,
}: {
  cliente: Cliente;
  processosVinculados: { numero_cnj: string }[];
  onFechar: () => void;
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [advogadoId, setAdvogadoId] = useState('');
  const [tipo, setTipo] = useState<'geral' | 'especifica'>('geral');
  const [numeroCnj, setNumeroCnj] = useState(processosVinculados[0]?.numero_cnj ?? '');
  const [poderesExtras, setPoderesExtras] = useState('');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listarUsuarios()
      .then((lista) => {
        setUsuarios(lista);
        const comOab = lista.find((u) => u.oab);
        setAdvogadoId((comOab ?? lista[0])?._id ?? '');
      })
      .catch(() => undefined);
  }, []);

  const gerar = async () => {
    const advogado = usuarios.find((u) => u._id === advogadoId);
    if (!advogado) {
      setErro('Selecione um advogado.');
      return;
    }
    if (tipo === 'especifica' && !numeroCnj.trim()) {
      setErro('Informe o número do processo para procuração específica.');
      return;
    }
    setGerando(true);
    setErro(null);
    try {
      await gerarProcuracaoPdf({ cliente, advogado, tipo, numeroCnj: tipo === 'especifica' ? numeroCnj : undefined, poderesExtras });
      onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao gerar procuração');
    } finally {
      setGerando(false);
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
            <FileSignature size={15} className="text-brand-500" /> Gerar procuração
          </p>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Advogado outorgado</span>
            <select
              value={advogadoId}
              onChange={(e) => setAdvogadoId(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              {usuarios.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.nome}
                  {u.oab ? ` — OAB ${u.oab}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            {(['geral', 'especifica'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={
                  'flex-1 text-sm py-1.5 rounded-lg border transition-colors ' +
                  (tipo === t
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300')
                }
              >
                {t === 'geral' ? 'Ad judicia (geral)' : 'Específica'}
              </button>
            ))}
          </div>

          {tipo === 'especifica' && (
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Número do processo</span>
              {processosVinculados.length > 0 ? (
                <select
                  value={numeroCnj}
                  onChange={(e) => setNumeroCnj(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 font-mono"
                >
                  {processosVinculados.map((p) => (
                    <option key={p.numero_cnj} value={p.numero_cnj}>
                      {p.numero_cnj}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={numeroCnj}
                  onChange={(e) => setNumeroCnj(e.target.value)}
                  placeholder="Número CNJ"
                  className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 font-mono"
                />
              )}
            </label>
          )}

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Poderes adicionais (opcional)</span>
            <textarea
              value={poderesExtras}
              onChange={(e) => setPoderesExtras(e.target.value)}
              rows={2}
              placeholder="Ex.: poderes para levantamento de alvará"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

          <p className="text-[11px] text-gray-400">
            Gera um modelo padrão em PDF a partir dos dados já cadastrados do cliente. Revise antes de usar — não substitui
            orientação jurídica sobre a redação do instrumento.
          </p>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={gerar}
            disabled={gerando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {gerando ? 'Gerando…' : 'Gerar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
