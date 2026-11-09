"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Sale } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export type ReviewMode = "approve" | "reject";

export function ReviewModal({
  sale,
  mode,
  onClose,
  onDone,
}: {
  sale: Sale | null;
  mode: ReviewMode | null;
  onClose: () => void;
  onDone: () => void;
}) {
  return sale && mode ? <Inner sale={sale} mode={mode} onClose={onClose} onDone={onDone} /> : null;
}

function Inner({ sale, mode, onClose, onDone }: { sale: Sale; mode: ReviewMode; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const approve = mode === "approve";

  async function confirm() {
    const trimmedReason = reason.trim();
    if (!approve && !trimmedReason) return toast.error("Enter a reason for rejecting this sale");
    setBusy(true);
    try {
      await api(`/sales/${sale.id}/${approve ? "approve" : "reject"}`, {
        method: "PATCH",
        ...(!approve ? { body: { reason: trimmedReason } } : {}),
      });
      toast.success(approve ? `${sale.invoiceNo} approved` : `${sale.invoiceNo} rejected`);
      onDone();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={approve ? "Approve this sale?" : "Reject this sale?"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={approve ? "primary" : "danger"} loading={busy} onClick={confirm}>
            {approve ? "Approve sale" : "Reject sale"}
          </Button>
        </>
      }
    >
      <div className="rounded-lg bg-slate-50 p-4">
        <p className="font-mono text-sm font-semibold text-slate-900">{sale.invoiceNo}</p>
        <p className="mt-0.5 text-[13px] text-slate-500">Prepared by {sale.createdBy.name}</p>
        <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{formatCurrency(sale.totalAmount)}</p>
      </div>
      <p className="mt-4 text-[13px] text-slate-600">
        {approve
          ? "Stock will be deducted, each movement logged, and the amount recorded as income. This cannot be undone."
          : "No stock is deducted and no income is recorded. This cannot be undone."}
      </p>
      {!approve && (
        <div className="mt-4 space-y-1.5">
          <label htmlFor="sale-rejection-reason" className="block text-[13px] font-medium text-slate-700">Rejection reason</label>
          <textarea
            id="sale-rejection-reason"
            rows={3}
            maxLength={1000}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
            placeholder="Explain why this sale is rejected…"
            className="w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      )}
    </Modal>
  );
}
