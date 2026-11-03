import { AppShell } from "@/components/layout/app-shell";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="MANAGER" portalLabel="Manager Console">{children}</AppShell>;
}