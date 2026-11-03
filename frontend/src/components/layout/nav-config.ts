import type { NavItem, UserRole } from "../../types";

export const navConfig: Record<UserRole, NavItem[]> = {
  manager: [
    { label: "Overview", href: "/manager" },
    { label: "Products", href: "/manager/products" },
    { label: "Sales", href: "/manager/sales" },
    { label: "Team", href: "/manager/team" },
  ],
  officer: [
    { label: "Overview", href: "/officer" },
    { label: "Products", href: "/officer/products" },
    { label: "Sales", href: "/officer/sales" },
  ],
};
