import { AppShell } from "@/components/layout/app-shell";

export const instant = false;

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="SALES_OFFICER" portalLabel="Sales Portal">{children}</AppShell>;
}