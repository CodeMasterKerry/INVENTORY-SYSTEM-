"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toNumber } from "@/lib/utils";
import type { BusinessSettings, Category, Product, Role } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface Props {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  role: Role;
  onSaved: () => void | Promise<void>;
}

export function ProductFormModal(props: Props) {
  return props.open ? <FormInner {...props} /> : null; // mounting fresh each time resets the form
}

function FormInner({ onClose, product, role, onSaved }: Props) {
  const editing = !!product;
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    categoryId: product ? String(product.categoryId) : "",
    costPrice: product ? String(toNumber(product.costPrice)) : "",
    sellingPrice: product ? String(toNumber(product.sellingPrice)) : "",
    quantity: "0",
    lowStockLevel: product ? String(product.lowStockLevel) : "",
    description: product?.description ?? "",
    unit: product?.unit ?? "",
  });

  useEffect(() => {
    api<Category[]>("/categories")
      .then(setCategories)
      .catch((e) => toast.error(e.message));
    if (!product) {
      api<BusinessSettings>("/settings/business")
        .then((settings) => setForm((current) => ({
          ...current,
          lowStockLevel: current.lowStockLevel || String(settings.defaultLowStockLevel),
        })))
        .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load default stock threshold"));
    }
  }, [product]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const e: Record<string, string> = {};
    const bad = (v: string) => v === "" || !Number.isFinite(Number(v)) || Number(v) < 0;
    if (!form.name.trim()) e.name = "Required";
    if (!editing && !form.sku.trim()) e.sku = "Required";
    if (!form.categoryId) e.categoryId = "Choose a category";
    if (bad(form.costPrice)) e.costPrice = "Enter a valid price";
    if (bad(form.sellingPrice)) e.sellingPrice = "Enter a valid price";
    if (!editing && (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0)) e.quantity = "Whole number, 0 or more";
    if (!Number.isInteger(Number(form.lowStockLevel)) || Number(form.lowStockLevel) < 0) e.lowStockLevel = "Whole number, 0 or more";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        const requestUpdate = role === "SALES_OFFICER";
        await api(requestUpdate ? `/products/${product!.id}/update-requests` : `/products/${product!.id}`, {
          method: requestUpdate ? "POST" : "PATCH",
          body: {
            name: form.name.trim(),
            costPrice: Number(form.costPrice),
            sellingPrice: Number(form.sellingPrice),
            lowStockLevel: Number(form.lowStockLevel),
            categoryId: Number(form.categoryId),
            description: form.description.trim(),
            unit: form.unit.trim(),
          },
        });
        toast.success(requestUpdate ? "Product update request submitted" : "Product updated");
      } else {
        await api("/products", {
          method: "POST",
          body: {
            name: form.name.trim(),
            sku: form.sku.trim(),
            categoryId: Number(form.categoryId),
            costPrice: Number(form.costPrice),
            sellingPrice: Number(form.sellingPrice),
            quantity: Number(form.quantity),
            lowStockLevel: Number(form.lowStockLevel),
            description: form.description.trim(),
            unit: form.unit.trim(),
          },
        });
        toast.success(role === "MANAGER" ? "Product added" : "Request submitted for approval");
      }
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const isUpdateRequest = editing && role === "SALES_OFFICER";
  const title = editing ? (isUpdateRequest ? "Request product update" : "Edit product") : role === "MANAGER" ? "Add product" : "Request new product";

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={isUpdateRequest
        ? "A manager reviews these changes. The current product stays unchanged until they approve."
        : !editing && role !== "MANAGER"
          ? "A manager reviews new products before they can be sold."
          : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="product-form" loading={saving}>
            {isUpdateRequest ? "Submit update request" : editing ? "Save changes" : role === "MANAGER" ? "Add product" : "Submit request"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Input label="Product name" value={form.name} onChange={set("name")} error={errors.name} />
        </div>
        <Input label="SKU" value={form.sku} onChange={set("sku")} error={errors.sku} disabled={editing} hint={editing ? "SKU cannot be changed" : undefined} className="font-mono" />
        <Select label="Category" value={form.categoryId} onChange={set("categoryId")} error={errors.categoryId}>
          <option value="">Select…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Input label="Cost price" type="number" min="0" step="0.01" value={form.costPrice} onChange={set("costPrice")} error={errors.costPrice} />
        <Input label="Selling price" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={set("sellingPrice")} error={errors.sellingPrice} />
        {!editing && <Input label="Initial quantity" type="number" min="0" step="1" value={form.quantity} onChange={set("quantity")} error={errors.quantity} />}
        <Input label="Low-stock threshold" type="number" min="0" step="1" value={form.lowStockLevel} onChange={set("lowStockLevel")} error={errors.lowStockLevel} hint="Alert when stock falls to this number" />
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="product-description" className="block text-[13px] font-medium text-slate-700">Description</label>
          <textarea
            id="product-description"
            rows={3}
            maxLength={5000}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Describe this product"
            className="w-full resize-y rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <Input label="Unit" value={form.unit} onChange={set("unit")} maxLength={40} placeholder="pcs, kg, box…" />
        {editing && <p className="text-xs text-slate-500 sm:col-span-2">To change stock, use Restock from the product list. Every change is logged.</p>}
      </form>
    </Modal>
  );
}