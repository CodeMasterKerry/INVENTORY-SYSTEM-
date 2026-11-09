import { api } from "@/lib/api";
import type { Category, InventoryMovement, Product } from "@/types";

export const fetchProducts = () => api<Product[]>("/products");
export const fetchLowStock = () => api<Product[]>("/products/low-stock");
export const fetchMovements = (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return api<InventoryMovement[]>(`/products/history${query ? `?${query}` : ""}`);
};
export const fetchCategoriesPage = async () => {
  const [categories, products] = await Promise.all([api<Category[]>("/categories"), api<Product[]>("/products")]);
  return { categories, products };
};