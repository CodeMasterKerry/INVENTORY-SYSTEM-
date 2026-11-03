export type Role = "MANAGER" | "SALES_OFFICER";
export type SaleStatus = "PENDING" | "APPROVED" | "REJECTED";
export type MovementType = "IN" | "OUT";

// Prisma sends Decimal values as strings, so prices can be string or number.
export type Money = string | number;

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  costPrice: Money;
  sellingPrice: Money;
  quantity: number;
  lowStockLevel: number;
  isApproved: boolean;
  createdAt: string;
  categoryId: number;
  category?: Category;
  createdById: number | null;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: Money;
  product?: { name: string; sku: string };
}

export interface Sale {
  id: number;
  invoiceNo: string;
  status: SaleStatus;
  totalAmount: Money;
  createdAt: string;
  approvedAt: string | null;
  createdBy: { id: number; name: string };
  approvedBy: { id: number; name: string } | null;
  items: SaleItem[];
}

export interface InventoryMovement {
  id: number;
  productId: number;
  type: MovementType;
  quantity: number;
  reason: string;
  createdAt: string;
  product: { name: string; sku: string };
}

export interface ManagerDashboard {
  revenue: number;
  profit: number;
  pendingSales: number;
  pendingProducts: number;
  totalProducts: number;
  totalOfficers: number;
  approvedSales: number;
  lowStockCount: number;
}

export interface OfficerDashboard {
  approvedSales: number;
  totalSold: number;
  pendingSales: number;
  rejectedSales: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}