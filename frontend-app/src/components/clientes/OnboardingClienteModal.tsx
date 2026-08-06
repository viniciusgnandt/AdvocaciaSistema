'use client';

import { CheckCircle2, FileSignature, Gavel, Globe, PartyPopper, Upload, X } from 'lucide-react';
import { type Cliente } from '@/lib/api';

function scrollAte(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function OnboardingClienteModal({
  cliente,
  onFechar,
  onGerarProcuracao,
}: {
  cliente: Cliente;
  onFechar: () => void;
  onGerarProcuracao: () => void;
}) {
  const passos = [
    {
      icon: Gavel,
      titulo: 'Vincular um processo',
      descricao: 'Associe processos já existentes ou aguarde a vinculação automática por nome das partes.',
      onClick: () => scrollAte('secao-processos-vinculados'),
    },
    {
      icon: Upload,
      titulo: 'Enviar um documento',
      descricao: 'RG, CPF, contrato ou qualquer arquivo do cliente, antes ou independente de um processo.',
      onClick: () => scrollAte('secao-arquivos-cliente'),
    },
    {
      icon: Globe,
      titulo: 'Ativar o portal do cliente',
      descricao: 'Gera um link somente leitura, sem senha, para o cliente acompanhar o próprio caso.',
      onClick: () => scrollAte('secao-portal-cliente'),
    },
    {
      icon: FileSignature,
      titulo: 'Gerar a procuração',
      descricao: 'Modelo de procuração pré-preenchido com os dados já cadastrados.',
      onClick: onGerarProcuracao,
    },
  ];

  return (
    <div onClick={onFechar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <PartyPopper size={16} className="text-brand-500" /> Cliente criado
          </p>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            <span className="font-medium text-gray-900 dark:text-gray-100">{cliente.nome}</span> foi cadastrado(a). Alguns próximos
            passos comuns:
          </p>

          <div className="space-y-2">
            {passos.map((p) => (
              <button
                key={p.titulo}
                onClick={() => {
                  p.onClick();
                  onFechar();
                }}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-left hover:border-brand-300 dark:hover:border-brand-800 hover:bg-brand-50/40 dark:hover:bg-brand-900/10 transition-colors"
              >
                <span className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <p.icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-sm text-gray-800 dark:text-gray-200 block">{p.titulo}</span>
                  <span className="text-xs text-gray-400 block truncate">{p.descricao}</span>
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={onFechar}
            className="w-full flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <CheckCircle2 size={12} /> Concluir depois
          </button>
        </div>
      </div>
    </div>
  );
}
