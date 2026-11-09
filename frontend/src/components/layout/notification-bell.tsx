"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, ClipboardCheck, PackageX, XCircle, Clock } from "lucide-react";
import { api } from "@/lib/api";
import type { ManagerDashboard, NotificationPreferences, OfficerDashboard, Role } from "@/types";
import { Dropdown } from "@/components/ui/dropdown";

interface Note { icon: React.ReactNode; text: string; href: string }

// Alerts are derived from dashboard counts and the signed-in user's saved preferences.
export function NotificationBell({ role }: { role: Role }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { preferences } = await api<{ preferences: NotificationPreferences }>("/account/notifications");
      if (role === "MANAGER") {
        const d = await api<ManagerDashboard>("/dashboard/manager");
        const n: Note[] = [];
        if (preferences.pendingSales && d.pendingSales) n.push({ icon: <ClipboardCheck className="size-4 text-amber-600" />, text: `${d.pendingSales} sale(s) awaiting approval`, href: "/manager/approvals/sales" });
        if (preferences.productRequests && d.pendingProducts) n.push({ icon: <ClipboardCheck className="size-4 text-amber-600" />, text: `${d.pendingProducts} product request(s) to review`, href: "/manager/approvals/products" });
        if (preferences.lowStock && d.lowStockCount) n.push({ icon: <PackageX className="size-4 text-red-600" />, text: `${d.lowStockCount} product(s) low on stock`, href: "/manager/inventory/low-stock" });
        setNotes(n);
      } else {
        const d = await api<OfficerDashboard>("/dashboard/officer");
        const n: Note[] = [];
        if (preferences.pendingSales && d.pendingSales) n.push({ icon: <Clock className="size-4 text-amber-600" />, text: `${d.pendingSales} sale(s) waiting for approval`, href: "/officer/sales" });
        if (preferences.rejectedSales && d.rejectedSales) n.push({ icon: <XCircle className="size-4 text-red-600" />, text: `${d.rejectedSales} sale(s) were rejected`, href: "/officer/sales" });
        setNotes(n);
      }
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load notifications");
    }
  }, [role]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const t = setInterval(load, 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      clearInterval(t);
    };
  }, [load]);

  return (
    <Dropdown
      width="w-80"
      trigger={
        <button className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Notifications">
          <Bell className="size-[18px]" />
          {notes.length > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />}
        </button>
      }
    >
      <div className="border-b border-line px-4 py-3 text-sm font-semibold text-slate-900">Notifications</div>
      {error ? (
        <p role="alert" className="px-4 py-8 text-center text-[13px] text-red-600">{error}</p>
      ) : notes.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-slate-500">You&apos;re all caught up.</p>
      ) : (
        <ul className="py-1">
          {notes.map((n, i) => (
            <li key={i}>
              <Link href={n.href} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
                {n.icon}
                {n.text}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Dropdown>
  );
}