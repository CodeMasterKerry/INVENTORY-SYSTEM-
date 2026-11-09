import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, trailing, className, id, ...rest },
  ref
) {
  const inputId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[13px] font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400",
            "transition-colors focus:outline-none focus:ring-2",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
              : "border-line focus:border-brand-500 focus:ring-brand-500/20",
            trailing && "pr-10",
            className
          )}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">{trailing}</div>}
      </div>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});