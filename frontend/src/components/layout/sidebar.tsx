"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import type { NavItem } from "./nav-config";
import { UserMenu } from "./user-menu";

function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

function Row({ item, root }: { item: NavItem; root: string }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active = isActive(pathname, item.activePrefix ?? item.href, root);

  const base = "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors";
  const tone = active
    ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
  return (
    <Link href={item.href} title={item.label} aria-current={active ? "page" : undefined} className={cn(base, tone)}>
      <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ nav, portalLabel }: { nav: NavItem[]; portalLabel: string }) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useUiStore();
  const root = nav[0].href;

  useEffect(() => setMobileOpen(false), [pathname, setMobileOpen]);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 top-[68px] z-30 animate-fade-in bg-slate-900/20 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        />
      )}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-[68px] z-40 flex w-[272px] shrink-0 flex-col border-r border-line bg-white transition-transform duration-200 md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-end px-3 md:hidden">
          <button onClick={() => setMobileOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label={`${portalLabel} navigation`} className="flex-1 space-y-1 overflow-y-auto px-0 py-4">
          {nav.map((item) => (
            <Row key={item.label} item={item} root={root} />
          ))}
        </nav>

        <div className="shrink-0 border-t border-line bg-slate-50/60 p-4">
          <UserMenu />
        </div>
      </aside>
    </>
  );
}