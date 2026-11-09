"use client";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useFetch } from "@/lib/hooks";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { AwaitingNotice } from "@/components/ui/awaiting-backend";
import { fetchProducts } from "@/features/inventory/api";
import { ProductFormModal } from "@/features/inventory/product-form-modal";

export default function ProductRequestsPage() {
  const user = useAuthStore((s) => s.user);
  const { data, error, loading, reload } = useFetch(fetchProducts);
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => (data ?? []).filter((p) => !p.isApproved && p.createdById === user?.id), [data, user]);

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
    { key: "price", header: "Selling price", align: "right", render: (p) => formatCurrency(p.sellingPrice) },
    { key: "qty", header: "Initial qty", align: "right", hideOnMobile: true, render: (p) => p.quantity },
    { key: "date", header: "Submitted", sortValue: (p) => new Date(p.createdAt).getTime(), render: (p) => formatDate(p.createdAt, true) },
    {
      key: "status",
      header: "Status",
      render: (product) =>
        product.rejectedAt ? <Badge tone="danger">Rejected</Badge> : <Badge tone="warning">Pending review</Badge>,
    },
    {
      key: "review",
      header: "Manager response",
      hideOnMobile: true,
      render: (product) => product.rejectionReason ?? "—",
    },
  ];

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  return (
    <>
      <PageHeader
        title="Product Requests"
        description="New products you submitted that are waiting for manager approval."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" />New request</Button>}
      />
      <AwaitingNotice title="Product update requests are not available">
        Approved requests move to your Products list. Rejected requests and the manager&apos;s reason remain visible here.
      </AwaitingNotice>
      <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} loading={loading && !data} emptyTitle="No pending requests" emptyDescription="Products you submit will appear here until a manager approves them." />
      <ProductFormModal open={open} onClose={() => setOpen(false)} role="SALES_OFFICER" onSaved={reload} />
    </>
  );
}