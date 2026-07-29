'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Paperclip, Trash2 } from 'lucide-react';
import {
  baixarDocumento,
  enviarDocumento,
  excluirDocumento,
  listarDocumentos,
  type DocumentoProcesso,
} from '@/lib/api';
import { cn } from '@/lib/cn';

export function AnexoMovimentacao({
  numeroProcesso,
  movimentacaoChave,
}: {
  numeroProcesso: string;
  movimentacaoChave: string;
}) {
  const [documentos, setDocumentos] = useState<DocumentoProcesso[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await listarDocumentos({ numeroProcesso }, { movimentacaoChave });
      setDocumentos(dados);
    } catch {
      setDocumentos([]);
    }
  }, [numeroProcesso, movimentacaoChave]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleUpload = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      for (const arquivo of Array.from(arquivos)) {
        await enviarDocumento({ numeroProcesso }, arquivo, { movimentacaoChave });
      }
      await carregar();
      setAberto(true);
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (documento: DocumentoProcesso) => {
    const { url } = await baixarDocumento(documento._id);
    window.open(url, '_blank', 'noopener');
  };

  const handleExcluir = async (documento: DocumentoProcesso) => {
    setDocumentos((atual) => (atual ?? []).filter((d) => d._id !== documento._id));
    try {
      await excluirDocumento(documento._id);
    } catch {
      carregar();
    }
  };

  const total = documentos?.length ?? 0;

  return (
    <div className="mt-1">
      <button
        onClick={() => (total > 0 ? setAberto((v) => !v) : inputRef.current?.click())}
        disabled={enviando}
        className={cn(
          'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md transition-colors',
          total > 0
            ? 'text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20'
            : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400',
        )}
      >
        <Paperclip size={11} />
        {enviando ? 'Enviando…' : total > 0 ? `${total} anexo(s)` : 'Anexar'}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {aberto && total > 0 && (
        <ul className="mt-1.5 space-y-1 border-l border-gray-100 dark:border-gray-800 pl-2">
          {documentos!.map((d) => (
            <li key={d._id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex-1 min-w-0 truncate">{d.nome}</span>
              <button onClick={() => handleDownload(d)} className="hover:text-brand-600 dark:hover:text-brand-400">
                <Download size={12} />
              </button>
              <button onClick={() => handleExcluir(d)} className="hover:text-red-600 dark:hover:text-red-400">
                <Trash2 size={12} />
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={() => inputRef.current?.click()}
              className="text-xs text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
            >
              + adicionar outro
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
