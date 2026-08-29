import type { Metadata } from "next";
import Link from "next/link";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";

export const metadata: Metadata = {
  title: "Administração | Comissia",
};

export default async function AdminPage() {
  await requirePageRole("admin");

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Área administrativa</p>
        <h1>Administração</h1>
        <p className="subtitle">
          Acesso confirmado aos módulos administrativos da Comissia.
        </p>
        <Link className="primary-link" href="/admin/sellers">
          Gerenciar vendedores
        </Link>
      </section>
    </main>
  );
}
