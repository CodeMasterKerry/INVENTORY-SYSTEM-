import { AppShell } from "@/components/layout/app-shell";

export const instant = false;

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="MANAGER" portalLabel="Manager">{children}</AppShell>;
}