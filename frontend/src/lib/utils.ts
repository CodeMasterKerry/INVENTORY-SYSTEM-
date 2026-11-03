import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Money, Role } from "@/types";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const toNumber = (v: Money | null | undefined) => Number(v ?? 0);

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "ETB";

export function formatCurrency(v: Money | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
  }).format(toNumber(v));
}

export const formatNumber = (v: Money | null | undefined) =>
  new Intl.NumberFormat("en-US").format(toNumber(v));

export function formatDate(d: string | Date | null | undefined, withTime = false) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(d));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export const portalPath = (role: Role) =>
  role === "MANAGER" ? "/manager" : "/officer";