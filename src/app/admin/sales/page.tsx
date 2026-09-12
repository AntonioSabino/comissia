import { Filter, SearchX, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/app/_components/ui/alert";
import { Button, ButtonLink } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable, DataToolbar } from "@/app/_components/ui/data-table";
import { Input, SearchBox, Select } from "@/app/_components/ui/field";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState } from "@/app/_components/ui/state-block";
import {
  StatusBadge,
  type StatusTone,
} from "@/app/_components/ui/status-badge";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { QUOTA_STATUSES, type QuotaStatus } from "@/modules/sales";
import { selectActiveAdministrators } from "@/modules/sales/application/active-administrators";
import {
  hasSaleListFilters,
  parseSaleListFilters,
  type SaleListSearchParams,
} from "@/modules/sales/application/sale-list-filters";
import { selectActiveSellersForSale } from "@/modules/sellers/application/active-sellers-for-sale";
import { administratorRepository } from "@/modules/sales/infrastructure/db/administrator-repository";
import { saleRepository } from "@/modules/sales/infrastructure/db/sale-repository";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";
import { centsToDecimalString } from "@/shared/money";
import styles from "./sales.module.css";
import { SaleForm } from "./sale-form";

export const metadata: Metadata = {
  title: "Vendas | Comissia",
};

const QUOTA_STATUS_LABELS: Record<QuotaStatus, string> = {
  adimplente: "Adimplente",
  inadimplente: "Inadimplente",
  cancelado: "Cancelada",
  contemplado: "Contemplada",
};

const QUOTA_STATUS_TONES: Record<QuotaStatus, StatusTone> = {
  adimplente: "received",
  inadimplente: "pending",
  cancelado: "cancelled",
  contemplado: "reconciled",
};

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

/**
 * O crédito permanece em centavos e só vira texto aqui, na borda da tela. O
 * agrupamento é aplicado sobre a parte inteira em `bigint`, sem passar por
 * `number` em momento algum.
 */
function formatCredit(cents: bigint): string {
  const [reais, centavos] = centsToDecimalString(cents).split(".");

  return `R$ ${new Intl.NumberFormat("pt-BR").format(BigInt(reais))},${centavos}`;
}

function formatSaleCount(count: number): string {
  return count === 1 ? "1 venda" : `${count} vendas`;
}

type SalesPageProps = {
  searchParams: Promise<SaleListSearchParams>;
};

export default async function SalesPage({ searchParams }: SalesPageProps) {
  await requirePageRole("admin");
  const filters = parseSaleListFilters(await searchParams);
  // Uma leitura por entidade: os filtros mostram todos, inclusive inativos, e o
  // formulário usa o subconjunto ativo derivado da mesma lista.
  const [sellerList, administratorList, saleList] = await Promise.all([
    sellerRepository.list(),
    administratorRepository.list(),
    saleRepository.list(filters),
  ]);
  const activeSellerList = selectActiveSellersForSale(sellerList);
  const activeAdministratorList = selectActiveAdministrators(administratorList);
  const canRegister =
    activeSellerList.length > 0 && activeAdministratorList.length > 0;
  const isFiltered = hasSaleListFilters(filters);

  const emptyState = isFiltered ? (
    <EmptyState
      icon={SearchX}
      title="Nenhuma venda encontrada"
      description="Revise a busca, o período ou os filtros selecionados."
      action={
        <ButtonLink href="/admin/sales" variant="secondary">
          Limpar filtros
        </ButtonLink>
      }
    />
  ) : (
    <EmptyState
      icon={TrendingUp}
      title="Nenhuma venda registrada"
      description="Use o formulário acima para registrar a primeira venda."
    />
  );

  return (
    <>
      <PageHeader
        eyebrow="Vendas efetuadas"
        title="Vendas"
        subtitle="Registre as vendas de consórcio concluídas e acompanhe o que já foi vendido."
      />

      <PageBody>
        <Card aria-labelledby="new-sale-title">
          <CardHeading
            titleId="new-sale-title"
            kicker="Nova venda"
            title="Cadastrar venda"
            description="O código da venda é gerado pelo sistema. Somente vendedores e administradoras ativos aparecem na lista."
          />

          {canRegister ? (
            <SaleForm
              administrators={activeAdministratorList.map(({ id, name }) => ({
                id,
                name,
              }))}
              sellers={activeSellerList.map(({ id, name }) => ({ id, name }))}
              today={getBusinessDate()}
            />
          ) : (
            <Alert tone="attention">
              Para registrar vendas, cadastre ao menos um{" "}
              <Link href="/admin/sellers">vendedor ativo</Link> e uma{" "}
              <Link href="/admin/administrators">administradora ativa</Link>.
            </Alert>
          )}
        </Card>

        <Card flush aria-labelledby="sales-title">
          <CardHeading
            titleId="sales-title"
            kicker={formatSaleCount(saleList.length)}
            title="Vendas registradas"
          />

          <DataToolbar>
            <form className={styles.filters} method="get" role="search">
              <SearchBox
                className={styles.search}
                name="search"
                defaultValue={filters.search}
                placeholder="Código, cliente, produto, grupo ou cota"
                maxLength={160}
                aria-label="Buscar por código, cliente, produto, grupo ou cota"
              />
              <Select
                className={styles.choice}
                name="seller"
                defaultValue={filters.seller}
                aria-label="Vendedor"
              >
                <option value="">Todos os vendedores</option>
                {sellerList.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </Select>
              <Select
                className={styles.choice}
                name="administrator"
                defaultValue={filters.administrator}
                aria-label="Administradora"
              >
                <option value="">Todas as administradoras</option>
                {administratorList.map((administrator) => (
                  <option key={administrator.id} value={administrator.id}>
                    {administrator.name}
                  </option>
                ))}
              </Select>
              <Select
                className={styles.choice}
                name="status"
                defaultValue={filters.status}
                aria-label="Situação da cota"
              >
                <option value="all">Todas as situações</option>
                {QUOTA_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {QUOTA_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
              <Input
                className={styles.date}
                type="date"
                name="from"
                defaultValue={filters.from}
                aria-label="Vendida a partir de"
              />
              <Input
                className={styles.date}
                type="date"
                name="to"
                defaultValue={filters.to}
                aria-label="Vendida até"
              />
              <Button type="submit" variant="secondary" size="sm" icon={Filter}>
                Filtrar
              </Button>
              {isFiltered ? <Link href="/admin/sales">Limpar</Link> : null}
            </form>
          </DataToolbar>

          {saleList.length === 0 ? (
            emptyState
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Data</th>
                  <th>Vendedor</th>
                  <th>Administradora</th>
                  <th>Grupo/cota</th>
                  <th>Crédito</th>
                  <th>Situação da cota</th>
                </tr>
              </thead>
              <tbody>
                {saleList.map((sale) => (
                  <tr key={sale.id}>
                    <td className="num">{sale.code}</td>
                    <td className="num">{formatDate(sale.soldOn)}</td>
                    <td>
                      <Link href={`/admin/sellers/${sale.sellerId}`}>
                        {sale.sellerName}
                      </Link>
                    </td>
                    <td>{sale.administratorName}</td>
                    <td className="num">
                      {sale.groupCode}/{sale.quotaCode}
                    </td>
                    <td className="num">
                      {formatCredit(sale.creditAmountInCents)}
                    </td>
                    <td>
                      <StatusBadge tone={QUOTA_STATUS_TONES[sale.quotaStatus]}>
                        {QUOTA_STATUS_LABELS[sale.quotaStatus]}
                      </StatusBadge>
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
