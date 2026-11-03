import { AppShell } from "@/components/layout/app-shell";

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="SALES_OFFICER" portalLabel="Sales Portal">{children}</AppShell>;
}