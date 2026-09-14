import {
  ArrowRight,
  ChevronRight,
  Filter,
  SearchX,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button, ButtonLink } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable, DataToolbar } from "@/app/_components/ui/data-table";
import { Input, SearchBox, Select } from "@/app/_components/ui/field";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState, ErrorState } from "@/app/_components/ui/state-block";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import {
  formatBusinessDate,
  formatCents,
  formatCompetence,
} from "@/app/_utils/format";
import {
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_TONES,
} from "@/app/_utils/installment-status";
import { QUOTA_STATUS_LABELS, QUOTA_STATUS_TONES } from "@/app/_utils/quota";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { QUOTA_STATUSES } from "@/modules/sales";
import { sumInstallmentAmounts } from "@/modules/sales/application/installment-totals";
import {
  hasSellerSaleListFilters,
  parseSellerSaleListFilters,
  type SellerSaleListSearchParams,
} from "@/modules/sales/application/sale-list-filters";
import { sellerCommissionRepository } from "@/modules/sales/infrastructure/db/seller-commission-repository";
import styles from "./seller-sales.module.css";

export const metadata: Metadata = {
  title: "Vendas e comissões | Comissia",
};

function formatSaleCount(count: number): string {
  return count === 1 ? "1 venda" : `${count} vendas`;
}

function formatInstallmentCount(count: number): string {
  return count === 1 ? "1 parcela" : `${count} parcelas`;
}

type SellerSalesPageProps = {
  searchParams: Promise<SellerSaleListSearchParams>;
};

