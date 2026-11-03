import { cn } from "@/lib/utils";
import type { SaleStatus } from "@/types";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const tones: Record<Tone, { box: string; dot: string }> = {
  success: { box: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500" },
  warning: { box: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  danger: { box: "bg-red-50 text-red-700 ring-red-600/15", dot: "bg-red-500" },
  info: { box: "bg-brand-50 text-brand-700 ring-brand-600/15", dot: "bg-brand-500" },
  neutral: { box: "bg-slate-100 text-slate-600 ring-slate-500/10", dot: "bg-slate-400" },
};

export function Badge({
  tone = "neutral",
  dot = true,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        t.box,
        className
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}

const saleMap: Record<SaleStatus, { tone: Tone; label: string }> = {
  PENDING: { tone: "warning", label: "Pending" },
  APPROVED: { tone: "success", label: "Approved" },
  REJECTED: { tone: "danger", label: "Rejected" },
};

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const s = saleMap[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function StockBadge({ quantity, lowLevel }: { quantity: number; lowLevel: number }) {
  if (quantity <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (quantity <= lowLevel) return <Badge tone="warning">Low stock</Badge>;
  return <Badge tone="success">In stock</Badge>;
}