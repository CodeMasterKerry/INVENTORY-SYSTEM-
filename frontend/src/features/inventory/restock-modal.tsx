"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Product } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function RestockModal({ product, onClose, onDone }: { product: Product | null; onClose: () => void; onDone: () => void }) {
  return product ? <Inner product={product} onClose={onClose} onDone={onDone} /> : null;
}

function Inner({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) return setError("Enter a whole number above 0");
    setSaving(true);
    try {
      await api(`/products/${product.id}/restock`, { method: "POST", body: { quantity: n, reason: reason.trim() || undefined } });
      toast.success(`Added ${n} to ${product.name}`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Restock product"
      description={`${product.name} · currently ${product.quantity} in stock`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="restock-form" loading={saving}>Add stock</Button>
        </>
      }
    >
      <form id="restock-form" onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Quantity to add" type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} error={error} autoFocus />
        <Input label="Reason (optional)" placeholder="e.g. Supplier delivery" value={reason} onChange={(e) => setReason(e.target.value)} />
      </form>
    </Modal>
  );
}