'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Copy, Check, Paperclip, Scale, FileDown, BookMarked, Save, ListChecks, FileSearch2 } from 'lucide-react';
import {
  gerarDocumentoIa,
  perguntarCopilotoIa,
  sugerirTarefasIa,
  revisarDocumentoIa,
  listarModelosIa,
  obterModeloIa,
  salvarModeloIa,
  criarTarefa,
  enviarDocumento,
  type HistoricoCopiloto,
  type ModeloDocumentoIa,
} from '@/lib/api';
import { montarDocxTexto } from '@/lib/exportar';
import { toast } from '@/lib/toast';

const TIPOS_DOCUMENTO = [
  'Petição inicial',
  'Petição intermediária',
  'Contestação',
  'Notificação extrajudicial',
  'Réplica',
  'Recurso',
  'E-mail para o cliente',
  'Resposta a mensagem do cliente',
];

type Modo = 'copiloto' | 'documento' | 'revisar';

export function CopilotoIaModal({
  processoId,
  numeroCnj,
  clienteId,
  onFechar,
}: {
  processoId?: string;
  numeroCnj?: string;
  clienteId?: string;
  onFechar: () => void;
}) {
  const [modo, setModo] = useState<Modo>('copiloto');

  const [pergunta, setPergunta] = useState('');
  const [conversa, setConversa] = useState<HistoricoCopiloto[]>([]);
  const [buscarJurisCopiloto, setBuscarJurisCopiloto] = useState(false);

  const [tipoDocumento, setTipoDocumento] = useState(processoId ? 'Petição intermediária' : 'Petição inicial');
  const [instrucoes, setInstrucoes] = useState('');
  const [mensagemCliente, setMensagemCliente] = useState('');
  const [textoDocumento, setTextoDocumento] = useState('');
  const [buscarJurisDocumento, setBuscarJurisDocumento] = useState(false);
  const [modelo, setModelo] = useState<File | null>(null);
  const inputModeloRef = useRef<HTMLInputElement>(null);

  const [modelosSalvos, setModelosSalvos] = useState<ModeloDocumentoIa[]>([]);
  const [modeloSalvoId, setModeloSalvoId] = useState('');
  const [salvandoModelo, setSalvandoModelo] = useState(false);

  const [sugestoes, setSugestoes] = useState<string[]>([]);

  const [arquivoRevisar, setArquivoRevisar] = useState<File | null>(null);
  const inputRevisarRef = useRef<HTMLInputElement>(null);
  const [revisao, setRevisao] = useState('');

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    listarModelosIa(tipoDocumento)
      .then(setModelosSalvos)
      .catch(() => setModelosSalvos([]));
  }, [tipoDocumento]);

  const perguntar = async () => {
    if (!pergunta.trim()) return;
    setCarregando(true);
    setErro(null);
    const perguntaAtual = pergunta;
    try {
      const { resposta } = await perguntarCopilotoIa({
        pergunta: perguntaAtual,
        processo_id: processoId,
        buscar_jurisprudencia: buscarJurisCopiloto,
        historico: conversa,
      });
      setConversa((atual) => [...atual, { role: 'user', texto: perguntaAtual }, { role: 'assistant', texto: resposta }]);
      setPergunta('');
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
        cliente_id: clienteId,
        buscar_jurisprudencia: buscarJurisDocumento,
        modelo: modelo ?? undefined,
        mensagem_cliente: tipoDocumento === 'Resposta a mensagem do cliente' ? mensagemCliente : undefined,
      });
      setTextoDocumento(texto);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gerar documento');
    } finally {
      setCarregando(false);
    }
  };

  const revisar = async () => {
    if (!arquivoRevisar) return;
    setCarregando(true);
    setErro(null);
    try {
      const { revisao: texto } = await revisarDocumentoIa(arquivoRevisar, processoId);
      setRevisao(texto);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao revisar documento');
    } finally {
      setCarregando(false);
    }
  };

  const usarModeloSalvo = async (id: string) => {
    setModeloSalvoId(id);
    if (!id) return;
    try {
      const dados = await obterModeloIa(id);
      const arquivo = new File([dados.conteudo], `${dados.nome}.txt`, { type: 'text/plain' });
      setModelo(arquivo);
    } catch {
      toast('Erro ao carregar modelo salvo', 'erro');
    }
  };

  const salvarComoModelo = async () => {
    if (!textoDocumento) return;
    const nome = window.prompt('Nome para este modelo:', tipoDocumento);
    if (!nome) return;
    setSalvandoModelo(true);
    try {
      await salvarModeloIa({ nome, tipo_documento: tipoDocumento, conteudo: textoDocumento });
      toast('Modelo salvo para reuso futuro');
      listarModelosIa(tipoDocumento).then(setModelosSalvos);
    } catch {
      toast('Erro ao salvar modelo', 'erro');
    } finally {
      setSalvandoModelo(false);
    }
  };

  const baixarComoDocx = async (texto: string, titulo: string) => {
    const blob = await montarDocxTexto(titulo, texto);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${titulo}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const salvarComoDocumentoDoProcesso = async (texto: string, titulo: string) => {
    if (!numeroCnj) return;
    try {
      const blob = await montarDocxTexto(titulo, texto);
      const arquivo = new File([blob], `${titulo}.docx`, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      await enviarDocumento({ numeroProcesso: numeroCnj }, arquivo);
      toast('Documento salvo na aba Arquivos do processo');
    } catch {
      toast('Erro ao salvar documento no processo', 'erro');
    }
  };

  const buscarSugestoes = async () => {
    if (!processoId) return;
    setCarregando(true);
    setErro(null);
    try {
      const { sugestoes: lista } = await sugerirTarefasIa(processoId);
      setSugestoes(lista);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao sugerir tarefas');
    } finally {
      setCarregando(false);
    }
  };

  const criarTarefaSugerida = async (titulo: string) => {
    try {
      const daqui7dias = new Date();
      daqui7dias.setDate(daqui7dias.getDate() + 7);
      await criarTarefa({
        titulo,
        data_vencimento: daqui7dias.toISOString(),
        numero_processo: numeroCnj,
      });
      toast('Tarefa criada');
      setSugestoes((atual) => atual.filter((s) => s !== titulo));
    } catch {
      toast('Erro ao criar tarefa', 'erro');
    }
  };

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      toast('Copiado para a área de transferência');
      setTimeout(() => setCopiado(false), 2000);
    });
  };

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
          {([
            ['copiloto', 'Perguntar'],
            ['documento', 'Gerar documento'],
            ['revisar', 'Revisar documento'],
          ] as [Modo, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setModo(m);
                setErro(null);
              }}
              className={
                'flex-1 text-xs py-1.5 rounded-lg border transition-colors ' +
                (modo === m ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300')
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {modo === 'copiloto' && (
            <>
              {conversa.length > 0 && (
                <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800 p-2.5">
                  {conversa.map((m, i) => (
                    <div
                      key={i}
                      className={
                        'text-xs rounded-lg px-2.5 py-1.5 whitespace-pre-wrap ' +
                        (m.role === 'user'
                          ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-800 dark:text-brand-300 ml-6'
                          : 'bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 mr-6')
                      }
                    >
                      {m.texto}
                    </div>
                  ))}
                </div>
              )}
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  {conversa.length > 0 ? 'Continuar conversa' : `Pergunta ${processoId ? '(com contexto deste processo)' : ''}`}
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

              {processoId && (
                <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={buscarSugestoes}
                    disabled={carregando}
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mt-2"
                  >
                    <ListChecks size={13} /> Sugerir próximos passos como tarefas
                  </button>
                  {sugestoes.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {sugestoes.map((s) => (
                        <li key={s} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800/40 rounded-lg px-2.5 py-1.5">
                          <span className="flex-1 text-gray-700 dark:text-gray-300">{s}</span>
                          <button
                            onClick={() => criarTarefaSugerida(s)}
                            className="text-brand-600 dark:text-brand-400 hover:underline shrink-0"
                          >
                            Criar tarefa
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          {modo === 'documento' && (
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

              {tipoDocumento === 'Resposta a mensagem do cliente' && (
                <label className="block">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                    Cole aqui a mensagem do cliente
                  </span>
                  <textarea
                    value={mensagemCliente}
                    onChange={(e) => setMensagemCliente(e.target.value)}
                    rows={3}
                    placeholder="Ex.: Boa tarde, gostaria de saber como está meu processo, já tem previsão de audiência?"
                    className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Instruções {processoId ? '(com contexto deste processo)' : clienteId ? '(com contexto deste cliente)' : ''}
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

                {modelosSalvos.length > 0 && (
                  <select
                    value={modeloSalvoId}
                    onChange={(e) => usarModeloSalvo(e.target.value)}
                    className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-900 dark:text-gray-100 mb-2"
                  >
                    <option value="">Usar modelo salvo…</option>
                    {modelosSalvos.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  ref={inputModeloRef}
                  type="file"
                  accept=".docx,.pdf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    setModelo(e.target.files?.[0] ?? null);
                    setModeloSalvoId('');
                  }}
                />
                {modelo ? (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5">
                    <Paperclip size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate flex-1">{modelo.name}</span>
                    <button
                      onClick={() => {
                        setModelo(null);
                        setModeloSalvoId('');
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

          {modo === 'revisar' && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Documento a revisar (.docx, .pdf ou .txt)
              </span>
              <input
                ref={inputRevisarRef}
                type="file"
                accept=".docx,.pdf,.txt"
                className="hidden"
                onChange={(e) => setArquivoRevisar(e.target.files?.[0] ?? null)}
              />
              {arquivoRevisar ? (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5">
                  <FileSearch2 size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate flex-1">{arquivoRevisar.name}</span>
                  <button
                    onClick={() => {
                      setArquivoRevisar(null);
                      if (inputRevisarRef.current) inputRevisarRef.current.value = '';
                    }}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => inputRevisarRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 w-full justify-center"
                >
                  <FileSearch2 size={13} /> Selecionar documento
                </button>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                A IA aponta inconsistências, prazos citados e pontos de atenção — não reescreve o documento.
              </p>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            Gerado por IA a partir dos dados já cadastrados. Revise sempre antes de usar — não substitui análise jurídica.
          </p>

          {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}

          <button
            onClick={modo === 'copiloto' ? perguntar : modo === 'documento' ? gerar : revisar}
            disabled={carregando}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {carregando
              ? 'Gerando…'
              : modo === 'copiloto'
                ? 'Perguntar'
                : modo === 'documento'
                  ? 'Gerar texto'
                  : 'Revisar documento'}
          </button>

          {modo === 'documento' && textoDocumento && (
            <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-3 relative">
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={() => baixarComoDocx(textoDocumento, tipoDocumento)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-white dark:hover:bg-gray-800"
                  title="Baixar Word (.docx)"
                >
                  <FileDown size={14} />
                </button>
                {numeroCnj && (
                  <button
                    onClick={() => salvarComoDocumentoDoProcesso(textoDocumento, tipoDocumento)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-white dark:hover:bg-gray-800"
                    title="Salvar na aba Arquivos do processo"
                  >
                    <Save size={14} />
                  </button>
                )}
                <button
                  onClick={salvarComoModelo}
                  disabled={salvandoModelo}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-white dark:hover:bg-gray-800"
                  title="Salvar como modelo reutilizável"
                >
                  <BookMarked size={14} />
                </button>
                <button
                  onClick={() => copiar(textoDocumento)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-white dark:hover:bg-gray-800"
                  title="Copiar"
                >
                  {copiado ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap pr-24">{textoDocumento}</p>
            </div>
          )}

          {modo === 'revisar' && revisao && (
            <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-3 relative">
              <button
                onClick={() => copiar(revisao)}
                className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-white dark:hover:bg-gray-800"
                title="Copiar"
              >
                {copiado ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap pr-6">{revisao}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
