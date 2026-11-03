import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-brand-600" />
      <rect x="9" y="8.5" width="14" height="3" rx="1.5" fill="white" />
      <rect x="9" y="14.5" width="9.5" height="3" rx="1.5" fill="white" opacity="0.85" />
      <rect x="9" y="20.5" width="14" height="3" rx="1.5" fill="white" opacity="0.65" />
    </svg>
  );
}

export function Logo({ light = false, showText = true }: { light?: boolean; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {showText && (
        <span className={cn("text-[15px] font-semibold tracking-tight", light ? "text-white" : "text-slate-900")}>
          E-SIMS
        </span>
      )}
    </div>
  );
}