export type Role = "MANAGER" | "SALES_OFFICER";
export type SaleStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE";
export type MovementType = "IN" | "OUT";

export interface NotificationPreferences {
  pendingSales: boolean;
  productRequests: boolean;
  lowStock: boolean;
  rejectedSales: boolean;
}

// Prisma sends Decimal values as strings, so prices can be string or number.
export type Money = string | number;

export interface BusinessSettings {
  id: number;
  businessName: string;
  taxRate: Money;
  defaultLowStockLevel: number;
  updatedAt: string;
  updatedById: number | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  avatarShape?: "CIRCLE" | "RECTANGLE";
  isActive?: boolean;
  createdAt?: string;
  notificationPreferences?: NotificationPreferences;
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
  updatedAt: string;
  description: string | null;
  unit: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  rejectedById: number | null;
  categoryId: number;
  category?: Category;
  createdById: number | null;
}

export interface ProductUpdateRequest {
  id: number;
  productId: number;
  requestedById: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  proposedName: string;
  proposedCostPrice: Money;
  proposedSellingPrice: Money;
  proposedLowStockLevel: number;
  proposedCategoryId: number;
  proposedDescription: string | null;
  proposedUnit: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedById: number | null;
  rejectionReason: string | null;
  product: Product;
  proposedCategory: Category;
  requestedBy: { id: number; name: string };
  reviewedBy: { id: number; name: string } | null;
}

export interface PendingProductUpdate {
  id: number;
  productId: number;
  status: "PENDING";
  createdAt: string;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: Money;
  unitCost: Money | null;
  product?: { name: string; sku: string };
}

export interface Sale {
  id: number;
  invoiceNo: string;
  status: SaleStatus;
  totalAmount: Money;
  subtotalAmount: Money;
  discountPercent: Money;
  discountAmount: Money;
  taxRate: Money;
  taxAmount: Money;
  createdAt: string;
  approvedAt: string | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdBy: { id: number; name: string };
  approvedBy: { id: number; name: string } | null;
  rejectedBy: { id: number; name: string } | null;
  items: SaleItem[];
}

export interface IncomeTransaction {
  id: number;
  amount: Money;
  createdAt: string;
  sale: Sale;
}

export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: Money;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  createdById: number | null;
  createdBy: { id: number; name: string } | null;
}

export interface InventoryMovement {
  id: number;
  productId: number;
  type: MovementType;
  quantity: number;
  reason: string;
  createdAt: string;
  createdById: number | null;
  createdBy: { id: number; name: string } | null;
  quantityBefore: number | null;
  quantityAfter: number | null;
  product: { name: string; sku: string };
}

export interface ManagerDashboard {
  revenue: number;
  profit: number;
  unknownCostLines?: number;
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