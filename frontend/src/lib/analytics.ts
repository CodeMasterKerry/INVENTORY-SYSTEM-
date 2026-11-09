import type { Product, Sale } from "@/types";
import { toNumber } from "./utils";
import { saleRevenue } from "./sale-totals";
import type { DateFilterValue } from "@/components/ui/date-filter";
import { resolveDateRange } from "@/components/ui/date-filter";

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const round = (n: number) => Math.round(n * 100) / 100;

export const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
export const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

// Only APPROVED sales ever count as revenue.
export function sumApproved(sales: Sale[], since: Date) {
  return sales
    .filter((s) => s.status === "APPROVED" && new Date(s.approvedAt ?? s.createdAt) >= since)
    .reduce((sum, s) => sum + saleRevenue(s), 0);
}

export function revenueByDay(sales: Sale[], days: number) {
  const now = new Date();
  const list: { key: string; date: string; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    list.push({
      key: dayKey(d),
      date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      revenue: 0,
    });
  }
  const index = new Map(list.map((x) => [x.key, x]));
  for (const s of sales) {
    if (s.status !== "APPROVED") continue;
    const row = index.get(dayKey(new Date(s.approvedAt ?? s.createdAt)));
    if (row) row.revenue += saleRevenue(s);
  }
  return list.map(({ date, revenue }) => ({ date, revenue: round(revenue) }));
}

export function revenueByDateRange(sales: Sale[], value: DateFilterValue) {
  const { start, end } = resolveDateRange(value);
  const now = new Date();
  const rangeEnd = end ?? now;
  const earliestSaleDate = value.preset === "custom" && end
    ? sales
      .filter((sale) => sale.status === "APPROVED")
      .reduce<Date | null>((earliest, sale) => {
        const date = new Date(sale.approvedAt ?? sale.createdAt);
        return !earliest || date < earliest ? date : earliest;
      }, null)
    : null;
  const rangeStart = start ?? (
    earliestSaleDate
      ? new Date(earliestSaleDate.getFullYear(), earliestSaleDate.getMonth(), earliestSaleDate.getDate())
      : new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() - 29)
  );
  const first = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const last = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
  if (first > last) return [];

  const list: { key: string; date: string; revenue: number }[] = [];
  for (const date = new Date(first); date <= last; date.setDate(date.getDate() + 1)) {
    list.push({
      key: dayKey(date),
      date: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      revenue: 0,
    });
  }
  const index = new Map(list.map((row) => [row.key, row]));
  for (const sale of sales) {
    if (sale.status !== "APPROVED") continue;
    const row = index.get(dayKey(new Date(sale.approvedAt ?? sale.createdAt)));
    if (row) row.revenue += saleRevenue(sale);
  }
  return list.map(({ date, revenue }) => ({ date, revenue: round(revenue) }));
}

export function topProducts(sales: Sale[], limit = 5) {
  const map = new Map<string, { label: string; units: number; revenue: number }>();
  for (const s of sales) {
    if (s.status !== "APPROVED") continue;
    for (const i of s.items) {
      const label = i.product?.name ?? `Product ${i.productId}`;
      const row = map.get(label) ?? { label, units: 0, revenue: 0 };
      row.units += i.quantity;
      row.revenue += toNumber(i.unitPrice) * i.quantity;
      map.set(label, row);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function inventoryValue(products: Product[]) {
  return products
    .filter((p) => p.isApproved)
    .reduce((sum, p) => sum + toNumber(p.costPrice) * p.quantity, 0);
}

export function inventoryByCategory(products: Product[]) {
  const map = new Map<string, number>();
  for (const p of products) {
    if (!p.isApproved) continue;
    const name = p.category?.name ?? "Uncategorised";
    map.set(name, (map.get(name) ?? 0) + toNumber(p.costPrice) * p.quantity);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: round(value) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function comparisonSummary(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "No change vs previous period" : "New vs previous period";
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(Math.abs(change) * 10) / 10;
  return `${change > 0 ? "+" : change < 0 ? "-" : ""}${rounded}% vs previous period`;
}