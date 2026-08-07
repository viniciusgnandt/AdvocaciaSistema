'use client';

import { useState } from 'react';
import { Sparkles, X, Copy, Check } from 'lucide-react';
import { gerarDocumentoIa, perguntarCopilotoIa } from '@/lib/api';
import { toast } from '@/lib/toast';

const TIPOS_DOCUMENTO = [
  'Petição intermediária',
  'Contestação',
  'Notificação extrajudicial',
  'Réplica',
  'Recurso',
  'E-mail para o cliente',
];

export function CopilotoIaModal({ processoId, onFechar }: { processoId?: string; onFechar: () => void }) {
  const [modo, setModo] = useState<'copiloto' | 'documento'>('copiloto');

  const [pergunta, setPergunta] = useState('');
  const [respostaCopiloto, setRespostaCopiloto] = useState('');

  const [tipoDocumento, setTipoDocumento] = useState(TIPOS_DOCUMENTO[0]);
  const [instrucoes, setInstrucoes] = useState('');
  const [textoDocumento, setTextoDocumento] = useState('');

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const perguntar = async () => {
    if (!pergunta.trim()) return;
    setCarregando(true);
    setErro(null);
    try {
      const { resposta } = await perguntarCopilotoIa({ pergunta, processo_id: processoId });
      setRespostaCopiloto(resposta);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao consultar a IA');
    } finally {
      setCarregando(false);
    }
  };

  const gerar = async () => {
    if (!instrucoes.trim()) return;
    setCarregando(true);
    setErro(null);
    try {
      const { texto } = await gerarDocumentoIa({ tipo_documento: tipoDocumento, instrucoes, processo_id: processoId });
      setTextoDocumento(texto);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gerar documento');
    } finally {
      setCarregando(false);
    }
  };

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      toast('Copiado para a área de transferência');
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const resultado = modo === 'copiloto' ? respostaCopiloto : textoDocumento;

  return (
    <div onClick={onFechar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3.5 shrink-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles size={15} className="text-brand-500" /> Copiloto IA
          </p>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 px-5 pt-3 shrink-0">
          {(['copiloto', 'documento'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setModo(m);
                setErro(null);
              }}
              className={
                'flex-1 text-sm py-1.5 rounded-lg border transition-colors ' +
                (modo === m ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300')
              }
            >
              {m === 'copiloto' ? 'Perguntar' : 'Gerar documento'}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {modo === 'copiloto' ? (
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Pergunta {processoId ? '(com contexto deste processo)' : ''}
              </span>
              <textarea
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                rows={3}
                placeholder="Ex.: Resuma o andamento deste processo e sugira os próximos passos."
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Tipo de documento</span>
                <select
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                >
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Instruções {processoId ? '(com contexto deste processo)' : ''}
                </span>
                <textarea
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  rows={3}
                  placeholder="Ex.: Notificar o cliente sobre atraso no pagamento de honorários, tom formal, 3 parágrafos."
                  className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                />
              </label>
            </>
          )}

          <p className="text-[11px] text-gray-400">
            Gerado por IA a partir dos dados já cadastrados. Revise sempre antes de usar — não substitui análise jurídica.
          </p>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={modo === 'copiloto' ? perguntar : gerar}
            disabled={carregando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {carregando ? 'Gerando…' : modo === 'copiloto' ? 'Perguntar' : 'Gerar texto'}
          </button>

          {resultado && (
            <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-3 relative">
              <button
                onClick={() => copiar(resultado)}
                className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-white dark:hover:bg-gray-800"
                title="Copiar"
              >
                {copiado ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap pr-6">{resultado}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
