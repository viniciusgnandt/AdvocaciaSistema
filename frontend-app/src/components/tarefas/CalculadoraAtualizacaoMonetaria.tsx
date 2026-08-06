'use client';

import { useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { calcularAtualizacaoMonetaria } from '@/lib/api';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CalculadoraAtualizacaoMonetaria({ onFechar }: { onFechar: () => void }) {
  const [valor, setValor] = useState('1000');
  const [dataInicial, setDataInicial] = useState(hojeISO());
  const [dataFinal, setDataFinal] = useState(hojeISO());
  const [indiceMensal, setIndiceMensal] = useState('0,5');
  const [jurosMensal, setJurosMensal] = useState('1');
  const [tipoJuros, setTipoJuros] = useState<'simples' | 'composto'>('simples');
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof calcularAtualizacaoMonetaria>> | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const calcular = async () => {
    setCalculando(true);
    setErro(null);
    setResultado(null);
    try {
      const dados = await calcularAtualizacaoMonetaria({
        valor: Number(valor.replace(',', '.')),
        data_inicial: dataInicial,
        data_final: dataFinal,
        indice_mensal: Number(indiceMensal.replace(',', '.')),
        juros_mensal: Number(jurosMensal.replace(',', '.')),
        tipo_juros: tipoJuros,
      });
      setResultado(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao calcular atualização');
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
            <Calculator size={15} className="text-brand-500" /> Atualização monetária
          </p>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Valor original (R$)</span>
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </label>

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
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Data final</span>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Correção (% a.m.)</span>
              <input
                value={indiceMensal}
                onChange={(e) => setIndiceMensal(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Juros (% a.m.)</span>
              <input
                value={jurosMensal}
                onChange={(e) => setJurosMensal(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          </div>

          <div className="flex gap-2">
            {(['simples', 'composto'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTipoJuros(t)}
                className={
                  'flex-1 text-sm py-1.5 rounded-lg border transition-colors ' +
                  (tipoJuros === t
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300')
                }
              >
                Juros {t}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-gray-400">
            Percentuais informados manualmente (o sistema não busca índices oficiais como INPC/SELIC automaticamente).
            Meses contados de calendário, sem fracionar por dias.
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
            <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 px-3 py-2.5 space-y-1">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Meses considerados</span>
                <span>{resultado.meses}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Correção aplicada</span>
                <span>{formatarMoeda(resultado.correcao_aplicada)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Juros aplicados</span>
                <span>{formatarMoeda(resultado.juros_aplicados)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-brand-700 dark:text-brand-300 pt-1 border-t border-brand-200 dark:border-brand-800">
                <span>Valor final</span>
                <span>{formatarMoeda(resultado.valor_final)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
