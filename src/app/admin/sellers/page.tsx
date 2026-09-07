import type { Metadata } from "next";
import Link from "next/link";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { parseSellerListFilters } from "@/modules/sellers/application/seller-list-filters";
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

type SellersPageProps = {
  searchParams: Promise<{
    search?: string | string[];
    status?: string | string[];
  }>;
};

export default async function SellersPage({
  searchParams,
}: SellersPageProps) {
  await requirePageRole("admin");
  const filters = parseSellerListFilters(await searchParams);
  const sellerList = await sellerRepository.list(filters);

  return (
    <main className="admin-shell">
      <div className="admin-content">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Área administrativa</p>
            <h1>Vendedores</h1>
            <p className="subtitle">
              Cadastre, encontre e consulte vendedores e suas comissões.
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

          <form className="seller-filters" method="get">
            <label>
              Buscar
              <input
                type="search"
                name="search"
                defaultValue={filters.search}
                placeholder="Nome, CPF ou e-mail"
                maxLength={160}
              />
            </label>

            <label>
              Situação
              <select name="status" defaultValue={filters.status}>
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </label>

            <div className="filter-actions">
              <button type="submit">Filtrar</button>
              <Link href="/admin/sellers">Limpar</Link>
            </div>
          </form>

          {sellerList.length === 0 ? (
            <p className="empty-state">
              Nenhum vendedor encontrado com os filtros informados.
            </p>
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
                    <th>
                      <span className="visually-hidden">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sellerList.map((seller) => (
                    <tr key={seller.id}>
                      <td>
                        <Link
                          className="table-primary-link"
                          href={`/admin/sellers/${seller.id}`}
                        >
                          {seller.name}
                        </Link>
                      </td>
                      <td>{formatDocument(seller.document)}</td>
                      <td>{seller.email}</td>
                      <td>
                        {seller.rateBasisPoints === null
                          ? "Não informado"
                          : formatRate(seller.rateBasisPoints)}
                      </td>
                      <td>
                        {seller.effectiveFrom === null
                          ? "Não informado"
                          : formatDate(seller.effectiveFrom)}
                      </td>
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
                      <td>
                        <Link
                          className="table-action-link"
                          href={`/admin/sellers/${seller.id}`}
                        >
                          Consultar
                        </Link>
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
