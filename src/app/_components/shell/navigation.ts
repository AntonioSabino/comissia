import { LayoutDashboard, UsersRound, type LucideIcon } from "lucide-react";

export type ShellArea = "admin" | "seller";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

/** O menu só lista telas que já existem; cada história acrescenta a sua. */
export const navigationByArea: Record<ShellArea, NavigationItem[]> = {
  admin: [
    {
      href: "/admin",
      label: "Visão geral",
      icon: LayoutDashboard,
      exact: true,
    },
    { href: "/admin/sellers", label: "Vendedores", icon: UsersRound },
  ],
  seller: [
    { href: "/seller", label: "Resumo", icon: LayoutDashboard, exact: true },
  ],
};
