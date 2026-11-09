"use client";
import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Download, Printer, ShoppingCart, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useAuthStore } from "@/store/auth-store";
import { downloadCsv, printTable } from "@/lib/export";
import { formatCurrency, formatDate, formatNumber, formatPaymentMethod, toNumber } from "@/lib/utils";
import { revenueByDateRange } from "@/lib/analytics";
import type { InventoryMovement, Product, Role, Sale } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AwaitingNotice } from "@/components/ui/awaiting-backend";
import { DateFilter, initialDateFilter, isInDateRange, resolveDateRange, type DateFilterValue } from "@/components/ui/date-filter";
import { fetchMovements } from "@/features/inventory/api";
import { KpiCard } from "@/components/ui/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { saleRevenue } from "@/lib/sale-totals";

type ReportType = "sales" | "financial" | "inventory" | "movements";
interface ReportData {
  sales: Sale[];
  products: Product[];
  movements: InventoryMovement[];
}
interface BuiltReport {
  title: string;
  headers: string[];
  rows: string[][];
  summary: string[];
}

const fetchManager = async (type: ReportType, dateFilter: DateFilterValue): Promise<ReportData> => {
  const { start, end } = resolveDateRange(dateFilter);
  const productsRequest = type === "inventory" ? api<Product[]>("/products") : Promise.resolve([]);
  const salesRequest = type === "sales"
    ? api<Sale[]>(salesPath(dateFilter, "createdAt"))
    : type === "financial"
      ? api<Sale[]>(`${salesPath(dateFilter, "approvedAt")}&status=APPROVED`)
      : Promise.resolve([]);
  const movementsRequest = type === "movements"
    ? fetchMovements(start?.toISOString(), end?.toISOString())
    : Promise.resolve([]);
  const [sales, products, movements] = await Promise.all([salesRequest, productsRequest, movementsRequest]);
  return { sales, products, movements };
};
const fetchOfficer = async (type: ReportType, dateFilter: DateFilterValue): Promise<ReportData> => {
  const [sales, products] = await Promise.all([
    type === "sales" ? api<Sale[]>(salesPath(dateFilter, "createdAt")) : Promise.resolve([]),
    type === "inventory" ? api<Product[]>("/products") : Promise.resolve([]),
  ]);
  return { sales, products, movements: [] };
};

function salesPath(dateFilter: DateFilterValue, dateField: "createdAt" | "approvedAt") {
  const { start, end } = resolveDateRange(dateFilter);
  const params = new URLSearchParams();
  if (start) params.set("from", start.toISOString());
  if (end) params.set("to", end.toISOString());
  params.set("dateField", dateField);
  const query = params.toString();
  return `/sales${query ? `?${query}` : ""}`;
}

const labels: Record<ReportType, string> = {
  sales: "Sales report",
  financial: "Financial report (income)",
  inventory: "Inventory report",
  movements: "Stock movement report",
};
const stockLabel = (product: Product) =>
  !product.isApproved ? "Pending approval" : product.quantity <= 0 ? "Out of stock" : product.quantity <= product.lowStockLevel ? "Low stock" : "In stock";

