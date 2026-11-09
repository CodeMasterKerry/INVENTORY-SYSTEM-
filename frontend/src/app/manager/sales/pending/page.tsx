import { SalesView } from "@/features/sales/sales-view";

export const instant = false;

export default function Page() {
  return <SalesView role="MANAGER" status="PENDING" title="Pending Sales" description="Sales waiting for your decision." />;
}
