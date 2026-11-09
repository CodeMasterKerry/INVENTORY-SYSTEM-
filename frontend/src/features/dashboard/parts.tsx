import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Sale } from "@/types";
import { SaleStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Receipt } from "lucide-react";

export function RangeToggle({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex rounded-md border border-line bg-slate-50 p-0.5">
      {[7, 30, 90].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === n ? "bg-white text-slate-900 shadow-card" : "text-slate-500 hover:text-slate-800"
          )}
        >
          {n}D
        </button>
      ))}
    </div>
  );
}

export function SalesList({ sales, showOfficer, empty }: { sales: Sale[]; showOfficer?: boolean; empty: string }) {
  if (sales.length === 0) return <EmptyState icon={Receipt} title={empty} />;
  return (
    <ul className="divide-y divide-line">
      {sales.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[13px] font-medium text-slate-900">{s.invoiceNo}</p>
            <p className="truncate text-xs text-slate-500">
              {showOfficer ? `${s.createdBy.name} · ` : ""}
              {formatDate(s.createdAt, true)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-[13px] font-medium tabular-nums text-slate-900">{formatCurrency(s.totalAmount)}</span>
            <SaleStatusBadge status={s.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
      {children}
    </Link>
  );
}