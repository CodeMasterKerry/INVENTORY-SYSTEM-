"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Minus, PackageSearch, Plus, RefreshCw, ShoppingCart, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { cn, formatCurrency, toNumber } from "@/lib/utils";
import type { PaymentMethod, Product, Sale } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, SaleStatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/store/auth-store";
import { calculateSaleTotals } from "@/lib/sale-totals";
import type { BusinessSettings } from "@/types";

const MANAGER_APPROVAL_THRESHOLD = 50_000;

async function fetchPosData() {
  const [products, settings] = await Promise.all([
    api<Product[]>("/products"),
    api<BusinessSettings>("/settings/business"),
  ]);
  return { products, settings };
}

interface Line {
  product: Product;
  qty: number;
}

interface CartPanelProps {
  lines: Line[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  approvalRequired: boolean;
  submitting: boolean;
  onQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onSubmit: () => void;
  staffName: string;
  paymentMethod: PaymentMethod | "";
  onPaymentMethod: (value: PaymentMethod | "") => void;
  onDiscountPercent: (value: number) => void;
  notes: string;
  onNotes: (value: string) => void;
}

function CartPanel({
  lines, subtotal, discountPercent, discountAmount, taxRate, taxAmount, total, approvalRequired, submitting,
  onQty, onRemove, onClear, onSubmit, staffName, paymentMethod, onPaymentMethod,
  onDiscountPercent, notes, onNotes,
}: CartPanelProps) {
  const count = lines.reduce((s, l) => s + l.qty, 0);
  return (
    <div className="flex h-full flex-col">
      {lines.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Cart is empty" description="Select products on the left to start a sale." />
      ) : (
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {lines.map(({ product: p, qty }) => (
            <li key={p.id} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs tabular-nums text-slate-500">{formatCurrency(p.sellingPrice)} each</p>
                </div>
                <button onClick={() => onRemove(p.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${p.name}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <div className="inline-flex items-center rounded-md border border-line">
                  <button onClick={() => onQty(p.id, qty - 1)} className="p-1.5 text-slate-600 hover:bg-slate-50" aria-label="Decrease quantity">
                    <Minus className="size-3.5" />
                  </button>
                  <input
                    value={qty}
                    onChange={(e) => onQty(p.id, Number(e.target.value.replace(/\D/g, "")) || 0)}
                    inputMode="numeric"
                    className="w-10 border-x border-line py-1 text-center text-sm tabular-nums focus:outline-none"
                    aria-label="Quantity"
                  />
                  <button
                    onClick={() => onQty(p.id, qty + 1)}
                    disabled={qty >= p.quantity}
                    className="p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <span className="text-sm font-medium tabular-nums text-slate-900">{formatCurrency(toNumber(p.sellingPrice) * qty)}</span>
              </div>
              {qty >= p.quantity && <p className="mt-1.5 text-xs text-amber-600">Maximum available: {p.quantity}</p>}
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line bg-slate-50/60 px-5 py-4">
        <dl className="mb-3 space-y-2 border-b border-line pb-3 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Responsible staff</dt>
            <dd className="text-right font-medium text-slate-800">{staffName || "Signed-in officer"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Payment method</dt>
            <dd className="font-medium text-slate-800">
              {paymentMethod === "CASH" ? "Cash" : paymentMethod === "BANK_TRANSFER" ? "Bank Transfer" : paymentMethod === "MOBILE" ? "Mobile" : "Select below"}
            </dd>
          </div>
        </dl>
        <div className="mb-3">
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(event) => {
              const value = event.target.value;
              onPaymentMethod(value === "CASH" || value === "BANK_TRANSFER" || value === "MOBILE" ? value : "");
            }}
          >
            <option value="">Select a payment method…</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="MOBILE">Mobile</option>
          </Select>
        </div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <label htmlFor="sale-discount" className="text-[13px] font-medium text-slate-700">Discount %</label>
          <input
            id="sale-discount"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={discountPercent}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              onDiscountPercent(Number.isFinite(nextValue) ? Math.round(Math.min(100, Math.max(0, nextValue)) * 100) / 100 : 0);
            }}
            className="h-9 w-24 rounded-md border border-line bg-white px-2.5 text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="mb-3 space-y-1.5">
          <label htmlFor="sale-notes" className="block text-[13px] font-medium text-slate-700">Notes (optional)</label>
          <textarea id="sale-notes" rows={2} maxLength={2000} value={notes} onChange={(event) => onNotes(event.target.value)} placeholder="Add a note to this sale…" className="w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </div>
        <div className="flex items-center justify-between text-[13px] text-slate-500">
          <span>{count} item{count === 1 ? "" : "s"}</span>
          {lines.length > 0 && (
            <button onClick={onClear} className="hover:text-red-600">Clear cart</button>
          )}
        </div>
        <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="tabular-nums text-slate-800">{formatCurrency(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Discount ({discountPercent}%)</dt>
            <dd className="tabular-nums text-red-600">-{formatCurrency(discountAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">VAT ({taxRate}%)</dt>
            <dd className="tabular-nums text-slate-800">{formatCurrency(taxAmount)}</dd>
          </div>
        </dl>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
          <span className="text-sm font-semibold text-slate-900">Total</span>
          <span className="text-xl font-semibold tabular-nums text-slate-900">{formatCurrency(total)}</span>
        </div>
        <Button size="lg" className="mt-4 w-full" disabled={lines.length === 0 || !paymentMethod} loading={submitting} onClick={onSubmit}>
          {approvalRequired ? "Submit for manager approval" : "Complete sale"}
        </Button>
        <p className="mt-2 text-center text-xs text-slate-500">
          {approvalRequired
            ? "Sales over 50,000 birr require manager approval."
            : "Sales of 50,000 birr or less are completed immediately."}
        </p>
      </div>
    </div>
  );
}

export function PosView({ showHeader = true }: { showHeader?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const { data, error, loading, reload } = useFetch(fetchPosData);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Sale | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState("");

  // Only approved products can be sold.
  const products = useMemo(() => (data?.products ?? []).filter((p) => p.isApproved), [data]);
  const taxRate = toNumber(data?.settings.taxRate);

  const categories = useMemo(
    () => [...new Map(products.filter((p) => p.category).map((p) => [p.category!.id, p.category!])).values()],
    [products]
  );

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!cat || String(p.categoryId) === cat) &&
        (!term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))
    );
  }, [products, q, cat]);

  const lines: Line[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ product: products.find((p) => p.id === Number(id))!, qty }))
        .filter((l) => l.product && l.qty > 0),
    [cart, products]
  );
  const subtotal = lines.reduce((sum, line) => sum + Math.round(toNumber(line.product.sellingPrice) * 100) * line.qty, 0) / 100;
  const totals = calculateSaleTotals(subtotal, discountPercent, taxRate);
  const total = totals.total;
  const approvalRequired = total > MANAGER_APPROVAL_THRESHOLD;
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  function openProduct(p: Product) {
    setSelectedProduct(p);
    setSelectedQuantity(Math.min(cart[p.id] ?? 1, p.quantity));
  }

  function add(p: Product, quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) return toast.error("Choose a whole number greater than zero");
    if (quantity > p.quantity) return toast.error(`Only ${p.quantity} of ${p.name} in stock`);
    setCart((current) => ({ ...current, [p.id]: quantity }));
    setSelectedProduct(null);
  }

  function setQty(id: number, qty: number) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    if (qty <= 0) return remove(id);
    if (qty > p.quantity) {
      toast.error(`Only ${p.quantity} of ${p.name} in stock`);
      qty = p.quantity;
    }
    setCart((c) => ({ ...c, [id]: qty }));
  }

