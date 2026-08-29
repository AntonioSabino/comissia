import type { ReactNode } from "react";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";

export default async function SellerLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requirePageRole("seller");

  return children;
}
