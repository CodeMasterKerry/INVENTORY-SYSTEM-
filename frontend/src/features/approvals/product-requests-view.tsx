"use client";
import { useCallback, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import type { Product, ProductUpdateRequest, User } from "@/types";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { approvalTabs, ModuleTabs } from "@/components/layout/module-tabs";
import { DateFilter, dateFilterParams, initialDateFilter, type DateFilterValue } from "@/components/ui/date-filter";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";

const fetchBundle = async (dateFilter: DateFilterValue) => {
  const query = dateFilterParams(dateFilter).toString();
  const [products, users, updates] = await Promise.all([
    api<Product[]>(`/products${query ? `?${query}` : ""}`),
    api<User[]>("/users"),
    api<ProductUpdateRequest[]>(`/product-update-requests${query ? `?${query}` : ""}`),
  ]);
  return { products, users, updates };
};

export function ProductRequestsView() {
  const [busy, setBusy] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<Product | null>(null);
  const [rejectingUpdate, setRejectingUpdate] = useState<ProductUpdateRequest | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialDateFilter);
  const loadBundle = useCallback(() => fetchBundle(dateFilter), [dateFilter]);
  const { data, error, loading, reload } = useFetch(loadBundle);
  const rows = useMemo(
    () => (data?.products ?? []).filter((product) => !product.isApproved && !product.rejectedAt),
    [data]
  );
  const nameOf = (id: number | null) => data?.users.find((user) => user.id === id)?.name ?? "—";

  async function approveUpdate(request: ProductUpdateRequest) {
    setBusy(request.id);
    try {
      await api(`/product-update-requests/${request.id}/approve`, { method: "PATCH" });
      toast.success(`${request.product.name} updated`);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve update");
    } finally {
      setBusy(null);
    }
  }

  async function approve(product: Product) {
    setBusy(product.id);
    try {
      await api(`/products/${product.id}/approve`, { method: "PATCH" });
      toast.success(`${product.name} approved`);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve");
    } finally {
      setBusy(null);
    }
  }

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortValue: (product) => product.name.toLowerCase(),
      render: (product) => <div><p className="font-medium text-slate-900">{product.name}</p><p className="font-mono text-xs text-slate-500">{product.sku}</p></div>,
    },
    { key: "category", header: "Category", hideOnMobile: true, render: (product) => product.category?.name ?? "—" },
    { key: "cost", header: "Purchase", align: "right", hideOnMobile: true, sortValue: (product) => toNumber(product.costPrice), render: (product) => formatCurrency(product.costPrice) },
    { key: "price", header: "Selling", align: "right", sortValue: (product) => toNumber(product.sellingPrice), render: (product) => formatCurrency(product.sellingPrice) },
    { key: "quantity", header: "Initial qty", align: "right", hideOnMobile: true, render: (product) => product.quantity },
    { key: "requestedBy", header: "Requested by", hideOnMobile: true, render: (product) => nameOf(product.createdById) },
    { key: "date", header: "Submitted", sortValue: (product) => new Date(product.createdAt).getTime(), render: (product) => formatDate(product.createdAt, true) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (product) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => setRejecting(product)}><X className="size-4" />Reject</Button>
          <Button size="sm" loading={busy === product.id} disabled={busy !== null && busy !== product.id} onClick={() => approve(product)}><Check className="size-4" />Approve</Button>
        </div>
      ),
    },
  ];

  const updateColumns: Column<ProductUpdateRequest>[] = [
    {
      key: "product",
      header: "Product",
      sortValue: (request) => request.product.name.toLowerCase(),
      render: (request) => <div><p className="font-medium text-slate-900">{request.product.name}</p><p className="font-mono text-xs text-slate-500">{request.product.sku}</p></div>,
    },
    {
      key: "name",
      header: "Proposed name",
      render: (request) => request.proposedName === request.product.name ? "—" : <span className="font-medium text-brand-700">{request.proposedName}</span>,
    },
    {
      key: "category",
      header: "Category",
      hideOnMobile: true,
      render: (request) => request.proposedCategory.name === request.product.category?.name
        ? request.proposedCategory.name
        : <span className="font-medium text-brand-700">{request.product.category?.name ?? "—"} → {request.proposedCategory.name}</span>,
    },
    {
      key: "prices",
      header: "Cost / selling",
      render: (request) => <div className="whitespace-nowrap text-xs"><p>{formatCurrency(request.product.costPrice)} / {formatCurrency(request.product.sellingPrice)}</p><p className="font-medium text-brand-700">{formatCurrency(request.proposedCostPrice)} / {formatCurrency(request.proposedSellingPrice)}</p></div>,
    },
    {
      key: "otherChanges",
      header: "Other proposed changes",
      hideOnMobile: true,
      render: (request) => (
        <div className="max-w-56 space-y-0.5 text-xs">
          <p>Low stock: {request.product.lowStockLevel} → <span className="font-medium text-brand-700">{request.proposedLowStockLevel}</span></p>
          <p>Unit: {request.product.unit || "—"} → <span className="font-medium text-brand-700">{request.proposedUnit || "—"}</span></p>
          {(request.product.description !== request.proposedDescription) && <p className="line-clamp-2" title={request.proposedDescription ?? "No description"}>Description: {request.proposedDescription || "Removed"}</p>}
        </div>
      ),
    },
    { key: "requestedBy", header: "Requested by", hideOnMobile: true, render: (request) => request.requestedBy.name },
    { key: "date", header: "Submitted", sortValue: (request) => new Date(request.createdAt).getTime(), render: (request) => formatDate(request.createdAt, true) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (request) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => setRejectingUpdate(request)}><X className="size-4" />Reject</Button>
          <Button size="sm" loading={busy === request.id} disabled={busy !== null && busy !== request.id} onClick={() => approveUpdate(request)}><Check className="size-4" />Approve</Button>
        </div>
      ),
    },
  ];

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  return (
    <>
      <PageHeader title="Product Requests" description="Review new products and proposed changes to existing products." />
      <ModuleTabs items={approvalTabs} label="Approvals" />
      <div className="mb-5"><DateFilter value={dateFilter} onChange={setDateFilter} /></div>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">New product requests</h2>
      <DataTable columns={columns} rows={rows} rowKey={(product) => product.id} loading={loading && !data} emptyTitle="No pending product requests" emptyDescription="New requests from sales officers appear here." />
      <h2 className="mb-3 mt-6 text-sm font-semibold text-slate-900">Product update requests</h2>
      <DataTable
        columns={updateColumns}
        rows={data?.updates ?? []}
        rowKey={(request) => request.id}
        loading={loading && !data}
        emptyTitle="No pending product updates"
        emptyDescription="Officer requests to change existing products appear here."
      />
      <ProductRejectionModal key={rejecting?.id ?? "closed"} product={rejecting} onClose={() => setRejecting(null)} onDone={reload} />
      <ProductUpdateRejectionModal key={rejectingUpdate?.id ?? "update-closed"} request={rejectingUpdate} onClose={() => setRejectingUpdate(null)} onDone={reload} />
    </>
  );
}

