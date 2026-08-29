import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administração | Comissia",
};

export default function AdminPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Área administrativa</p>
        <h1>Administração</h1>
        <p className="subtitle">
          Acesso confirmado aos módulos administrativos da Comissia.
        </p>
      </section>
    </main>
  );
}
