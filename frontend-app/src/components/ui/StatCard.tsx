import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone?: 'default' | 'brand' | 'warning';
}) {
  const toneClasses = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    brand: 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
    warning: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  }[tone];

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', toneClasses)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{label}</p>
      </div>
    </div>
  );
}
