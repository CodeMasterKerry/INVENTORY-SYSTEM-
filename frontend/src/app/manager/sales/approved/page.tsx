import { SalesView } from "@/features/sales/sales-view";

export const instant = false;

export default function Page() {
  return <SalesView role="MANAGER" status="APPROVED" title="Approved Sales" description="Completed sales that count toward revenue." />;
}
