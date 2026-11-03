"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import type { UserRole } from "../../types";
import { Logo } from "../ui/logo";
import { navConfig } from "./nav-config";

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = navConfig[role];

  return (
    <aside className="hidden fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white p-5 md:flex md:flex-col">
      <Logo />
      <nav aria-label="Main navigation" className="mt-8 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium",
                active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100",
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
