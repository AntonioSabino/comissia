import type { Metadata } from "next";
import Link from "next/link";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";
import { SellerForm } from "./seller-form";

export const metadata: Metadata = {
  title: "Vendedores | Comissia",
};

function formatDocument(document: string): string {
  return document.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

function formatRate(basisPoints: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(basisPoints / 10_000);
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

export default async function SellersPage() {
  await requirePageRole("admin");
  const sellerList = await sellerRepository.list();

  return (
    <main className="admin-shell">
      <div className="admin-content">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Área administrativa</p>
            <h1>Vendedores</h1>
            <p className="subtitle">
              Cadastre o vendedor e sua primeira regra de comissão.
            </p>
          </div>
          <Link href="/admin">Voltar</Link>
        </header>

        <section className="admin-card">
          <h2>Novo vendedor</h2>
          <SellerForm />
        </section>

        <section className="admin-card">
          <div className="section-heading">
            <h2>Vendedores cadastrados</h2>
            <span>{sellerList.length}</span>
          </div>

          {sellerList.length === 0 ? (
            <p className="empty-state">Nenhum vendedor cadastrado.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>E-mail</th>
                    <th>Percentual</th>
                    <th>Vigência</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerList.map((seller) => (
                    <tr key={seller.id}>
                      <td>{seller.name}</td>
                      <td>{formatDocument(seller.document)}</td>
                      <td>{seller.email}</td>
                      <td>{formatRate(seller.rateBasisPoints)}</td>
                      <td>{formatDate(seller.effectiveFrom)}</td>
                      <td>
                        <span
                          className={
                            seller.active
                              ? "status-badge status-active"
                              : "status-badge status-inactive"
                          }
                        >
                          {seller.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
