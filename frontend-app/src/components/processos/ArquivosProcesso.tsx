'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, ChevronRight, Download, File, FolderOpen, FolderPlus, Home, Mail, Paperclip, Plus, Trash2, X } from 'lucide-react';
import {
  atualizarValidadeDocumento,
  baixarDocumento,
  criarPasta,
  enviarDocumento,
  excluirDocumento,
  excluirPasta,
  listarDocumentos,
  listarPastas,
  type DocumentoProcesso,
  type EscopoArquivos,
  type Pasta,
} from '@/lib/api';
import { cn } from '@/lib/cn';

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ArquivosProcesso({ escopo }: { escopo: EscopoArquivos }) {
  // pilha de pastas abertas (breadcrumb): [] = raiz
  const [caminho, setCaminho] = useState<Pasta[]>([]);
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [arquivos, setArquivos] = useState<DocumentoProcesso[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalNovaPasta, setModalNovaPasta] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pastaAtual = caminho[caminho.length - 1];
  const chaveEscopo = escopo.numeroProcesso ?? escopo.clienteId;

  const carregar = useCallback(async () => {
    try {
      const [listaPastas, listaArquivos] = await Promise.all([
        listarPastas(escopo, pastaAtual?._id),
        listarDocumentos(escopo, { pastaId: pastaAtual?._id ?? '' }),
      ]);
      setPastas(listaPastas);
      setArquivos(listaArquivos);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao carregar arquivos');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveEscopo, pastaAtual?._id]);

  useEffect(() => {
    setCaminho([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveEscopo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleCriarPasta = async (nome: string) => {
    try {
      await criarPasta(escopo, nome, pastaAtual?._id);
      setModalNovaPasta(false);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao criar pasta');
    }
  };

  const handleExcluirPasta = async (pasta: Pasta, e: React.MouseEvent) => {
    e.stopPropagation();
    const resultado = await excluirPasta(pasta._id);
    if ('erro' in resultado) {
      setErro('Só é possível excluir pastas vazias.');
      return;
    }
    await carregar();
  };

  const handleUpload = async (arquivosSelecionados: FileList | null) => {
    if (!arquivosSelecionados || arquivosSelecionados.length === 0) return;
    setEnviando(true);
    setErro(null);
    try {
      for (const arquivo of Array.from(arquivosSelecionados)) {
        await enviarDocumento(escopo, arquivo, { pastaId: pastaAtual?._id });
      }
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao enviar arquivo');
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (documento: DocumentoProcesso) => {
    const { url } = await baixarDocumento(documento._id);
    window.open(url, '_blank', 'noopener');
  };

  const handleExcluirArquivo = async (documento: DocumentoProcesso) => {
    setArquivos((atual) => atual.filter((d) => d._id !== documento._id));
    try {
      await excluirDocumento(documento._id);
    } catch {
      carregar();
    }
  };

  const handleDefinirValidade = async (documento: DocumentoProcesso) => {
    const atual = documento.data_validade ?? '';
    const resposta = window.prompt('Data de validade (AAAA-MM-DD), deixe em branco para remover:', atual);
    if (resposta === null) return;
    const novaData = resposta.trim();
    if (novaData && !/^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
      setErro('Data inválida — use o formato AAAA-MM-DD.');
      return;
    }
    try {
      const atualizado = await atualizarValidadeDocumento(documento._id, novaData);
      setArquivos((atual2) => atual2.map((d) => (d._id === documento._id ? atualizado : d)));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'erro ao definir validade');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-400 flex-wrap">
          <Paperclip size={12} /> Arquivos
          <span className="mx-1 normal-case font-normal text-gray-300 dark:text-gray-700">·</span>
          <button
            onClick={() => setCaminho([])}
            className={caminho.length === 0 ? 'text-gray-600 dark:text-gray-300' : 'hover:text-gray-600 dark:hover:text-gray-300'}
          >
            <Home size={12} />
          </button>
          {caminho.map((p, i) => (
            <span key={p._id} className="flex items-center gap-1">
              <ChevronRight size={10} />
              <button
                onClick={() => setCaminho(caminho.slice(0, i + 1))}
                className={i === caminho.length - 1 ? 'text-gray-600 dark:text-gray-300' : 'hover:text-gray-600 dark:hover:text-gray-300'}
              >
                {p.nome}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setModalNovaPasta(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
          >
            <FolderPlus size={13} /> Criar pasta
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
          >
            <Plus size={13} /> {enviando ? 'Enviando…' : 'Enviar arquivo'}
          </button>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </div>
      </div>

      {erro && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{erro}</p>}

      {pastas.length === 0 && arquivos.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-400 cursor-pointer hover:border-brand-300 dark:hover:border-brand-800"
        >
          Nada por aqui ainda — crie uma pasta ou envie um arquivo.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {pastas.map((p) => (
            <li
              key={p._id}
              onClick={() => setCaminho([...caminho, p])}
              className="flex items-center gap-2.5 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 text-sm cursor-pointer hover:border-brand-300 dark:hover:border-brand-800"
            >
              <FolderOpen size={14} className="text-brand-400 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300">{p.nome}</span>
              <button
                onClick={(e) => handleExcluirPasta(p, e)}
                className="p-1 rounded text-gray-300 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                title="Excluir pasta (precisa estar vazia)"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
          {arquivos.map((d) => (
            <li
              key={d._id}
              className="flex items-center gap-2.5 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 text-sm"
            >
              {d.tipo === 'email' ? (
                <Mail size={14} className="text-brand-400 shrink-0" />
              ) : (
                <File size={14} className="text-gray-400 shrink-0" />
              )}
              <span className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300">{d.nome}</span>
              {d.data_validade && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full shrink-0',
                    new Date(d.data_validade) < new Date()
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                  )}
                >
                  validade {new Date(`${d.data_validade}T00:00:00`).toLocaleDateString('pt-BR')}
                </span>
              )}
              <span className="text-xs text-gray-400 shrink-0">{formatarTamanho(d.tamanho_bytes)}</span>
              <button
                onClick={() => handleDefinirValidade(d)}
                className="p-1 rounded text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 shrink-0"
                title="Definir validade"
              >
                <CalendarClock size={14} />
              </button>
              <button
                onClick={() => handleDownload(d)}
                className="p-1 rounded text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 shrink-0"
                title="Baixar"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => handleExcluirArquivo(d)}
                className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {modalNovaPasta && (
        <NovaPastaModal onFechar={() => setModalNovaPasta(false)} onCriar={handleCriarPasta} />
      )}
    </div>
  );
}

function NovaPastaModal({ onFechar, onCriar }: { onFechar: () => void; onCriar: (nome: string) => void }) {
  const [nome, setNome] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const confirmar = () => {
    if (nome.trim()) onCriar(nome.trim());
  };

  return (
    <div
      onClick={onFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FolderPlus size={15} className="text-brand-500" /> Nova pasta
          </p>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <input
            ref={inputRef}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmar()}
            placeholder="Nome da pasta"
            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 outline-none focus:border-brand-400 dark:focus:border-brand-600"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onFechar}
              className="text-sm px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={!nome.trim()}
              className="text-sm px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50"
            >
              Criar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
