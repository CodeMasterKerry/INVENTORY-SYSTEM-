import {
  ClipboardCheck, FileBarChart, LayoutDashboard, Package, Receipt, Settings,
  ShoppingBag, ShoppingCart, UserCircle, Users, Wallet, FilePlus2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: { label: string; href: string }[];
}

export const managerNav: NavItem[] = [
  { label: "Overview", href: "/manager", icon: LayoutDashboard },
  {
    label: "Inventory",
    icon: Package,
    children: [
      { label: "All Products", href: "/manager/inventory/products" },
      { label: "Categories", href: "/manager/inventory/categories" },
      { label: "Stock Movements", href: "/manager/inventory/movements" },
      { label: "Low Stock", href: "/manager/inventory/low-stock" },
    ],
  },
  {
    label: "Sales",
    icon: ShoppingCart,
    children: [
      { label: "All Sales", href: "/manager/sales" },
      { label: "Pending Sales", href: "/manager/sales/pending" },
      { label: "Approved Sales", href: "/manager/sales/approved" },
      { label: "Rejected Sales", href: "/manager/sales/rejected" },
    ],
  },
  {
    label: "Approvals",
    icon: ClipboardCheck,
    children: [
      { label: "Pending Sales", href: "/manager/approvals/sales" },
      { label: "Product Requests", href: "/manager/approvals/products" },
    ],
  },
  { label: "User Management", href: "/manager/users", icon: Users },
  { label: "Financial Management", href: "/manager/finance", icon: Wallet },
  { label: "Reports", href: "/manager/reports", icon: FileBarChart },
  { label: "Settings", href: "/manager/settings", icon: Settings },
];

export const officerNav: NavItem[] = [
  { label: "My Dashboard", href: "/officer", icon: LayoutDashboard },
  { label: "New Sale", href: "/officer/new-sale", icon: ShoppingBag },
  { label: "My Sales", href: "/officer/sales", icon: Receipt },
  { label: "Products", href: "/officer/products", icon: Package },
  { label: "Product Requests", href: "/officer/product-requests", icon: FilePlus2 },
  { label: "Reports", href: "/officer/reports", icon: FileBarChart },
  { label: "My Profile", href: "/officer/profile", icon: UserCircle },
];