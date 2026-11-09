"use client";
import { useCallback, useMemo, useState } from "react";
import { CalendarDays, Check, CircleX, Eye, ShoppingCart, Wallet, X } from "lucide-react";
import { useFetch } from "@/lib/hooks";
import { formatCurrency, formatDate, formatNumber, formatPaymentMethod, toNumber } from "@/lib/utils";
import type { Role, Sale, SaleStatus } from "@/types";
import { SaleStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ModuleTabs, salesTabs } from "@/components/layout/module-tabs";
import { KpiCard } from "@/components/ui/kpi-card";
import { DateFilter, initialDateFilter, type DateFilterValue } from "@/components/ui/date-filter";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { fetchSales } from "./api";
import { SaleDetailsModal } from "./sale-details-modal";
import { ReviewModal, type ReviewMode } from "./review-modal";
import { saleRevenue } from "@/lib/sale-totals";

export function SalesView({
  role,
  status,
  title,
  description,
  showHeader = true,
}: {
  role: Role;
  status?: SaleStatus;
  title: string;
  description: string;
  showHeader?: boolean;
}) {
  const isManager = role === "MANAGER";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialDateFilter);
  const requestedStatus = status || statusFilter || undefined;
  const loadSales = useCallback(
    () => fetchSales({ status: requestedStatus, dateFilter, dateField: "createdAt" }),
    [requestedStatus, dateFilter]
  );
  const { data, error, loading, reload } = useFetch(loadSales);
  const [viewing, setViewing] = useState<Sale | null>(null);
  const [review, setReview] = useState<{ sale: Sale; mode: ReviewMode } | null>(null);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data ?? []).filter((sale) => {
      return (
        (!status || sale.status === status) &&
        (!statusFilter || sale.status === statusFilter) &&
        (!term || sale.invoiceNo.toLowerCase().includes(term) || (isManager && sale.createdBy.name.toLowerCase().includes(term)))
      );
    });
  }, [data, query, statusFilter, status, isManager]);
  const allSales = data ?? [];
  const approvedSales = allSales.filter((sale) => sale.status === "APPROVED");
  const revenue = approvedSales.reduce((sum, sale) => sum + saleRevenue(sale), 0);

  const actionClass = "rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800";
  const columns: Column<Sale>[] = [
    { key: "invoice", header: "Invoice", sortValue: (sale) => sale.invoiceNo, render: (sale) => <span className="font-mono text-[13px] font-medium text-slate-900">{sale.invoiceNo}</span> },
    { key: "by", header: "Responsible staff", hideOnMobile: true, sortValue: (sale) => sale.createdBy.name.toLowerCase(), render: (sale) => sale.createdBy.name },
    { key: "payment", header: "Payment", hideOnMobile: true, render: (sale) => formatPaymentMethod(sale.paymentMethod) },
    { key: "items", header: "Items", align: "right", hideOnMobile: true, sortValue: (sale) => sale.items.length, render: (sale) => sale.items.reduce((sum, item) => sum + item.quantity, 0) },
    { key: "subtotal", header: "Subtotal", align: "right", hideOnMobile: true, sortValue: (sale) => toNumber(sale.subtotalAmount), render: (sale) => formatCurrency(sale.subtotalAmount) },
    { key: "discount", header: "Discount", align: "right", hideOnMobile: true, sortValue: (sale) => toNumber(sale.discountAmount), render: (sale) => <span className="text-red-600">-{formatCurrency(sale.discountAmount)}</span> },
    { key: "tax", header: "VAT", align: "right", hideOnMobile: true, sortValue: (sale) => toNumber(sale.taxAmount), render: (sale) => formatCurrency(sale.taxAmount) },
    { key: "total", header: "Total", align: "right", sortValue: (sale) => toNumber(sale.totalAmount), render: (sale) => <span className="font-medium text-slate-900">{formatCurrency(sale.totalAmount)}</span> },
    { key: "status", header: "Status", render: (sale) => <SaleStatusBadge status={sale.status} /> },
    { key: "date", header: "Date", sortValue: (sale) => new Date(sale.createdAt).getTime(), render: (sale) => <span className="whitespace-nowrap">{formatDate(sale.createdAt, true)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (sale) => (
        <div className="flex items-center justify-end gap-0.5">
          <button className={actionClass} title="View invoice" aria-label={`View invoice ${sale.invoiceNo}`} onClick={() => setViewing(sale)}><Eye className="size-4" /></button>
          {isManager && sale.status === "PENDING" && (
            <>
              <button className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" title="Approve" aria-label={`Approve ${sale.invoiceNo}`} onClick={() => setReview({ sale, mode: "approve" })}><Check className="size-4" /></button>
              <button className="rounded-md p-1.5 text-red-600 hover:bg-red-50" title="Reject" aria-label={`Reject ${sale.invoiceNo}`} onClick={() => setReview({ sale, mode: "reject" })}><X className="size-4" /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  return (
    <>
      {showHeader && <PageHeader title={title} description={description} />}
      {isManager && <ModuleTabs items={salesTabs} label="Sales" />}
      {!isManager && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard loading={loading && !data} label="Total Sales" value={formatNumber(allSales.length)} icon={ShoppingCart} />
          <KpiCard loading={loading && !data} label="Pending" value={formatNumber(allSales.filter((sale) => sale.status === "PENDING").length)} icon={CalendarDays} tone="warning" />
          <KpiCard loading={loading && !data} label="Approved" value={formatNumber(approvedSales.length)} icon={Check} tone="success" />
          <KpiCard loading={loading && !data} label="Rejected" value={formatNumber(allSales.filter((sale) => sale.status === "REJECTED").length)} icon={CircleX} tone="danger" />
          <KpiCard loading={loading && !data} label="Revenue" value={formatCurrency(revenue)} icon={Wallet} hint="Approved sales" />
        </div>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(sale) => sale.id}
        loading={loading && !data}
        toolbar={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder={isManager ? "Search invoice or officer…" : "Search invoice…"} />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {!status && (
                <Select className="h-9" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
                  <option value="">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </Select>
              )}
              <DateFilter value={dateFilter} onChange={setDateFilter} />
            </div>
          </>
        }
        emptyTitle="No sales found"
        emptyDescription="Try changing the search or date range."
      />
      <SaleDetailsModal
        sale={viewing}
        onClose={() => setViewing(null)}
        actions={
          isManager && viewing?.status === "PENDING" ? (
            <>
              <Button variant="danger" onClick={() => { setReview({ sale: viewing, mode: "reject" }); setViewing(null); }}>Reject</Button>
              <Button onClick={() => { setReview({ sale: viewing, mode: "approve" }); setViewing(null); }}>Approve</Button>
            </>
          ) : undefined
        }
      />
      <ReviewModal sale={review?.sale ?? null} mode={review?.mode ?? null} onClose={() => setReview(null)} onDone={reload} />
    </>
  );
}
