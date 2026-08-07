'use client';

import { useRef, useState } from 'react';
import { Sparkles, X, Copy, Check, Paperclip, Scale } from 'lucide-react';
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
  const [buscarJurisCopiloto, setBuscarJurisCopiloto] = useState(false);

  const [tipoDocumento, setTipoDocumento] = useState(TIPOS_DOCUMENTO[0]);
  const [instrucoes, setInstrucoes] = useState('');
  const [textoDocumento, setTextoDocumento] = useState('');
  const [buscarJurisDocumento, setBuscarJurisDocumento] = useState(false);
  const [modelo, setModelo] = useState<File | null>(null);
  const inputModeloRef = useRef<HTMLInputElement>(null);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const perguntar = async () => {
    if (!pergunta.trim()) return;
    setCarregando(true);
    setErro(null);
    try {
      const { resposta } = await perguntarCopilotoIa({
        pergunta,
        processo_id: processoId,
        buscar_jurisprudencia: buscarJurisCopiloto,
      });
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
      const { texto } = await gerarDocumentoIa({
        tipo_documento: tipoDocumento,
        instrucoes,
        processo_id: processoId,
        buscar_jurisprudencia: buscarJurisDocumento,
        modelo: modelo ?? undefined,
      });
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
            <>
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
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={buscarJurisCopiloto}
                  onChange={(e) => setBuscarJurisCopiloto(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-700"
                />
                <Scale size={13} className="text-gray-400" /> Buscar jurisprudência na web (STJ, STF, TJs, TRTs)
              </label>
            </>
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

              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Modelo de referência (opcional)
                </span>
                <input
                  ref={inputModeloRef}
                  type="file"
                  accept=".docx,.pdf,.txt"
                  className="hidden"
                  onChange={(e) => setModelo(e.target.files?.[0] ?? null)}
                />
                {modelo ? (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5">
                    <Paperclip size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate flex-1">{modelo.name}</span>
                    <button
                      onClick={() => {
                        setModelo(null);
                        if (inputModeloRef.current) inputModeloRef.current.value = '';
                      }}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => inputModeloRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 w-full justify-center"
                  >
                    <Paperclip size={13} /> Anexar modelo (.docx, .pdf ou .txt)
                  </button>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  A IA segue a estrutura e o estilo do modelo enviado, adaptando o conteúdo ao caso.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={buscarJurisDocumento}
                  onChange={(e) => setBuscarJurisDocumento(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-700"
                />
                <Scale size={13} className="text-gray-400" /> Buscar jurisprudência na web (STJ, STF, TJs, TRTs)
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
