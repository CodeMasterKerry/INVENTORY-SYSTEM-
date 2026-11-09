import { api } from "@/lib/api";
import { dateFilterParams, dateRangeParams } from "@/components/ui/date-filter";
import type { DateFilterValue } from "@/components/ui/date-filter";
import type { Sale } from "@/types";

export function fetchSales({
  status,
  dateFilter,
  dateField,
  from,
  to,
}: {
  status?: string;
  dateFilter?: DateFilterValue;
  dateField?: "createdAt" | "approvedAt" | "rejectedAt";
  from?: Date | null;
  to?: Date | null;
} = {}) {
  const params = dateFilter
    ? dateFilterParams(dateFilter, dateField)
    : dateRangeParams(from ?? null, to ?? null, dateField);
  if (status) params.set("status", status);
  const query = params.toString();
  return api<Sale[]>(`/sales${query ? `?${query}` : ""}`);
}
