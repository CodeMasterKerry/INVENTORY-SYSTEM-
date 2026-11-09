import { Printer } from "lucide-react";
import type { Sale } from "@/types";
import { formatCurrency, formatDate, formatPaymentMethod, toNumber } from "@/lib/utils";
import { printInvoice } from "@/lib/export";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SaleStatusBadge } from "@/components/ui/badge";

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export function SaleDetailsModal({
  sale,
  onClose,
  actions,
}: {
  sale: Sale | null;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  if (!sale) return null;
  const rejected = sale.status === "REJECTED";
  const reviewLabel = rejected ? "Rejected by" : "Approved by";
  const reviewer = rejected ? sale.rejectedBy?.name : sale.approvedBy?.name;
  const reviewDate = rejected ? sale.rejectedAt : sale.approvedAt;
  const reviewDateLabel = rejected ? "Rejected on" : "Approved on";

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Invoice ${sale.invoiceNo}`}
      description="Invoice preview"
      footer={
        <>
          <Button variant="secondary" onClick={() => printInvoice(sale)}>
            <Printer className="size-4" />
            Print / Save as PDF
          </Button>
          {actions}
        </>
      }
    >
      <div className="mb-5 flex items-center justify-between">
        <SaleStatusBadge status={sale.status} />
        <span className="text-xl font-semibold tabular-nums text-slate-900">{formatCurrency(sale.totalAmount)}</span>
      </div>
      <dl className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-4">
        <Info label="Prepared by">{sale.createdBy.name}</Info>
        <Info label="Payment method">{formatPaymentMethod(sale.paymentMethod)}</Info>
        <Info label="Created">{formatDate(sale.createdAt, true)}</Info>
        <Info label={reviewLabel}>{reviewer ?? "—"}</Info>
        <Info label={reviewDateLabel}>{formatDate(reviewDate, true)}</Info>
      </dl>
      {sale.notes && <p className="mt-4 rounded-lg border border-line bg-white px-4 py-3 text-sm text-slate-700"><span className="font-medium">Notes:</span> {sale.notes}</p>}
      {rejected && sale.rejectionReason && <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"><span className="font-medium">Rejection reason:</span> {sale.rejectionReason}</p>}
      <div className="mt-5 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[440px] text-left text-sm">
          <thead className="bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 text-right font-medium">Qty</th>
              <th className="px-4 py-2.5 text-right font-medium">Unit price</th>
              <th className="px-4 py-2.5 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-slate-900">{item.product?.name ?? `Product ${item.productId}`}</p>
                  <p className="font-mono text-xs text-slate-500">{item.product?.sku ?? "—"}</p>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(toNumber(item.unitPrice) * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto mt-4 grid max-w-sm grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
        <dt className="text-slate-500">Subtotal</dt>
        <dd className="text-right tabular-nums text-slate-800">{formatCurrency(sale.subtotalAmount)}</dd>
        <dt className="text-slate-500">Discount ({sale.discountPercent}%)</dt>
        <dd className="text-right tabular-nums text-red-600">-{formatCurrency(sale.discountAmount)}</dd>
        <dt className="text-slate-500">VAT ({sale.taxRate}%)</dt>
        <dd className="text-right tabular-nums text-slate-800">{formatCurrency(sale.taxAmount)}</dd>
        <dt className="border-t border-line pt-2 font-semibold text-slate-900">Total</dt>
        <dd className="border-t border-line pt-2 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(sale.totalAmount)}</dd>
      </dl>
    </Modal>
  );
}
