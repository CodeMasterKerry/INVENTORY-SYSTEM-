"use client";
import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, Check, Eye, Package, PackagePlus, PackageSearch, PackageX, Pencil, Plus, RefreshCw, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { formatCurrency, toNumber } from "@/lib/utils";
import type { PendingProductUpdate, Product, Role } from "@/types";
import { Badge, StockBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { KpiCard } from "@/components/ui/kpi-card";
import { toast } from "@/components/ui/toast";
import { inventoryTabs, ModuleTabs } from "@/components/layout/module-tabs";
import { fetchProducts } from "./api";
import { ProductFormModal } from "./product-form-modal";
import { ProductDetailsModal } from "./product-details-modal";
import { RestockModal } from "./restock-modal";

function statusOf(p: Product) {
  if (!p.isApproved && p.rejectedAt) return "rejected";
  if (!p.isApproved) return "pending";
  if (p.quantity <= 0) return "out";
  if (p.quantity <= p.lowStockLevel) return "low";
  return "in";
}

export function ProductsView({ role }: { role: Role }) {
  const isManager = role === "MANAGER";
  const loadBundle = useCallback(async () => {
    const [products, updateRequests] = await Promise.all([
      fetchProducts(),
      role === "SALES_OFFICER" ? api<PendingProductUpdate[]>("/product-update-requests/mine") : Promise.resolve([]),
    ]);
    return { products, updateRequests };
  }, [role]);
  const { data, error, loading, reload } = useFetch(loadBundle);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [restocking, setRestocking] = useState<Product | null>(null);

  const products = useMemo(() => data?.products ?? [], [data]);
  const pendingUpdateIds = useMemo(() => new Set((data?.updateRequests ?? []).map((request) => request.productId)), [data]);
  const categories = useMemo(
    () => [...new Map(products.filter((p) => p.category).map((p) => [p.category!.id, p.category!])).values()],
    [products]
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)) &&
        (!cat || String(p.categoryId) === cat) &&
        (!status || statusOf(p) === status)
    );
  }, [products, q, cat, status]);

  async function approve(p: Product) {
    try {
      await api(`/products/${p.id}/approve`, { method: "PATCH" });
      toast.success(`${p.name} approved`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not approve");
    }
  }

  const iconBtn = "rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800";

  const columns: Column<Product>[] = [
    { key: "sku", header: "SKU", sortValue: (p) => p.sku, render: (p) => <span className="font-mono text-xs text-slate-800">{p.sku}</span> },
    {
      key: "name",
      header: "Product Name",
      sortValue: (p) => p.name.toLowerCase(),
      render: (p) => (
        <div>
          <p className="font-medium text-slate-900">{p.name}</p>
          {pendingUpdateIds.has(p.id) && <p className="text-xs font-medium text-amber-700">Update request pending review</p>}
        </div>
      ),
    },
    { key: "cat", header: "Category", hideOnMobile: true, sortValue: (p) => p.category?.name ?? "", render: (p) => p.category?.name ?? "—" },
    { key: "price", header: "Price", align: "right", sortValue: (p) => toNumber(p.sellingPrice), render: (p) => formatCurrency(p.sellingPrice) },
    { key: "qty", header: "Stock", align: "right", sortValue: (p) => p.quantity, render: (p) => <span className={p.quantity <= p.lowStockLevel ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>{p.quantity}</span> },
    {
      key: "status",
      header: "Status",
      render: (p) =>
        p.isApproved ? (
          <StockBadge quantity={p.quantity} lowLevel={p.lowStockLevel} />
        ) : p.rejectedAt ? (
          <Badge tone="danger">Rejected</Badge>
        ) : (
          <Badge tone="warning">Pending approval</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-0.5">
          <button className={iconBtn} title="View details" onClick={() => setViewing(p)}><Eye className="size-4" /></button>
          {(isManager || (role === "SALES_OFFICER" && p.isApproved)) && (
            <>
              {(!pendingUpdateIds.has(p.id) || isManager) && <button className={iconBtn} title={isManager ? "Edit" : "Request product update"} aria-label={isManager ? `Edit ${p.name}` : `Request update to ${p.name}`} onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil className="size-4" /></button>}
              {isManager && p.isApproved ? (
                <button className={iconBtn} title="Restock" onClick={() => setRestocking(p)}><PackagePlus className="size-4" /></button>
              ) : isManager && !p.rejectedAt ? (
                <button className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" title="Approve" onClick={() => approve(p)}><Check className="size-4" /></button>
              ) : null}
            </>
          )}
        </div>
      ),
    },
  ];

  if (error && !data)
    return (
      <Card>
        <ErrorState message={error} onRetry={reload} />
      </Card>
    );

  return (
    <>
      <PageHeader
        title={isManager ? "Inventory Management" : "Products"}
        description={isManager ? "Manage products, stock levels and pricing." : "View and manage available inventory."}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void reload()} disabled={loading}>
              <RefreshCw className="size-4" />Refresh
            </Button>
            <Button size="md" className="w-full sm:w-auto" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="size-4" />{isManager ? "Add Product" : "Request product"}
            </Button>
          </>
        }
      />
      {isManager && <ModuleTabs items={inventoryTabs} label="Inventory" />}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard loading={loading && !data} label="Total Products" value={String(products.length)} icon={Package} hint="Products in catalogue" />
        <KpiCard loading={loading && !data} label="Active" value={String(products.filter((product) => product.isApproved).length)} icon={TrendingUp} tone="success" hint="Approved products" />
        <KpiCard loading={loading && !data} label="Low Stock" value={String(products.filter((product) => product.isApproved && product.quantity > 0 && product.quantity <= product.lowStockLevel).length)} icon={AlertTriangle} tone="warning" />
        <KpiCard loading={loading && !data} label="Out of Stock" value={String(products.filter((product) => product.isApproved && product.quantity <= 0).length)} icon={PackageX} tone="danger" />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        loading={loading && !data}
        toolbar={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Search name or SKU…" />
            <div className="flex gap-2 sm:ml-auto">
              <Select className="h-9" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select className="h-9" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option>
                <option value="in">In stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
                <option value="pending">Pending approval</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
          </>
        }
        emptyTitle={products.length === 0 ? "No products yet" : "No products match your filters"}
        emptyDescription={products.length === 0 ? "Add your first product to get started." : "Try a different search or clear the filters."}
        emptyAction={products.length === 0 ? <Button onClick={() => setFormOpen(true)}><PackageSearch className="size-4" />Add product</Button> : undefined}
      />

      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} product={editing} role={role} onSaved={reload} />
      <ProductDetailsModal product={viewing} role={role} onClose={() => setViewing(null)} />
      <RestockModal product={restocking} onClose={() => setRestocking(null)} onDone={reload} />
    </>
  );
}