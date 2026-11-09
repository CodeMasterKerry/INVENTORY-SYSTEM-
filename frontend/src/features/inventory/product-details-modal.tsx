import type { Product, Role } from "@/types";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Badge, StockBadge } from "@/components/ui/badge";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export function ProductDetailsModal({ product, role, onClose }: { product: Product | null; role: Role; onClose: () => void }) {
  if (!product) return null;
  const margin = toNumber(product.sellingPrice) - toNumber(product.costPrice);
  return (
    <Modal open onClose={onClose} size="sm" title={product.name} description={product.sku}>
      <dl className="divide-y divide-line">
        {product.description && <Row label="Description">{product.description}</Row>}
        <Row label="Category">{product.category?.name ?? "—"}</Row>
        <Row label="Status">
          {product.isApproved ? (
            <StockBadge quantity={product.quantity} lowLevel={product.lowStockLevel} />
          ) : product.rejectedAt ? (
            <Badge tone="danger">Rejected</Badge>
          ) : (
            <Badge tone="warning">Pending approval</Badge>
          )}
        </Row>
        {product.rejectionReason && <Row label="Rejection reason">{product.rejectionReason}</Row>}
        <Row label="Available quantity"><span className="tabular-nums">{product.quantity}</span></Row>
        <Row label="Low-stock level"><span className="tabular-nums">{product.lowStockLevel}</span></Row>
        {role === "MANAGER" && <Row label="Purchase price">{formatCurrency(product.costPrice)}</Row>}
        <Row label="Selling price">{formatCurrency(product.sellingPrice)}</Row>
        {role === "MANAGER" && <Row label="Margin per unit">{formatCurrency(margin)}</Row>}
        <Row label="Added">{formatDate(product.createdAt, true)}</Row>
        <Row label="Unit">{product.unit || "—"}</Row>
        <Row label="Last updated">{formatDate(product.updatedAt, true)}</Row>
      </dl>
    </Modal>
  );
}