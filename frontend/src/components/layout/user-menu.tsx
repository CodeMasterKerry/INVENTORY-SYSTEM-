"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { initials } from "@/lib/utils";
import { Dropdown } from "@/components/ui/dropdown";

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  if (!user) return null;

  const profileHref = user.role === "MANAGER" ? "/manager/settings" : "/officer/profile";

  return (
    <Dropdown
      width="w-60"
      trigger={
        <button className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 hover:bg-slate-100">
          <span className="flex size-8 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">
            {initials(user.name)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-[13px] font-medium leading-tight text-slate-900">{user.name}</span>
            <span className="block text-[11px] leading-tight text-slate-500">
              {user.role === "MANAGER" ? "Manager" : "Sales Officer"}
            </span>
          </span>
          <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
        </button>
      }
    >
      <div className="border-b border-line px-4 py-3">
        <p className="text-sm font-medium text-slate-900">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      <div className="py-1">
        <Link href={profileHref} className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50">
          <UserCircle className="size-4 text-slate-400" />
          {user.role === "MANAGER" ? "Settings" : "My profile"}
        </Link>
        <button
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-red-600 hover:bg-red-50"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </Dropdown>
  );
}