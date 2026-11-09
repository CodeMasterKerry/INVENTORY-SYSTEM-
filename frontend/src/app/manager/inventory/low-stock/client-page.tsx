"use client";
import { useState } from "react";
import { CheckCircle2, PackagePlus } from "lucide-react";
import { useFetch } from "@/lib/hooks";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StockBadge } from "@/components/ui/badge";
import { fetchLowStock } from "@/features/inventory/api";
import { RestockModal } from "@/features/inventory/restock-modal";
import { inventoryTabs, ModuleTabs } from "@/components/layout/module-tabs";

export default function LowStockPage() {
  const { data, error, loading, reload } = useFetch(fetchLowStock);
  const [restocking, setRestocking] = useState<Product | null>(null);

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortValue: (p) => p.name.toLowerCase(),
      render: (p) => (
        <div>
          <p className="font-medium text-slate-900">{p.name}</p>
          <p className="font-mono text-xs text-slate-500">{p.sku}</p>
        </div>
      ),
    },
    { key: "cat", header: "Category", hideOnMobile: true, render: (p) => p.category?.name ?? "—" },
    { key: "qty", header: "Available", align: "right", sortValue: (p) => p.quantity, render: (p) => p.quantity },
    { key: "level", header: "Threshold", align: "right", hideOnMobile: true, render: (p) => p.lowStockLevel },
    { key: "status", header: "Status", render: (p) => <StockBadge quantity={p.quantity} lowLevel={p.lowStockLevel} /> },
    {
      key: "act",
      header: "",
      align: "right",
      render: (p) => (
        <Button size="sm" variant="secondary" onClick={() => setRestocking(p)}>
          <PackagePlus className="size-4" />
          Restock
        </Button>
      ),
    },
  ];

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  return (
    <>
      <PageHeader title="Low Stock" description="Products at or below their low-stock level." />
      <ModuleTabs items={inventoryTabs} label="Inventory" />
      {!loading && data?.length === 0 ? (
        <Card><EmptyState icon={CheckCircle2} title="Stock levels are healthy" description="No product is at or below its threshold." /></Card>
      ) : (
        <DataTable columns={columns} rows={data ?? []} rowKey={(p) => p.id} loading={loading && !data} />
      )}
      <RestockModal product={restocking} onClose={() => setRestocking(null)} onDone={reload} />
    </>
  );
}