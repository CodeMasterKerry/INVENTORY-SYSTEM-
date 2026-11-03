"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
interface Item { id: number; kind: Kind; message: string }
interface State {
  toasts: Item[];
  push: (kind: Kind, message: string) => void;
  dismiss: (id: number) => void;
}

let counter = 0;
const useToastStore = create<State>((set) => ({
  toasts: [],
  push: (kind, message) => set((s) => ({ toasts: [...s.toasts, { id: ++counter, kind, message }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().push("success", m),
  error: (m: string) => useToastStore.getState().push("error", m),
  info: (m: string) => useToastStore.getState().push("info", m),
};

const icons = {
  success: <CheckCircle2 className="size-[18px] text-emerald-600" />,
  error: <AlertCircle className="size-[18px] text-red-600" />,
  info: <Info className="size-[18px] text-brand-600" />,
};

function ToastItem({ item }: { item: Item }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), 4200);
    return () => clearTimeout(t);
  }, [item.id, dismiss]);

  return (
    <div
      className={cn(
        "flex w-80 animate-fade-up items-start gap-3 rounded-lg border border-line bg-white p-3.5 shadow-pop"
      )}
    >
      <span className="mt-0.5">{icons[item.kind]}</span>
      <p className="flex-1 text-[13px] text-slate-700">{item.message}</p>
      <button onClick={() => dismiss(item.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem item={t} />
        </div>
      ))}
    </div>
  );
}