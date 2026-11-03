import type { ReactNode } from "react";

export function Dropdown({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none">{label}</summary>
      <div className="absolute right-0 z-20 mt-2 min-w-40 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
        {children}
      </div>
    </details>
  );
}
