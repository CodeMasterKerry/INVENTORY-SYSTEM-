import { OfficerSalesWorkspace } from "@/features/sales/officer-sales-workspace";

export const instant = false;

export default function Page() {
  return <OfficerSalesWorkspace initialTab="create" />;
}