import { ArrowRight, Filter, SearchX, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/app/_components/ui/alert";
import { Button, ButtonLink } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable, DataToolbar } from "@/app/_components/ui/data-table";
import { Input } from "@/app/_components/ui/field";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState, ErrorState } from "@/app/_components/ui/state-block";
import {
  formatBusinessDate,
  formatCents,
  formatCompetence,
} from "@/app/_utils/format";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import {
  buildSoldPeriodQuery,
  hasSoldPeriod,
  parseSoldPeriod,
  type ParsedSoldPeriod,
  type SoldPeriodSearchParams,
} from "@/modules/sales/application/sale-list-filters";
import { summarizeSellerSales } from "@/modules/sales/application/seller-summary";
import { sellerCommissionRepository } from "@/modules/sales/infrastructure/db/seller-commission-repository";
import styles from "./seller-summary.module.css";

export const metadata: Metadata = {
  title: "Resumo | Comissia",
};

function formatInstallmentCount(count: number): string {
  return count === 1 ? "1 parcela" : `${count} parcelas`;
}

/** Como o recorte aparece no cabeçalho, inclusive quando só um extremo veio. */
function formatPeriod(period: ParsedSoldPeriod): string {
  if (period.from.length > 0 && period.to.length > 0) {
    return `${formatBusinessDate(period.from)} a ${formatBusinessDate(period.to)}`;
  }

  if (period.from.length > 0) {
    return `A partir de ${formatBusinessDate(period.from)}`;
  }

  if (period.to.length > 0) {
    return `Até ${formatBusinessDate(period.to)}`;
  }

  return "Todo o período";
}

type SellerPageProps = {
  searchParams: Promise<SoldPeriodSearchParams>;
};

