'use client';

import { useCallback, useEffect, useState } from 'react';
import { alternarFavorito, buscarPerfil, chaveFavorito } from '@/lib/api';

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    buscarPerfil()
      .then((usuario) => {
        setFavoritos(new Set(usuario.favoritos ?? []));
        setCarregado(true);
      })
      .catch(() => setCarregado(true));
  }, []);

  const ehFavorito = useCallback((tipo: 'processo' | 'cliente', id: string) => favoritos.has(chaveFavorito(tipo, id)), [favoritos]);

  const alternar = useCallback(async (tipo: 'processo' | 'cliente', id: string) => {
    const chave = chaveFavorito(tipo, id);
    setFavoritos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
    try {
      const resultado = await alternarFavorito(tipo, id);
      setFavoritos(new Set(resultado.favoritos));
    } catch {
      // reverte em caso de falha
      setFavoritos((atual) => {
        const novo = new Set(atual);
        if (novo.has(chave)) novo.delete(chave);
        else novo.add(chave);
        return novo;
      });
    }
  }, []);

  return { favoritos, ehFavorito, alternar, carregado };
}
