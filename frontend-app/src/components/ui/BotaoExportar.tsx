'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

export function BotaoExportar({ onExcel, onPdf }: { onExcel: () => void; onPdf: () => void }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <Download size={13} /> Exportar
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-40 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
            <button
              onClick={() => {
                onExcel();
                setAberto(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <FileSpreadsheet size={13} /> Excel (.xlsx)
            </button>
            <button
              onClick={() => {
                onPdf();
                setAberto(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <FileText size={13} /> PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
