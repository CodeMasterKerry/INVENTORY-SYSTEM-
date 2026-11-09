"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface ModuleTabItem {
  label: string;
  href: string;
}

export const inventoryTabs: ModuleTabItem[] = [
  { label: "All Products", href: "/manager/inventory/products" },
  { label: "Categories", href: "/manager/inventory/categories" },
  { label: "Stock Movements", href: "/manager/inventory/movements" },
  { label: "Low Stock", href: "/manager/inventory/low-stock" },
];

export const salesTabs: ModuleTabItem[] = [
  { label: "All Sales", href: "/manager/sales" },
  { label: "Pending Sales", href: "/manager/sales/pending" },
  { label: "Approved Sales", href: "/manager/sales/approved" },
  { label: "Rejected Sales", href: "/manager/sales/rejected" },
];

export const approvalTabs: ModuleTabItem[] = [
  { label: "Pending Sales", href: "/manager/approvals/sales" },
  { label: "Product Requests", href: "/manager/approvals/products" },
];

export function ModuleTabs({ items, label }: { items: ModuleTabItem[]; label: string }) {
  const pathname = usePathname();
  const activeHref = items
    .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label={`${label} sections`} className="mb-6 flex max-w-full gap-1 overflow-x-auto border-b border-line">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
