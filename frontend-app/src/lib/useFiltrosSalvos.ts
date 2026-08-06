'use client';

import { useCallback, useEffect, useState } from 'react';

export interface FiltroSalvo<T> {
  id: string;
  nome: string;
  filtros: T;
}

function chaveArmazenamento(escopo: string) {
  return `trilva_filtros_salvos_${escopo}`;
}

export function useFiltrosSalvos<T extends object>(escopo: string) {
  const [salvos, setSalvos] = useState<FiltroSalvo<T>[]>([]);

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chaveArmazenamento(escopo));
      setSalvos(bruto ? JSON.parse(bruto) : []);
    } catch {
      setSalvos([]);
    }
  }, [escopo]);

  const persistir = useCallback(
    (lista: FiltroSalvo<T>[]) => {
      setSalvos(lista);
      localStorage.setItem(chaveArmazenamento(escopo), JSON.stringify(lista));
    },
    [escopo],
  );

  const salvar = useCallback(
    (nome: string, filtros: T) => {
      const item: FiltroSalvo<T> = { id: crypto.randomUUID(), nome, filtros };
      persistir([...salvos, item]);
    },
    [salvos, persistir],
  );

  const remover = useCallback(
    (id: string) => {
      persistir(salvos.filter((s) => s.id !== id));
    },
    [salvos, persistir],
  );

  return { salvos, salvar, remover };
}
