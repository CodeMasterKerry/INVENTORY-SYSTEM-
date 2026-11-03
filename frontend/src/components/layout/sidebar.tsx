"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { Logo } from "@/components/ui/logo";
import type { NavItem } from "./nav-config";

function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

function Row({ item, root }: { item: NavItem; root: string }) {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useUiStore();
  const Icon = item.icon;

  const childActive = item.children?.some((c) => isActive(pathname, c.href, root)) ?? false;
  const [open, setOpen] = useState(childActive);
  const active = item.children ? childActive : isActive(pathname, item.href!, root);

  const base = "relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors";
  const tone = active ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/5 hover:text-white";
  const bar = active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-400" />;
  const collapsedCls = collapsed && "lg:justify-center lg:px-0";

  if (!item.children) {
    return (
      <Link href={item.href!} title={item.label} className={cn(base, tone, collapsedCls)}>
        {bar}
        <Icon className="size-[18px] shrink-0" />
        <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        title={item.label}
        onClick={() => {
          if (collapsed) {
            setCollapsed(false);
            setOpen(true);
          } else setOpen((o) => !o);
        }}
        className={cn(base, tone, collapsedCls)}
      >
        {bar}
        <Icon className="size-[18px] shrink-0" />
        <span className={cn("flex-1 text-left", collapsed && "lg:hidden")}>{item.label}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180", collapsed && "lg:hidden")}
        />
      </button>
      <div className={cn("ml-[21px] mt-0.5 space-y-0.5 border-l border-white/10 pl-3", !open && "hidden", collapsed && "lg:hidden")}>
        {item.children.map((c) => {
          const a = isActive(pathname, c.href, root);
          return (
            <Link
              key={c.href}
              href={c.href}
              className={cn(
                "block rounded-md px-3 py-1.5 text-[13px] transition-colors",
                a ? "text-white" : "text-slate-400 hover:text-white"
              )}
            >
              {c.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({ nav, portalLabel }: { nav: NavItem[]; portalLabel: string }) {
  const pathname = usePathname();
  const { collapsed, mobileOpen, setMobileOpen } = useUiStore();
  const root = nav[0].href!;

  useEffect(() => setMobileOpen(false), [pathname, setMobileOpen]);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 animate-fade-in bg-navy-950/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-950 transition-all duration-200 lg:static",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed && "lg:w-[72px]"
        )}
      >
        <div className={cn("flex h-14 items-center justify-between px-4", collapsed && "lg:justify-center lg:px-0")}>
          <span className="hidden lg:block">
            <Logo light showText={!collapsed} />
          </span>
          <span className="lg:hidden">
            <Logo light />
          </span>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 lg:hidden" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>

        <div className={cn("px-4 pb-3", collapsed && "lg:hidden")}>
          <span className="inline-block rounded bg-white/[0.07] px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-300">
            {portalLabel}
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {nav.map((item) => (
            <Row key={item.label} item={item} root={root} />
          ))}
        </nav>

        <div className={cn("border-t border-white/10 px-4 py-3 text-[11px] text-slate-500", collapsed && "lg:hidden")}>
          E-SIMS · Smart Inventory Management
        </div>
      </aside>
    </>
  );
}