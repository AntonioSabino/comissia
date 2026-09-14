import {
  Building2,
  CalendarClock,
  LayoutDashboard,
  Receipt,
  Ruler,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

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
    { href: "/admin/sales", label: "Vendas", icon: TrendingUp },
    { href: "/admin/commissions", label: "Parcelas", icon: CalendarClock },
    { href: "/admin/sellers", label: "Vendedores", icon: UsersRound },
    {
      href: "/admin/administrators",
      label: "Administradoras",
      icon: Building2,
    },
    {
      href: "/admin/installment-rules",
      label: "Réguas de parcelas",
      icon: Ruler,
    },
  ],
  seller: [
    { href: "/seller", label: "Resumo", icon: LayoutDashboard, exact: true },
    { href: "/seller/sales", label: "Vendas e comissões", icon: Receipt },
    {
      href: "/seller/commissions",
      label: "Previsão mensal",
      icon: CalendarClock,
    },
  ],
};
