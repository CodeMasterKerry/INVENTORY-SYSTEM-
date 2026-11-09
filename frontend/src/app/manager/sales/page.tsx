import { SalesView } from "@/features/sales/sales-view";

export const instant = false;

export default function Page() {
  return <SalesView role="MANAGER" title="All Sales" description="Every sale across all officers." />;
}