  function remove(id: number) {
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  }

  async function submit() {
    if (lines.length === 0) return;
    if (!paymentMethod) return toast.error("Select a payment method before submitting");
    setSubmitting(true);
    try {
      const sale = await api<Sale>("/sales", {
        method: "POST",
        body: {
          items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
          paymentMethod,
          discountPercent,
          notes: notes.trim() || undefined,
        },
      });
      setResult(sale);
      setCart({});
      setPaymentMethod("");
      setDiscountPercent(0);
      setNotes("");
      setCartOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit sale");
      reload(); // stock may have changed, so refresh the numbers
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  const cartProps: CartPanelProps = {
    lines,
    subtotal: totals.subtotal,
    discountPercent,
    discountAmount: totals.discount,
    taxRate,
    taxAmount: totals.tax,
    total,
    approvalRequired,
    submitting,
    onQty: setQty,
    onRemove: remove,
    onClear: () => setCart({}),
    onSubmit: submit,
    staffName: user?.name ?? "",
    paymentMethod,
    onPaymentMethod: setPaymentMethod,
    onDiscountPercent: setDiscountPercent,
    notes,
    onNotes: setNotes,
  };

  return (
    <>
      {showHeader && <PageHeader title="New Sale" description="Sales over 50,000 birr require manager approval; smaller sales are completed immediately." />}

      <div className="grid gap-4 pb-20 lg:grid-cols-[1fr_380px] lg:pb-0">
        {/* LEFT: product selection */}
        <div className="min-w-0">
          <Card>
            <CardHeader title="Select Products" description="Search and add products to cart" action={
              <Button variant="secondary" size="sm" onClick={() => void reload()} disabled={loading}>
                <RefreshCw className="size-4" />Refresh
              </Button>
            } />
            <div className="space-y-3 border-b border-line p-4">
              <SearchInput value={q} onChange={setQ} placeholder="Search name or SKU…" />
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                {[{ id: "", name: "All" }, ...categories.map((c) => ({ id: String(c.id), name: c.name }))].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCat(c.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      cat === c.id ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {loading && !data ? (
              <div className="divide-y divide-line px-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="my-3 h-12" />)}
              </div>
            ) : visible.length === 0 ? (
              <EmptyState icon={PackageSearch} title="No products found" description={products.length === 0 ? "No approved products are available yet." : "Try a different search or category."} />
            ) : (
              <div className="divide-y divide-line px-4">
                {visible.map((p) => {
                  const inCart = cart[p.id] ?? 0;
                  const out = p.quantity <= 0;
                  const low = !out && p.quantity <= p.lowStockLevel;
                  return (
                    <button
                      key={p.id}
                      onClick={() => openProduct(p)}
                      disabled={out}
                      className={cn(
                        "flex w-full items-center gap-3 py-3.5 text-left transition-colors",
                        out ? "cursor-not-allowed opacity-50" : "hover:bg-slate-50",
                        inCart > 0 && "bg-brand-50/50"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{p.name}</span>
                        <span className="mt-0.5 block font-mono text-xs text-slate-500">{p.sku}</span>
                      </span>
                      <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(p.sellingPrice)}</span>
                      <span className="w-20 shrink-0 text-center">{out ? <Badge tone="danger">Out</Badge> : <Badge tone={low ? "warning" : "success"} dot={false}>{p.quantity}</Badge>}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">
                        <Plus className="size-3.5" />{inCart ? `Added (${inCart})` : "Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: cart (desktop) */}
        <Card className="hidden lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-7rem)] lg:flex-col lg:self-start">
          <CardHeader title="Cart" action={lines.length > 0 ? <Badge tone="warning">{itemCount} items</Badge> : undefined} />
          <div className="min-h-0 flex-1">
            <CartPanel {...cartProps} />
          </div>
        </Card>
      </div>

      {/* Mobile / tablet: bottom bar + cart sheet */}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white p-3 shadow-pop lg:hidden">
          <Button size="lg" className="w-full justify-between" onClick={() => setCartOpen(true)}>
            <span className="flex items-center gap-2"><ShoppingCart className="size-4" />{itemCount} item{itemCount === 1 ? "" : "s"}</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </Button>
        </div>
      )}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Current sale">
        <div className="-mx-5 -my-4">
          <CartPanel {...cartProps} />
        </div>
      </Modal>

      <Modal
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        size="sm"
        title={selectedProduct?.name ?? "Product"}
        description={selectedProduct?.sku}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedProduct(null)}>Cancel</Button>
            <Button disabled={selectedQuantity < 1} onClick={() => selectedProduct && add(selectedProduct, selectedQuantity)}>Add to Cart</Button>
          </>
        }
      >
        {selectedProduct && (
          <div className="space-y-4">
            <dl className="divide-y divide-line rounded-lg bg-slate-50 px-4">
              <div className="flex justify-between gap-3 py-3 text-sm">
                <dt className="text-slate-500">Category</dt>
                <dd className="font-medium text-slate-800">{selectedProduct.category?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3 py-3 text-sm">
                <dt className="text-slate-500">Unit price</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(selectedProduct.sellingPrice)}</dd>
              </div>
              <div className="flex justify-between gap-3 py-3 text-sm">
                <dt className="text-slate-500">Available stock</dt>
                <dd className="font-medium tabular-nums text-slate-800">{selectedProduct.quantity}</dd>
              </div>
            </dl>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-700">Quantity</span>
              <div className="inline-flex items-center rounded-md border border-line">
                <button
                  type="button"
                  aria-label="Decrease selected quantity"
                  disabled={selectedQuantity <= 1}
                  onClick={() => setSelectedQuantity((quantity) => Math.max(1, quantity - 1))}
                  className="p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={selectedProduct.quantity}
                  value={selectedQuantity}
                  onChange={(event) => {
                    const quantity = Number(event.target.value);
                    if (event.target.value === "") {
                      setSelectedQuantity(0);
                    } else if (Number.isInteger(quantity)) {
                      setSelectedQuantity(Math.max(0, Math.min(selectedProduct.quantity, quantity)));
                    }
                  }}
                  className="h-10 w-16 border-x border-line text-center text-sm tabular-nums focus:outline-none"
                  aria-label="Selected quantity"
                />
                <button
                  type="button"
                  aria-label="Increase selected quantity"
                  disabled={selectedQuantity >= selectedProduct.quantity}
                  onClick={() => setSelectedQuantity((quantity) => Math.min(selectedProduct.quantity, quantity + 1))}
                  className="p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(toNumber(selectedProduct.sellingPrice) * selectedQuantity)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation */}
      <Modal
        open={!!result}
        onClose={() => setResult(null)}
        size="sm"
        title={result?.status === "PENDING" ? "Sale submitted for approval" : "Sale completed"}
        footer={
          <>
            <Link href="/officer/sales"><Button variant="secondary">View my sales</Button></Link>
            <Button onClick={() => setResult(null)}>New sale</Button>
          </>
        }
      >
        {result && (
          <div className="flex flex-col items-center py-2 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </span>
            <p className="mt-3 font-mono text-sm font-semibold text-slate-900">{result.invoiceNo}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{formatCurrency(result.totalAmount)}</p>
            <div className="mt-2"><SaleStatusBadge status={result.status} /></div>
            <p className="mt-2 text-[13px] text-slate-600">Responsible staff: {result.createdBy.name}</p>
            <p className="mt-1 text-[13px] text-slate-500">Payment method: {result.paymentMethod === "CASH" ? "Cash" : result.paymentMethod === "BANK_TRANSFER" ? "Bank Transfer" : result.paymentMethod === "MOBILE" ? "Mobile" : "—"}</p>
            <p className="mt-1 text-[13px] text-slate-500">
              Subtotal {formatCurrency(result.subtotalAmount)} · Discount {formatCurrency(result.discountAmount)} · VAT ({result.taxRate}%) {formatCurrency(result.taxAmount)}
            </p>
            <p className="mt-4 text-[13px] text-slate-500">
              {result.status === "PENDING"
                ? "This sale requires manager approval. Stock and revenue will be updated after approval."
                : "This sale was completed without manager approval. Stock and revenue have been updated."}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}