import type { ReactNode } from "react";
import type { UserRole } from "../../types";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children, role }: { children: ReactNode; role: UserRole }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={role} />
      <div className="min-h-screen md:pl-64">
        <Topbar role={role} />
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
