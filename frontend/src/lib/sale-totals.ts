import { toNumber } from "@/lib/utils";
import type { Money, Sale } from "@/types";

export function calculateSaleTotals(subtotal: Money, discountPercent: Money, taxRate: Money) {
  const subtotalCents = Math.round(toNumber(subtotal) * 100);
  const discountBasisPoints = Math.round(toNumber(discountPercent) * 100);
  const taxBasisPoints = Math.round(toNumber(taxRate) * 100);
  const discountCents = Math.round(subtotalCents * discountBasisPoints / 10000);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round(taxableCents * taxBasisPoints / 10000);

  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    tax: taxCents / 100,
    total: (taxableCents + taxCents) / 100,
  };
}

export function saleRevenue(sale: Pick<Sale, "subtotalAmount" | "discountAmount">) {
  return Math.round((toNumber(sale.subtotalAmount) - toNumber(sale.discountAmount)) * 100) / 100;
}
