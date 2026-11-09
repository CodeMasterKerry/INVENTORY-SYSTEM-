"use client";
import { useCallback, useMemo, useState } from "react";
import { useFetch } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import type { InventoryMovement } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { AwaitingNotice } from "@/components/ui/awaiting-backend";
import { inventoryTabs, ModuleTabs } from "@/components/layout/module-tabs";
import { DateFilter, initialDateFilter, resolveDateRange, type DateFilterValue } from "@/components/ui/date-filter";
import { fetchMovements } from "@/features/inventory/api";

export default function MovementsPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialDateFilter);
  const range = resolveDateRange(dateFilter);
  const from = range.start?.toISOString();
  const to = range.end?.toISOString();
  const loadMovements = useCallback(() => fetchMovements(from, to), [from, to]);
  const { data, error, loading, reload } = useFetch(loadMovements);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (m) =>
        (!type || m.type === type) &&
        (!term || m.product.name.toLowerCase().includes(term) || m.product.sku.toLowerCase().includes(term) || m.reason.toLowerCase().includes(term))
    );
  }, [data, q, type]);

  const columns: Column<InventoryMovement>[] = [
    { key: "date", header: "Date", sortValue: (m) => new Date(m.createdAt).getTime(), render: (m) => <span className="whitespace-nowrap">{formatDate(m.createdAt, true)}</span> },
    { key: "by", header: "Changed by", hideOnMobile: true, render: (m) => m.createdBy?.name ?? "Unknown (legacy)" },
    {
      key: "product",
      header: "Product",
      sortValue: (m) => m.product.name.toLowerCase(),
      render: (m) => (
        <div>
          <p className="font-medium text-slate-900">{m.product.name}</p>
          <p className="font-mono text-xs text-slate-500">{m.product.sku}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", render: (m) => <Badge tone={m.type === "IN" ? "success" : "danger"}>{m.type === "IN" ? "Stock in" : "Stock out"}</Badge> },
    {
      key: "qty",
      header: "Quantity",
      align: "right",
      sortValue: (m) => (m.type === "IN" ? m.quantity : -m.quantity),
      render: (m) => <span className={m.type === "IN" ? "text-emerald-700" : "text-red-700"}>{m.type === "IN" ? "+" : "−"}{m.quantity}</span>,
    },
    { key: "before", header: "Before", align: "right", hideOnMobile: true, render: (m) => m.quantityBefore ?? "—" },
    { key: "after", header: "After", align: "right", hideOnMobile: true, render: (m) => m.quantityAfter ?? "—" },
    { key: "reason", header: "Reason", hideOnMobile: true, render: (m) => m.reason },
  ];

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  return (
    <>
      <PageHeader title="Stock Movements" description="Recent stock changes, newest first." />
      <ModuleTabs items={inventoryTabs} label="Inventory" />
      <div className="mb-5"><DateFilter value={dateFilter} onChange={setDateFilter} /></div>
      <AwaitingNotice title="Older movement snapshots may be incomplete">
        New movements include the responsible staff member and stock before/after. Historical values remain unknown where those snapshots were not recorded.
      </AwaitingNotice>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        loading={loading && !data}
        toolbar={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Search product or reason…" />
            <Select className="h-9 sm:ml-auto sm:w-40" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
              <option value="">All movements</option>
              <option value="IN">Stock in</option>
              <option value="OUT">Stock out</option>
            </Select>
          </>
        }
        emptyTitle="No movements found"
      />
    </>
  );
}