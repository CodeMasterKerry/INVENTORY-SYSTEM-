import { SalesView } from "@/features/sales/sales-view";

export const instant = false;

export default function Page() {
  return <SalesView role="MANAGER" status="REJECTED" title="Rejected Sales" description="Sales that were declined. No stock or revenue was affected." />;
}
