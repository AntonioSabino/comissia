import { Filter, SearchX, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button, ButtonLink } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable, DataToolbar } from "@/app/_components/ui/data-table";
import { SearchBox, Select } from "@/app/_components/ui/field";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState } from "@/app/_components/ui/state-block";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { parseSellerListFilters } from "@/modules/sellers/application/seller-list-filters";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";
import { SellerForm } from "./seller-form";
import styles from "./sellers.module.css";

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

function formatSellerCount(count: number): string {
  return count === 1 ? "1 vendedor" : `${count} vendedores`;
}

type SellersPageProps = {
  searchParams: Promise<{
    search?: string | string[];
    status?: string | string[];
  }>;
};

export default async function SellersPage({ searchParams }: SellersPageProps) {
  await requirePageRole("admin");
  const filters = parseSellerListFilters(await searchParams);
  const sellerList = await sellerRepository.list(filters);
  const hasFilters = filters.search.length > 0 || filters.status !== "all";

  const emptyState = hasFilters ? (
    <EmptyState
      icon={SearchX}
      title="Nenhum vendedor encontrado"
      description="Revise a busca ou a situação selecionada."
      action={
        <ButtonLink href="/admin/sellers" variant="secondary">
          Limpar filtros
        </ButtonLink>
      }
    />
  ) : (
    <EmptyState
      icon={UsersRound}
      title="Nenhum vendedor cadastrado"
      description="Use o formulário acima para cadastrar o primeiro vendedor."
    />
  );

  return (
    <>
      <PageHeader
        eyebrow="Cadastros internos"
        title="Vendedores"
        subtitle="Cadastre, encontre e consulte vendedores e suas comissões."
      />

      <PageBody>
        <Card aria-labelledby="new-seller-title">
          <CardHeading
            titleId="new-seller-title"
            kicker="Novo cadastro"
            title="Novo vendedor"
            description="O percentual inicial abre o histórico de vigências do vendedor."
          />
          <SellerForm />
        </Card>

        <Card flush aria-labelledby="sellers-title">
          <CardHeading
            titleId="sellers-title"
            kicker={formatSellerCount(sellerList.length)}
            title="Vendedores cadastrados"
          />

          <DataToolbar>
            <form className={styles.filters} method="get" role="search">
              <SearchBox
                className={styles.search}
                name="search"
                defaultValue={filters.search}
                placeholder="Nome, CPF ou e-mail"
                maxLength={160}
                aria-label="Buscar por nome, CPF ou e-mail"
              />
              <Select
                className={styles.status}
                name="status"
                defaultValue={filters.status}
                aria-label="Situação"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </Select>
              <Button type="submit" variant="secondary" size="sm" icon={Filter}>
                Filtrar
              </Button>
              {hasFilters ? <Link href="/admin/sellers">Limpar</Link> : null}
            </form>
          </DataToolbar>

          {sellerList.length === 0 ? (
            emptyState
          ) : (
            <DataTable>
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
                      <Link href={`/admin/sellers/${seller.id}`}>
                        {seller.name}
                      </Link>
                    </td>
                    <td className="num">{formatDocument(seller.document)}</td>
                    <td>{seller.email}</td>
                    <td className="num">
                      {seller.rateBasisPoints === null
                        ? "Não informado"
                        : formatRate(seller.rateBasisPoints)}
                    </td>
                    <td className="num">
                      {seller.effectiveFrom === null
                        ? "Não informado"
                        : formatDate(seller.effectiveFrom)}
                    </td>
                    <td>
                      <StatusBadge
                        tone={seller.active ? "reconciled" : "neutral"}
                      >
                        {seller.active ? "Ativo" : "Inativo"}
                      </StatusBadge>
                    </td>
                    <td>
                      <Link href={`/admin/sellers/${seller.id}`}>
                        Consultar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>
      </PageBody>
    </>
  );
}
