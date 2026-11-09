"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { UserAvatar } from "@/components/ui/user-avatar";

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  if (!user) return null;

  const profileHref = user.role === "MANAGER" ? "/manager/settings" : "/officer/profile";

  return (
    <div className="space-y-4">
      <Link href={profileHref} className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-white">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-10 text-sm" />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold leading-tight text-slate-900">{user.name}</span>
          <span className="mt-1 block text-xs leading-tight text-slate-500">
            {user.role === "MANAGER" ? "MANAGER" : "SALES_OFFICER"}
          </span>
        </span>
      </Link>
      <button
        onClick={() => {
          logout();
          router.replace("/login");
        }}
        className="flex h-9 w-full items-center gap-2 rounded-full border border-red-200 bg-white px-3 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        <LogOut className="size-4" />
        Logout
      </button>
    </div>
  );
}
