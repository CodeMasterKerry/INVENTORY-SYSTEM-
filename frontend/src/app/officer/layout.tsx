import type { ReactNode } from "react";
import { AppShell } from "../../components/layout/app-shell";

export default function OfficerLayout({ children }: { children: ReactNode }) {
  return <AppShell role="officer">{children}</AppShell>;
}
