"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useMounted } from "@/lib/hooks";
import { portalPath } from "@/lib/utils";
import type { Role } from "@/types";
import { managerNav, officerNav } from "./nav-config";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  role,
  portalLabel,
  children,
}: {
  role: Role;
  portalLabel: string;
  children: React.ReactNode;
}) {
  const nav = role === "MANAGER" ? managerNav : officerNav;
  const mounted = useMounted();
  const router = useRouter();
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!mounted) return;
    if (!token || !user) router.replace("/login");
    else if (user.role !== role) router.replace(portalPath(user.role));
  }, [mounted, token, user, role, router]);

  if (!mounted || !token || !user || user.role !== role) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <Sidebar nav={nav} portalLabel={portalLabel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} portalLabel={portalLabel.split(" ")[0]} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}