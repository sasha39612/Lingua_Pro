const ROW_WIDTHS = ['w-[70%]', 'w-[80%]', 'w-[90%]'] as const;

export function PageSkeleton({ rows = 4, label = 'Loading…' }: { rows?: number; label?: string }) {
  return (
    <div role="status" className="animate-pulse space-y-4 p-6" aria-label={label}>
      <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`h-4 rounded bg-gray-200 dark:bg-gray-700 ${ROW_WIDTHS[i % 3]}`}
        />
      ))}
    </div>
  );
}
