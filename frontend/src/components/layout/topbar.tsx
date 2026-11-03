import type { UserRole } from "../../types";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

export function Topbar({ role }: { role: UserRole }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <p className="text-sm font-medium capitalize text-slate-600">{role} workspace</p>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
