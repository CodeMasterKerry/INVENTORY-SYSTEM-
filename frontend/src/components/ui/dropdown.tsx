"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function Dropdown({
  trigger,
  children,
  align = "right",
  width = "w-64",
  side = "bottom",
  closeOnSelect = true,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  width?: string;
  side?: "top" | "bottom";
  closeOnSelect?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          onClick={() => closeOnSelect && setOpen(false)}
          className={cn(
            "absolute z-40 animate-fade-up overflow-hidden rounded-lg border border-line bg-white shadow-pop",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            align === "right" ? "right-0" : "left-0",
            width
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}