import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, className, id, children, ...rest },
  ref
) {
  const sid = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={sid} className="block text-[13px] font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={sid}
          className={cn(
            "h-10 w-full appearance-none rounded-md border bg-white pl-3 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2",
            error
              ? "border-red-300 focus:ring-red-500/20"
              : "border-line focus:border-brand-500 focus:ring-brand-500/20",
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});