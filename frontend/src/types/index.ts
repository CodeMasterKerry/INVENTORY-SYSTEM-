export type UserRole = "manager" | "officer";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type NavItem = {
  label: string;
  href: string;
};
