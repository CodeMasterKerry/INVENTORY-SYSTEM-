import { ProductsView } from "@/features/inventory/products-view";

export const instant = false;

export default function Page() {
  return <ProductsView role="MANAGER" />;
}