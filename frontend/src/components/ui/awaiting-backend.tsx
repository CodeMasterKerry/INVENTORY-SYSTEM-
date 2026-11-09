import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function AwaitingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500",
        className
      )}
    >
      <Clock className="size-3" />
      Awaiting backend
    </span>
  );
}

export function AwaitingNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3">
      <Clock className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="break-words text-[13px] font-medium text-slate-800">{title}</p>
        <p className="mt-0.5 break-words text-[13px] text-slate-500">{children}</p>
      </div>
    </div>
  );
}