function ProductUpdateRejectionModal({
  request,
  onClose,
  onDone,
}: {
  request: ProductUpdateRequest | null;
  onClose: () => void;
  onDone: () => Promise<unknown>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function reject(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!request || !trimmed) return toast.error("Enter a reason for rejecting this request");
    setBusy(true);
    try {
      await api(`/product-update-requests/${request.id}/reject`, { method: "PATCH", body: { reason: trimmed } });
      toast.success(`${request.product.name} update rejected`);
      await onDone();
      onClose();
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reject update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!request}
      onClose={onClose}
      size="sm"
      title="Reject product update"
      description={request?.product.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" type="submit" form="product-update-rejection-form" loading={busy}>Reject request</Button>
        </>
      }
    >
      <form id="product-update-rejection-form" onSubmit={(event) => void reject(event)} className="space-y-2">
        <label htmlFor="product-update-rejection-reason" className="block text-[13px] font-medium text-slate-700">Reason</label>
        <textarea
          id="product-update-rejection-reason"
          rows={4}
          maxLength={1000}
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full resize-y rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </form>
    </Modal>
  );
}

function ProductRejectionModal({
  product,
  onClose,
  onDone,
}: {
  product: Product | null;
  onClose: () => void;
  onDone: () => Promise<unknown>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function reject(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!product || !trimmed) return toast.error("Enter a reason for rejecting this request");
    setBusy(true);
    try {
      await api(`/products/${product.id}/reject`, { method: "PATCH", body: { reason: trimmed } });
      toast.success(`${product.name} request rejected`);
      await onDone();
      onClose();
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reject request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      size="sm"
      title="Reject product request"
      description={product?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" type="submit" form="product-rejection-form" loading={busy}>Reject request</Button>
        </>
      }
    >
      <form id="product-rejection-form" onSubmit={reject} className="space-y-2">
        <label htmlFor="product-rejection-reason" className="block text-[13px] font-medium text-slate-700">Reason</label>
        <textarea
          id="product-rejection-reason"
          rows={4}
          maxLength={1000}
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full resize-y rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </form>
    </Modal>
  );
}
