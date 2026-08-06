'use client';

import { useMemo, useState } from 'react';
import { Calculator, Plus, Trash2, X } from 'lucide-react';

function paraNumeroSimples(texto: string) {
  const n = Number(texto.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type TipoHonorario = 'fixo' | 'percentual' | 'exito' | 'misto';

type Divisao = { id: string; nome: string; percentual: string };

export function SimuladorHonorarios({ onFechar }: { onFechar: () => void }) {
  const [tipo, setTipo] = useState<TipoHonorario>('percentual');
  const [valorCausa, setValorCausa] = useState('100.000,00');
  const [percentual, setPercentual] = useState('20');
  const [valorFixo, setValorFixo] = useState('5.000,00');
  const [divisoes, setDivisoes] = useState<Divisao[]>([]);

  const valorTotal = useMemo(() => {
    const causa = paraNumeroSimples(valorCausa);
    const perc = paraNumeroSimples(percentual);
    const fixo = paraNumeroSimples(valorFixo);
    if (tipo === 'fixo') return fixo;
    if (tipo === 'percentual' || tipo === 'exito') return (causa * perc) / 100;
    return fixo + (causa * perc) / 100;
  }, [tipo, valorCausa, percentual, valorFixo]);

  const somaPercentuaisDivisao = divisoes.reduce((acc, d) => acc + paraNumeroSimples(d.percentual), 0);

  const adicionarDivisao = () => setDivisoes((atual) => [...atual, { id: crypto.randomUUID(), nome: '', percentual: '' }]);
  const removerDivisao = (id: string) => setDivisoes((atual) => atual.filter((d) => d.id !== id));
  const atualizarDivisao = (id: string, campo: 'nome' | 'percentual', valor: string) =>
    setDivisoes((atual) => atual.map((d) => (d.id === id ? { ...d, [campo]: valor } : d)));

  return (
    <div onClick={onFechar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3.5 shrink-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calculator size={15} className="text-brand-500" /> Simulador de honorários
          </p>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {(['fixo', 'percentual', 'exito', 'misto'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={
                  'text-sm py-1.5 rounded-lg border transition-colors capitalize ' +
                  (tipo === t
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300')
                }
              >
                {t === 'exito' ? 'Êxito' : t}
              </button>
            ))}
          </div>

          {(tipo === 'percentual' || tipo === 'exito' || tipo === 'misto') && (
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Valor da causa (R$)</span>
              <input
                value={valorCausa}
                onChange={(e) => setValorCausa(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          )}

          {(tipo === 'percentual' || tipo === 'exito' || tipo === 'misto') && (
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Percentual (%)</span>
              <input
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          )}

          {(tipo === 'fixo' || tipo === 'misto') && (
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Valor fixo (R$)</span>
              <input
                value={valorFixo}
                onChange={(e) => setValorFixo(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          )}

          <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 px-3 py-2.5">
            <div className="flex justify-between text-sm font-semibold text-brand-700 dark:text-brand-300">
              <span>Total de honorários</span>
              <span>{formatarMoeda(valorTotal)}</span>
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Split entre sócios (opcional)</span>
              <button onClick={adicionarDivisao} className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                <Plus size={12} /> Adicionar
              </button>
            </div>

            {divisoes.length > 0 && (
              <div className="space-y-2">
                {divisoes.map((d) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <input
                      value={d.nome}
                      onChange={(e) => atualizarDivisao(d.id, 'nome', e.target.value)}
                      placeholder="Nome"
                      className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-900 dark:text-gray-100"
                    />
                    <input
                      value={d.percentual}
                      onChange={(e) => atualizarDivisao(d.id, 'percentual', e.target.value)}
                      placeholder="%"
                      className="w-16 shrink-0 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-900 dark:text-gray-100"
                    />
                    <span className="w-24 shrink-0 text-xs text-gray-500 dark:text-gray-400 text-right font-mono">
                      {formatarMoeda((valorTotal * paraNumeroSimples(d.percentual)) / 100)}
                    </span>
                    <button onClick={() => removerDivisao(d.id)} className="shrink-0 p-1 rounded text-gray-300 hover:text-red-600 dark:hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {somaPercentuaisDivisao !== 100 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    Soma dos percentuais: {somaPercentuaisDivisao}% (não fecha 100%).
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="text-[11px] text-gray-400">
            Simulação apenas — nenhum lançamento é criado. Para registrar de verdade, use os honorários do processo.
          </p>
        </div>
      </div>
    </div>
  );
}
