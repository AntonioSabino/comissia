import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Área do vendedor | Comissia",
};

export default function SellerPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Área do vendedor</p>
        <h1>Minhas comissões</h1>
        <p className="subtitle">
          Acesso confirmado à área individual do vendedor.
        </p>
      </section>
    </main>
  );
}
