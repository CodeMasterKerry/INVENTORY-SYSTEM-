export function BarList({ items }: { items: { label: string; value: number; display: string; sub?: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-4">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-slate-800">{i.label}</span>
            <span className="shrink-0 tabular-nums text-slate-600">{i.display}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
          {i.sub && <p className="mt-1 text-xs text-slate-500">{i.sub}</p>}
        </li>
      ))}
    </ul>
  );
}
