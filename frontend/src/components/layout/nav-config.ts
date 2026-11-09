import {
  ClipboardCheck, FileBarChart, LayoutDashboard, Package, Receipt, Settings,
  ShoppingCart, UserCircle, Wallet, FilePlus2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  activePrefix?: string;
}

export const managerNav: NavItem[] = [
  { label: "Dashboard", href: "/manager", icon: LayoutDashboard },
  { label: "Inventory", href: "/manager/inventory/products", activePrefix: "/manager/inventory", icon: Package },
  { label: "Sales", href: "/manager/sales", activePrefix: "/manager/sales", icon: ShoppingCart },
  { label: "Approvals", href: "/manager/approvals/sales", activePrefix: "/manager/approvals", icon: ClipboardCheck },
  { label: "Analysis", href: "/manager/finance", icon: Wallet },
  { label: "Reports", href: "/manager/reports", icon: FileBarChart },
  { label: "Settings", href: "/manager/settings", icon: Settings },
];

export const officerNav: NavItem[] = [
  { label: "My Dashboard", href: "/officer", icon: LayoutDashboard },
  { label: "My Sales", href: "/officer/sales", icon: Receipt },
  { label: "Products", href: "/officer/products", icon: Package },
  { label: "Product Requests", href: "/officer/product-requests", icon: FilePlus2 },
  { label: "Reports", href: "/officer/reports", icon: FileBarChart },
  { label: "My Profile", href: "/officer/profile", icon: UserCircle },
];