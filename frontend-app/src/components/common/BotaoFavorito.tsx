'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

export function BotaoFavorito({
  favorito,
  onClick,
  className,
  size = 15,
}: {
  favorito: boolean;
  onClick: () => void;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={cn(
        'shrink-0 rounded p-0.5 text-gray-300 hover:text-amber-500 dark:text-gray-600 dark:hover:text-amber-400',
        favorito && 'text-amber-500 dark:text-amber-400',
        className,
      )}
    >
      <Star size={size} fill={favorito ? 'currentColor' : 'none'} />
    </button>
  );
}
