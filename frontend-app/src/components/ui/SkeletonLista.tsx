export function SkeletonLista({ linhas = 6 }: { linhas?: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: linhas }).map((_, i) => (
        <li key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 rounded bg-gray-200 dark:bg-gray-800 w-3/5" />
              <div className="h-3 rounded bg-gray-100 dark:bg-gray-800/60 w-2/5" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
