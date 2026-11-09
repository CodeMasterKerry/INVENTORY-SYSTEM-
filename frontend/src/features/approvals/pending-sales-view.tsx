"use client";
import { useCallback, useState } from "react";
import { AlertTriangle, Check, Clock3, CircleDollarSign, X } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { formatCurrency, formatDate, formatNumber, toNumber } from "@/lib/utils";
import type { Product, Sale } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { approvalTabs, ModuleTabs } from "@/components/layout/module-tabs";
import { DateFilter, initialDateFilter, type DateFilterValue } from "@/components/ui/date-filter";
import { ReviewModal, type ReviewMode } from "@/features/sales/review-modal";
import { fetchSales } from "@/features/sales/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { SearchInput } from "@/components/ui/search-input";

const fetchBundle = async (dateFilter: DateFilterValue) => {
  const [sales, products] = await Promise.all([
    fetchSales({ status: "PENDING", dateFilter, dateField: "createdAt" }),
    api<Product[]>("/products"),
  ]);
  return { sales, products };
};

export function PendingSalesView() {
  const [review, setReview] = useState<{ sale: Sale; mode: ReviewMode } | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialDateFilter);
  const [query, setQuery] = useState("");
  const loadBundle = useCallback(() => fetchBundle(dateFilter), [dateFilter]);
  const { data, error, loading, reload } = useFetch(loadBundle);

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  const sales = data?.sales ?? [];
  const stockOf = (productId: number) => data?.products.find((product) => product.id === productId)?.quantity ?? 0;
  const totalValue = sales.reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
  const rows = sales.filter((sale) => {
    const term = query.trim().toLowerCase();
    return !term || sale.invoiceNo.toLowerCase().includes(term) || sale.createdBy.name.toLowerCase().includes(term);
  });
  const columns: Column<Sale>[] = [
    { key: "invoice", header: "Invoice #", sortValue: (sale) => sale.invoiceNo, render: (sale) => <span className="font-mono text-[13px] font-medium text-slate-900">{sale.invoiceNo}</span> },
    { key: "date", header: "Date", sortValue: (sale) => new Date(sale.createdAt).getTime(), render: (sale) => formatDate(sale.createdAt) },
    { key: "staff", header: "Prepared By", sortValue: (sale) => sale.createdBy.name, render: (sale) => sale.createdBy.name },
    { key: "amount", header: "Total Amount", align: "right", sortValue: (sale) => toNumber(sale.totalAmount), render: (sale) => <span className="font-semibold text-slate-900">{formatCurrency(sale.totalAmount)}</span> },
    {
      key: "approval",
      header: "Requires Approval",
      render: (sale) => {
        const insufficient = sale.items.some((item) => stockOf(item.productId) < item.quantity);
        return (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${insufficient ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
            {insufficient ? "Insufficient stock" : "Approval required"}
          </span>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      render: (sale) => {
        const insufficient = sale.items.some((item) => stockOf(item.productId) < item.quantity);
        return (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="danger" onClick={() => setReview({ sale, mode: "reject" })} aria-label={`Reject ${sale.invoiceNo}`}>
              <X className="size-4" />
            </Button>
            <Button size="sm" disabled={insufficient} onClick={() => setReview({ sale, mode: "approve" })} aria-label={`Approve ${sale.invoiceNo}`}>
              <Check className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="Sales Approvals" description="Review and approve sales transactions." />
      <ModuleTabs items={approvalTabs} label="Approvals" />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard loading={loading && !data} label="Pending Approvals" value={formatNumber(sales.length)} icon={Clock3} tone="warning" />
        <KpiCard loading={loading && !data} label="Total Value" value={formatCurrency(totalValue)} icon={CircleDollarSign} tone="brand" />
        <KpiCard loading={loading && !data} label="Requires Approval" value={formatNumber(sales.length)} icon={AlertTriangle} tone="neutral" />
      </div>
      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto]">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by invoice number..." />
        <DateFilter value={dateFilter} onChange={setDateFilter} />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(sale) => sale.id}
        loading={loading && !data}
        emptyTitle={sales.length ? "No sales match your search" : "No pending approvals"}
        emptyDescription="Pending sale submissions will appear here for review."
      />
      <ReviewModal sale={review?.sale ?? null} mode={review?.mode ?? null} onClose={() => setReview(null)} onDone={reload} />
    </>
  );
}
