"use client";
import { Menu } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import type { Role } from "@/types";
import { Logo } from "@/components/ui/logo";
import { NotificationBell } from "./notification-bell";

export function Topbar({ role, portalLabel }: { role: Role; portalLabel: string }) {
  const { setMobileOpen } = useUiStore();
  const label = role === "MANAGER" ? `${portalLabel} Portal`.toUpperCase() : "SALES OFFICER PORTAL";

  return (
    <header className="relative z-50 flex h-[68px] shrink-0 border-b border-line bg-white">
      <div className="flex w-[272px] shrink-0 items-center justify-center border-r border-line">
        <Logo />
      </div>
      <div className="flex min-w-0 flex-1 items-center px-4 sm:px-7">
        <button
          onClick={() => setMobileOpen(true)}
          className="mr-3 rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <span className="truncate text-sm font-semibold tracking-wide text-slate-500">{label}</span>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell role={role} />
        </div>
      </div>
    </header>
  );
}
