import type { ReactNode } from "react";
import { AppShell } from "@/app/_components/shell/app-shell";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";

export default async function SellerLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requirePageRole("seller");

  return (
    <AppShell area="seller" userName={user.name} roleLabel="Vendedor">
      {children}
    </AppShell>
  );
}
