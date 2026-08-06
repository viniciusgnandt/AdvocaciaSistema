'use client';

import { useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { calcularPrazo } from '@/lib/api';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalculadoraPrazo({ onFechar }: { onFechar: () => void }) {
  const [dataInicial, setDataInicial] = useState(hojeISO());
  const [dias, setDias] = useState('15');
  const [tipo, setTipo] = useState<'uteis' | 'corridos'>('uteis');
  const [considerarRecesso, setConsiderarRecesso] = useState(true);
  const [resultado, setResultado] = useState<string | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const calcular = async () => {
    setCalculando(true);
    setErro(null);
    setResultado(null);
    try {
      const { data_fatal } = await calcularPrazo({
        data_inicial: dataInicial,
        dias: Number(dias),
        tipo,
        considerar_recesso: considerarRecesso,
      });
      setResultado(new Date(data_fatal).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao calcular prazo');
    } finally {
      setCalculando(false);
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
            <Calculator size={15} className="text-brand-500" /> Calculadora de prazo
          </p>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Data inicial</span>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nº de dias</span>
              <input
                type="number"
                min={1}
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          </div>

          <div className="flex gap-2">
            {(['uteis', 'corridos'] as const).map((t) => (
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
                {t === 'uteis' ? 'Dias úteis' : 'Dias corridos'}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <input
              type="checkbox"
              checked={considerarRecesso}
              onChange={(e) => setConsiderarRecesso(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-700"
            />
            Considerar recesso forense (20/dez a 06/jan)
          </label>

          <p className="text-[11px] text-gray-400">
            Considera feriados nacionais (fixos e móveis) e fins de semana. Feriados municipais/estaduais específicos da
            comarca não são considerados — confirme prazos críticos no diário oficial.
          </p>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={calcular}
            disabled={calculando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {calculando ? 'Calculando…' : 'Calcular'}
          </button>

          {resultado && (
            <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Data fatal</p>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300 capitalize">{resultado}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
