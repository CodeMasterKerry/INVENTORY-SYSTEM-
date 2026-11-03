import { Bell } from "lucide-react";

export function NotificationBell() {
  return (
    <button
      aria-label="Notifications"
      className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
      type="button"
    >
      <Bell aria-hidden="true" size={18} />
    </button>
  );
}