export function ReportsView({ role }: { role: Role }) {
  const isManager = role === "MANAGER";
  const user = useAuthStore((state) => state.user);
  const [type, setType] = useState<ReportType>("sales");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialDateFilter);
  const loadReport = useCallback(
    () => isManager ? fetchManager(type, dateFilter) : fetchOfficer(type, dateFilter),
    [dateFilter, isManager, type]
  );
  const { data, error, loading, reload } = useFetch(loadReport);
  const reportTypes: ReportType[] = isManager ? ["sales", "financial", "inventory", "movements"] : ["sales", "inventory"];

  const report = useMemo<BuiltReport | null>(() => {
    if (!data) return null;
    const period = dateFilter.preset === "custom"
      ? `Period: ${dateFilter.from || "start"} to ${dateFilter.to || "today"}`
      : `Period: ${dateFilter.preset === "all" ? "all time" : dateFilter.preset.replace("-", " ")}`;

    if (type === "sales") {
      const sales = data.sales.filter((sale) => isInDateRange(sale.createdAt, dateFilter));
      const approved = sales.filter((sale) => sale.status === "APPROVED");
      return {
        title: labels.sales,
        headers: ["Invoice", "Date", "Prepared by", "Reviewed by", "Payment method", "Items", "Status", "Rejection reason", "Subtotal", "Discount", "VAT", "Total"],
        rows: sales.map((sale) => [
          sale.invoiceNo,
          formatDate(sale.createdAt, true),
          sale.createdBy.name,
          (sale.status === "REJECTED" ? sale.rejectedBy?.name : sale.approvedBy?.name) ?? "—",
          formatPaymentMethod(sale.paymentMethod),
          String(sale.items.reduce((sum, item) => sum + item.quantity, 0)),
          sale.status,
          sale.rejectionReason ?? "—",
          formatCurrency(sale.subtotalAmount),
          formatCurrency(sale.discountAmount),
          formatCurrency(sale.taxAmount),
          formatCurrency(sale.totalAmount),
        ]),
        summary: [
          period,
          `Approved revenue (excluding VAT): ${formatCurrency(approved.reduce((sum, sale) => sum + saleRevenue(sale), 0))} (${approved.length} sales)`,
          `VAT collected: ${formatCurrency(approved.reduce((sum, sale) => sum + toNumber(sale.taxAmount), 0))}`,
          `Pending: ${sales.filter((sale) => sale.status === "PENDING").length} · Rejected: ${sales.filter((sale) => sale.status === "REJECTED").length} (not counted as revenue)`,
        ],
      };
    }

    if (type === "financial") {
      const sales = data.sales.filter((sale) => sale.status === "APPROVED" && isInDateRange(sale.approvedAt ?? sale.createdAt, dateFilter));
      return {
        title: labels.financial,
        headers: ["Recorded", "Invoice", "Prepared by", "Approved by", "Payment method", "Subtotal", "Discount", "VAT", "Income excluding VAT", "Gross profit"],
        rows: sales.map((sale) => [
          formatDate(sale.approvedAt ?? sale.createdAt, true),
          sale.invoiceNo,
          sale.createdBy.name,
          sale.approvedBy?.name ?? "—",
          formatPaymentMethod(sale.paymentMethod),
          formatCurrency(sale.subtotalAmount),
          formatCurrency(sale.discountAmount),
          formatCurrency(sale.taxAmount),
          formatCurrency(saleRevenue(sale)),
          sale.items.every((item) => item.unitCost !== null)
            ? formatCurrency(saleRevenue(sale) - sale.items.reduce((sum, item) => sum + (toNumber(item.unitPrice) - toNumber(item.unitCost)) * item.quantity, 0))
            : "Unknown (legacy cost)",
        ]),
        summary: [
          period,
          `Net income: ${formatCurrency(sales.reduce((sum, sale) => sum + saleRevenue(sale), 0))} from ${sales.length} approved sales`,
          `VAT collected: ${formatCurrency(sales.reduce((sum, sale) => sum + toNumber(sale.taxAmount), 0))}`,
        ],
      };
    }

    if (type === "inventory") {
      const products = data.products;
      const value = products.filter((product) => product.isApproved).reduce((sum, product) => sum + toNumber(product.costPrice) * product.quantity, 0);
      return {
        title: labels.inventory,
        headers: ["Product", "SKU", "Category", "Quantity", ...(isManager ? ["Purchase price"] : []), "Selling price", "Status", ...(isManager ? ["Stock value"] : [])],
        rows: products.map((product) => [
          product.name, product.sku, product.category?.name ?? "—", String(product.quantity),
          ...(isManager ? [formatCurrency(product.costPrice)] : []),
          formatCurrency(product.sellingPrice), stockLabel(product),
          ...(isManager ? [formatCurrency(toNumber(product.costPrice) * product.quantity)] : []),
        ]),
        summary: [
          `Products: ${products.length} · Low or out of stock: ${products.filter((product) => product.isApproved && product.quantity <= product.lowStockLevel).length}`,
          ...(isManager ? [`Inventory value at cost: ${formatCurrency(value)}`] : []),
        ],
      };
    }

    const movements = data.movements.filter((movement) => isInDateRange(movement.createdAt, dateFilter));
    return {
      title: labels.movements,
      headers: ["Date", "Product", "SKU", "Type", "Quantity", "Before", "After", "Changed by", "Reason"],
      rows: movements.map((movement) => [
        formatDate(movement.createdAt, true),
        movement.product.name,
        movement.product.sku,
        movement.type === "IN" ? "Stock in" : "Stock out",
        String(movement.quantity),
        movement.quantityBefore === null ? "Unknown (legacy)" : String(movement.quantityBefore),
        movement.quantityAfter === null ? "Unknown (legacy)" : String(movement.quantityAfter),
        movement.createdBy?.name ?? "Unknown (legacy)",
        movement.reason,
      ]),
      summary: [period, `Movements: ${movements.length}`],
    };
  }, [data, type, dateFilter, isManager]);
  const selectedSales = (data?.sales ?? []).filter((sale) => isInDateRange(sale.createdAt, dateFilter));
  const approvedSales = selectedSales.filter((sale) => sale.status === "APPROVED");
  const approvedRevenue = approvedSales.reduce((sum, sale) => sum + saleRevenue(sale), 0);
  const averageSale = approvedSales.length ? approvedRevenue / approvedSales.length : 0;
  const vatCollected = approvedSales.reduce((sum, sale) => sum + toNumber(sale.taxAmount), 0);
  const cashSales = approvedSales.filter((sale) => sale.paymentMethod === "CASH").length;
  const transferSales = approvedSales.filter((sale) => sale.paymentMethod === "BANK_TRANSFER").length;
  const mobileSales = approvedSales.filter((sale) => sale.paymentMethod === "MOBILE").length;

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Reports" description="Build a report, then download it for Excel or save it as a PDF." />
      <AwaitingNotice title="Server-generated PDF/Excel and approval signatures are not available yet">
        Reports are created in your browser from existing data. CSV files open in Excel, and Print / Save as PDF uses your browser. The approval signature is left blank because the backend has no report-approval feature.
      </AwaitingNotice>
      <Card>
        <CardHeader title="Report settings" />
        <div className="grid gap-4 p-5 sm:grid-cols-[minmax(220px,0.8fr)_minmax(0,2fr)]">
          <Select label="Report type" value={type} onChange={(event) => setType(event.target.value as ReportType)}>
            {reportTypes.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
          </Select>
          {type !== "inventory" && <DateFilter value={dateFilter} onChange={setDateFilter} />}
        </div>
      </Card>
      {type === "sales" && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard loading={loading && !data} label={isManager ? "Total Revenue" : "My Revenue"} value={formatCurrency(approvedRevenue)} icon={Wallet} tone="brand" hint="Excluding VAT" />
            <KpiCard loading={loading && !data} label="Average Sale" value={formatCurrency(averageSale)} icon={ShoppingCart} tone="success" hint="Per approved transaction" />
            <KpiCard loading={loading && !data} label="VAT Collected" value={formatCurrency(vatCollected)} icon={CheckCircle2} tone="success" hint="From approved sales" />
            <KpiCard loading={loading && !data} label="Total Submitted" value={formatNumber(selectedSales.length)} icon={CreditCard} tone="warning" hint={`${selectedSales.filter((sale) => sale.status === "PENDING").length} pending · ${selectedSales.filter((sale) => sale.status === "REJECTED").length} rejected`} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
            <Card>
              <CardHeader title="Revenue Trend" description="Approved revenue in the selected date range" />
              <div className="p-4"><RevenueChart data={data ? revenueByDateRange(selectedSales, dateFilter) : []} /></div>
            </Card>
            <Card>
              <CardHeader title="Payment Methods" description="Approved transactions by payment type" />
              <div className="space-y-5 p-5">
                <PaymentBar label="Cash" value={cashSales} total={approvedSales.length} color="bg-emerald-500" />
                <PaymentBar label="Bank transfer" value={transferSales} total={approvedSales.length} color="bg-brand-500" />
                <PaymentBar label="Mobile" value={mobileSales} total={approvedSales.length} color="bg-purple-500" />
              </div>
            </Card>
          </div>
        </>
      )}
      <Card className="mt-4">
        <CardHeader
          title={report?.title ?? "Preview"}
          description={report ? `${report.rows.length} row${report.rows.length === 1 ? "" : "s"}` : undefined}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={!report?.rows.length} onClick={() => report && downloadCsv(`esims-${type}-${stamp}.csv`, report.headers, report.rows)}>
                <Download className="size-4" />CSV (Excel)
              </Button>
              <Button size="sm" disabled={!report?.rows.length} onClick={() => report && printTable({ title: report.title, preparedBy: user?.name ?? "—", summary: report.summary, headers: report.headers, rows: report.rows })}>
                <Printer className="size-4" />Print / PDF
              </Button>
            </div>
          }
        />
        {loading && !data ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-9" />)}</div>
        ) : report ? (
          <>
            <div className="space-y-0.5 border-b border-line bg-slate-50/60 px-5 py-3 text-[13px] text-slate-600">
              {report.summary.map((line) => <p key={line}>{line}</p>)}
            </div>
            {report.rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-slate-500">No data for this selection.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>{report.headers.map((header) => <th key={header} className="whitespace-nowrap px-4 py-2.5 font-medium">{header}</th>)}</tr>
                  </thead>
                  <tbody>
                    {report.rows.slice(0, 8).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-line">
                        {row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-4 py-2.5 text-slate-700">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.rows.length > 8 && <p className="border-t border-line px-5 py-3 text-xs text-slate-500">Showing 8 of {report.rows.length} rows. The download contains all of them.</p>}
              </div>
            )}
          </>
        ) : null}
      </Card>
    </>
  );
}

function PaymentBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[13px]">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">{value} ({percent}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