export default async function SellerSalesPage({
  searchParams,
}: SellerSalesPageProps) {
  const user = await requirePageRole("seller");

  const header = (
    <PageHeader
      eyebrow="Área do vendedor"
      title="Vendas e comissões"
      subtitle="Suas vendas e, dentro de cada uma, as parcelas de comissão que ela gera."
    />
  );

  if (!user.sellerId) {
    return (
      <>
        {header}
        <PageBody>
          <Card flush>
            <ErrorState
              title="Sua conta ainda não está ligada a um cadastro de vendedor"
              description="Peça à administração para vincular o seu acesso ao seu cadastro; sem isso não há vendas para mostrar."
            />
          </Card>
        </PageBody>
      </>
    );
  }

  const filters = parseSellerSaleListFilters(await searchParams);
  // O vendedor da sessão vai nas duas leituras; os filtros apenas recortam.
  const [sales, administrators] = await Promise.all([
    sellerCommissionRepository.listSales(user.sellerId, filters),
    sellerCommissionRepository.listSaleAdministrators(user.sellerId),
  ]);
  const isFiltered = hasSellerSaleListFilters(filters);

  const emptyState = isFiltered ? (
    <EmptyState
      icon={SearchX}
      title="Nenhuma venda encontrada"
      description="Revise a busca, o período ou os filtros selecionados."
      action={
        <ButtonLink href="/seller/sales" variant="secondary">
          Limpar filtros
        </ButtonLink>
      }
    />
  ) : (
    <EmptyState
      icon={TrendingUp}
      title="Você ainda não tem vendas registradas"
      description="Assim que a administração registrar uma venda sua, ela aparece aqui com as parcelas de comissão que gera."
    />
  );

  return (
    <>
      {header}

      <PageBody>
        <Card flush aria-labelledby="seller-sales-title">
          <CardHeading
            titleId="seller-sales-title"
            kicker={formatSaleCount(sales.length)}
            title="Suas vendas"
            description="Abra uma venda para ver os dados dela e as parcelas, da primeira à última."
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
                name="administrator"
                defaultValue={filters.administrator}
                aria-label="Administradora"
              >
                <option value="">Todas as administradoras</option>
                {administrators.map((administrator) => (
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
              {isFiltered ? <Link href="/seller/sales">Limpar</Link> : null}
            </form>
          </DataToolbar>

          {sales.length === 0 ? (
            emptyState
          ) : (
            <div className={styles.list}>
              {sales.map((sale) => {
                const commissionInCents = sumInstallmentAmounts(
                  sale.installments,
                );
                const hasInstallments = sale.installments.length > 0;

                return (
                  <details key={sale.id} className={styles.sale}>
                    <summary className={styles.summary}>
                      <ChevronRight
                        className={styles.marker}
                        size={16}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      <span className={styles.headline}>
                        <span className={styles.identity}>
                          <span className={`num ${styles.code}`}>
                            {sale.code}
                          </span>
                          <span className={styles.administrator}>
                            {sale.administratorName}
                          </span>
                        </span>
                        <span className={styles.facts}>
                          <span className={styles.fact}>
                            <span className={styles.factLabel}>Data</span>
                            <span className="num">
                              {formatBusinessDate(sale.soldOn)}
                            </span>
                          </span>
                          <span className={styles.fact}>
                            <span className={styles.factLabel}>Grupo/cota</span>
                            <span className="num">
                              {sale.groupCode}/{sale.quotaCode}
                            </span>
                          </span>
                          <span className={styles.fact}>
                            <span className={styles.factLabel}>Crédito</span>
                            <span className="num">
                              {formatCents(sale.creditAmountInCents)}
                            </span>
                          </span>
                          <span className={styles.fact}>
                            <span className={styles.factLabel}>Parcelas</span>
                            <span className="num">
                              {sale.installments.length}
                            </span>
                          </span>
                          <span className={styles.fact}>
                            <span className={styles.factLabel}>
                              Sua comissão
                            </span>
                            <span className={`num ${styles.commission}`}>
                              {hasInstallments
                                ? formatCents(commissionInCents)
                                : "—"}
                            </span>
                          </span>
                        </span>
                      </span>
                      <StatusBadge tone={QUOTA_STATUS_TONES[sale.quotaStatus]}>
                        {QUOTA_STATUS_LABELS[sale.quotaStatus]}
                      </StatusBadge>
                    </summary>

                    <div className={styles.details}>
                      <dl className={styles.about}>
                        <div>
                          <dt>Cliente</dt>
                          <dd>{sale.customerName}</dd>
                        </div>
                        <div>
                          <dt>Produto</dt>
                          <dd>{sale.product}</dd>
                        </div>
                        <div>
                          <dt>Primeira previsão</dt>
                          <dd className="num">
                            {formatBusinessDate(sale.firstInstallmentDueOn)}
                          </dd>
                        </div>
                      </dl>

                      {hasInstallments ? (
                        <>
                          <p className={styles.note}>
                            {formatInstallmentCount(sale.installments.length)} ·{" "}
                            {formatCents(commissionInCents)} no total desta
                            venda.
                          </p>
                          <DataTable className={styles.installments}>
                            <thead>
                              <tr>
                                <th>Parcela</th>
                                <th>Competência</th>
                                <th>Previsão</th>
                                <th>Valor</th>
                                <th>Situação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.installments.map((installment) => (
                                <tr key={installment.id}>
                                  <td className="num">
                                    {installment.number}/
                                    {sale.installments.length}
                                  </td>
                                  <td className="num">
                                    {formatCompetence(installment.competence)}
                                  </td>
                                  <td className="num">
                                    {formatBusinessDate(installment.dueOn)}
                                  </td>
                                  <td className="num">
                                    {formatCents(installment.amountInCents)}
                                  </td>
                                  <td>
                                    <StatusBadge
                                      tone={
                                        INSTALLMENT_STATUS_TONES[
                                          installment.status
                                        ]
                                      }
                                    >
                                      {
                                        INSTALLMENT_STATUS_LABELS[
                                          installment.status
                                        ]
                                      }
                                    </StatusBadge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </DataTable>
                        </>
                      ) : (
                        <p className={styles.note}>
                          Esta venda foi registrada antes de as parcelas
                          passarem a ser geradas automaticamente. Fale com a
                          administração para saber como ela será paga.
                        </p>
                      )}

                      <div className={styles.action}>
                        <ButtonLink
                          href={`/seller/sales/${sale.id}?origem=vendas`}
                          variant="secondary"
                          size="sm"
                          iconAfter={ArrowRight}
                        >
                          Abrir a venda
                        </ButtonLink>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
