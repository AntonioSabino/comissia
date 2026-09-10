import type { ReactNode } from "react";
import { AppShell } from "@/app/_components/shell/app-shell";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requirePageRole("admin");

  return (
    <AppShell area="admin" userName={user.name} roleLabel="Administração">
      {children}
    </AppShell>
  );
}
