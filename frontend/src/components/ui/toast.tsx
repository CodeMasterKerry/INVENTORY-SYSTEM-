import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type ToastTone = "success" | "error" | "info";

const tones: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

export function Toast({
  children,
  tone = "info",
  className,
}: {
  children: ReactNode;
  tone?: ToastTone;
  className?: string;
}) {
  return (
    <div
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}
      role="status"
    >
      {children}
    </div>
  );
}
