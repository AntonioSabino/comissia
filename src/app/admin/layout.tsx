import type { ReactNode } from "react";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requirePageRole("admin");

  return children;
}
