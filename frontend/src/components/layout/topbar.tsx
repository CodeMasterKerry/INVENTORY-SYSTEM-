"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, PanelLeft } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import type { Role } from "@/types";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

const humanize = (s: string) =>
  /^\d+$/.test(s) ? `#${s}` : s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function Topbar({ role, portalLabel }: { role: Role; portalLabel: string }) {
  const pathname = usePathname();
  const { toggleCollapsed, setMobileOpen } = useUiStore();

  const segs = pathname.split("/").filter(Boolean);
  const crumbs = segs.map((s, i) => ({
    label: i === 0 ? portalLabel : humanize(s),
    href: "/" + segs.slice(0, i + 1).join("/"),
  }));

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white/90 px-3 backdrop-blur sm:px-5">
      <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
        <Menu className="size-5" />
      </button>
      <button onClick={toggleCollapsed} className="hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:inline-flex" aria-label="Toggle sidebar">
        <PanelLeft className="size-[18px]" />
      </button>

      <nav aria-label="Breadcrumb" className="ml-1 flex min-w-0 items-center text-[13px]">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.href} className={`flex items-center ${last ? "min-w-0" : "hidden sm:flex"}`}>
              {i > 0 && <ChevronRight className="mx-1.5 size-3.5 shrink-0 text-slate-300" />}
              {last ? (
                <span className="truncate font-medium text-slate-900">{c.label}</span>
              ) : (
                <Link href={c.href} className="text-slate-500 hover:text-slate-800">
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell role={role} />
        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}