export default async function SellerPage({ searchParams }: SellerPageProps) {
  const user = await requirePageRole("seller");

  const header = (
    <PageHeader
      eyebrow="Área do vendedor"
      title="Resumo"
      subtitle="Quanto você vendeu e quanto tem a receber por isso."
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
              description="Peça à administração para vincular o seu acesso ao seu cadastro; sem isso não há números para mostrar."
            />
          </Card>
        </PageBody>
      </>
    );
  }

  const period = parseSoldPeriod(await searchParams);
  // O vendedor da sessão vai na consulta; o período apenas recorta.
  const summary = summarizeSellerSales(
    await sellerCommissionRepository.listSales(user.sellerId, period),
  );
  const isFiltered = hasSoldPeriod(period);
  const periodQuery = buildSoldPeriodQuery(period);
  const salesHref =
    periodQuery.length > 0 ? `/seller/sales?${periodQuery}` : "/seller/sales";

  const emptyState = isFiltered ? (
    <EmptyState
      icon={SearchX}
      title="Nenhuma venda neste período"
      description="Escolha outro período ou limpe o recorte para ver tudo."
      action={
        <ButtonLink href="/seller" variant="secondary">
          Limpar período
        </ButtonLink>
      }
    />
  ) : (
    <EmptyState
      icon={TrendingUp}
      title="Você ainda não tem vendas registradas"
      description="Assim que a administração registrar uma venda sua, os números aparecem aqui."
    />
  );

  return (
    <>
      {header}

      <PageBody>
        <Card flush aria-labelledby="seller-summary-title">
          <CardHeading
            titleId="seller-summary-title"
            kicker={formatPeriod(period)}
            title="Seus números"
            description="Contam somente as suas vendas, pela data em que cada uma foi feita."
            action={
              summary.sales > 0 ? (
                <ButtonLink
                  href={salesHref}
                  variant="secondary"
                  size="sm"
                  iconAfter={ArrowRight}
                >
                  Ver as vendas
                </ButtonLink>
              ) : null
            }
          />

          <DataToolbar>
            <form className={styles.period} method="get">
              <Input
                className={styles.date}
                type="date"
                name="from"
                defaultValue={period.from}
                aria-label="Vendida a partir de"
              />
              <Input
                className={styles.date}
                type="date"
                name="to"
                defaultValue={period.to}
                aria-label="Vendida até"
              />
              <Button type="submit" variant="secondary" size="sm" icon={Filter}>
                Filtrar
              </Button>
              {isFiltered ? <Link href="/seller">Limpar</Link> : null}
            </form>
          </DataToolbar>

          {summary.sales === 0 ? (
            emptyState
          ) : (
            <div className={styles.body}>
              <dl className={styles.stats}>
                <div className={styles.stat}>
                  <dt className={styles.statLabel}>Vendas</dt>
                  <dd className={`num ${styles.statValue}`}>{summary.sales}</dd>
                </div>
                <div className={styles.stat}>
                  <dt className={styles.statLabel}>Crédito vendido</dt>
                  <dd className={`num ${styles.statValue}`}>
                    {formatCents(summary.creditInCents)}
                  </dd>
                </div>
                <div className={styles.stat}>
                  <dt className={styles.statLabel}>Comissão prevista</dt>
                  <dd className={`num ${styles.statValue} ${styles.money}`}>
                    {formatCents(summary.commissionInCents)}
                  </dd>
                </div>
              </dl>

              {summary.salesWithMismatch > 0 ? (
                <Alert tone="attention">
                  {summary.salesWithMismatch === 1
                    ? "Uma venda deste período tem parcelas que não somam a própria comissão."
                    : `${summary.salesWithMismatch} vendas deste período têm parcelas que não somam a própria comissão.`}{" "}
                  Avise a administração para conferir.
                </Alert>
              ) : summary.salesWithoutInstallments > 0 ? (
                <Alert>
                  {summary.salesWithoutInstallments === 1
                    ? "Uma venda deste período não tem parcelas geradas, então ela entra na comissão mas não aparece em nenhum mês."
                    : `${summary.salesWithoutInstallments} vendas deste período não têm parcelas geradas, então elas entram na comissão mas não aparecem em nenhum mês.`}{" "}
                  Fale com a administração para saber como serão pagas.
                </Alert>
              ) : (
                <Alert>
                  Estes valores são previsões, calculadas quando cada venda foi
                  registrada. A previsão mensal mostra o que já consta como pago
                  e o que ainda não.
                </Alert>
              )}
            </div>
          )}
        </Card>

        {summary.months.length > 0 ? (
          <Card flush aria-labelledby="seller-summary-months-title">
            <CardHeading
              titleId="seller-summary-months-title"
              kicker={
                summary.months.length === 1
                  ? "1 competência"
                  : `${summary.months.length} competências`
              }
              title="Previsto por mês"
              description={
                isFiltered
                  ? "Como a comissão das vendas deste período se distribui. A previsão mensal soma todas as suas parcelas do mês, inclusive as de vendas fora deste recorte, então os totais são de coisas diferentes."
                  : "Como a comissão destas vendas se distribui. A competência abre a previsão mensal."
              }
              action={
                isFiltered ? (
                  <ButtonLink
                    href="/seller/commissions"
                    variant="secondary"
                    size="sm"
                    iconAfter={ArrowRight}
                  >
                    Previsão mensal
                  </ButtonLink>
                ) : null
              }
            />

            <DataTable>
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Parcelas</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {summary.months.map((month) => (
                  <tr key={month.competence}>
                    <td className="num">
                      {isFiltered ? (
                        formatCompetence(month.competence)
                      ) : (
                        <Link
                          href={`/seller/commissions?competencia=${month.competence}`}
                        >
                          {formatCompetence(month.competence)}
                        </Link>
                      )}
                    </td>
                    <td className="num">
                      {formatInstallmentCount(month.installments)}
                    </td>
                    <td className="num">{formatCents(month.totalInCents)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </Card>
        ) : null}
      </PageBody>
    </>
  );
}
