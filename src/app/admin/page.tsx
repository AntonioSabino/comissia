import {
  ArrowRight,
  BadgeDollarSign,
  BadgePercent,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Ruler,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { MetricCard, MetricGrid } from "@/app/_components/ui/metric-card";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState } from "@/app/_components/ui/state-block";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import {
  formatBasisPoints,
  formatCents,
  formatCompetence,
} from "@/app/_utils/format";
import {
  PAYOUT_STAGE_LABELS,
  PAYOUT_STAGE_TONES,
} from "@/app/_utils/payout-stage";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import {
  buildAdminOverview,
  soldPeriodOf,
} from "@/modules/sales/application/admin-overview";
import { shiftCompetence } from "@/modules/sales/application/monthly-commission-forecast";
import { resolvePayoutCompetence } from "@/modules/sales/application/payout-closing";
import { adminCommissionRepository } from "@/modules/sales/infrastructure/db/admin-commission-repository";
import { saleRepository } from "@/modules/sales/infrastructure/db/sale-repository";
import styles from "./overview.module.css";

export const metadata: Metadata = {
  title: "Visão geral | Comissia",
};

function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

const SHORTCUTS = [
  { href: "/admin/sales", label: "Vendas", icon: TrendingUp },
  { href: "/admin/commissions", label: "Parcelas", icon: CalendarClock },
  { href: "/admin/sellers", label: "Vendedores", icon: UsersRound },
  { href: "/admin/administrators", label: "Administradoras", icon: Building2 },
  {
    href: "/admin/installment-rules",
    label: "Réguas de parcelas",
    icon: Ruler,
  },
];

type AdminPageProps = {
  searchParams: Promise<{ competencia?: string | string[] }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requirePageRole("admin");
  const { competencia } = await searchParams;
  const competence = resolvePayoutCompetence(competencia, getBusinessDate());
  const label = formatCompetence(competence);
  const previous = shiftCompetence(competence, -1);
  const next = shiftCompetence(competence, 1);

  const [sales, installments] = await Promise.all([
    saleRepository.list(soldPeriodOf(competence)),
    adminCommissionRepository.listInstallments({
      competenceFrom: competence,
      competenceTo: competence,
    }),
  ]);
  const overview = buildAdminOverview(sales, installments);
  const { closing } = overview;

  return (
    <>
      <PageHeader
        eyebrow="Área administrativa"
        title="Visão geral"
        subtitle={`Produção, comissões e fechamento de ${label}.`}
        actions={
          <nav className={styles.period} aria-label="Outros meses">
            <ButtonLink
              href={`/admin?competencia=${previous}`}
              variant="secondary"
              size="sm"
              icon={ChevronLeft}
            >
              {formatCompetence(previous)}
            </ButtonLink>
            <ButtonLink
              href={`/admin?competencia=${next}`}
              variant="secondary"
              size="sm"
              iconAfter={ChevronRight}
            >
              {formatCompetence(next)}
            </ButtonLink>
          </nav>
        }
      />

      <PageBody>
        <MetricGrid label={`Números de ${label}`} columns={3}>
          <MetricCard
            icon={TrendingUp}
            label="Crédito vendido"
            value={formatCents(overview.creditInCents)}
            note={
              overview.sales > 0
                ? `${countLabel(overview.sales, "venda", "vendas")} em ${label}`
                : `Nenhuma venda em ${label}`
            }
          />
          <MetricCard
            icon={BadgePercent}
            label="Comissões dos vendedores"
            value={formatCents(closing.totalInCents)}
            note={
              closing.closingInstallments > 0
                ? `${countLabel(closing.closingInstallments, "parcela", "parcelas")} · ${formatCents(closing.toPayInCents)} a pagar`
                : "Nenhuma parcela nesta competência"
            }
          />
          <MetricCard
            icon={BadgeDollarSign}
            label="Pago aos vendedores"
            value={formatCents(closing.paidInCents)}
            note={`Fechamento: ${PAYOUT_STAGE_LABELS[closing.stage].toLowerCase()}`}
          />
        </MetricGrid>

        <div className={styles.grid}>
          <Card aria-labelledby="overview-payouts-title">
            <CardHeading
              titleId="overview-payouts-title"
              kicker="Fechamento mensal"
              title="Repasses do mês"
              action={
                <StatusBadge tone={PAYOUT_STAGE_TONES[closing.stage]}>
                  {PAYOUT_STAGE_LABELS[closing.stage]}
                </StatusBadge>
              }
            />

            {overview.installments > 0 ? (
              <>
                <div className={styles.payout}>
                  <span className={styles.payoutIcon}>
                    <CircleDollarSign
                      size={27}
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </span>
                  <div className={styles.payoutText}>
                    <strong className={`num ${styles.payoutAmount}`}>
                      {formatCents(closing.toPayInCents)} a pagar
                    </strong>
                    <span>
                      {countLabel(
                        closing.sellers.length,
                        "vendedor",
                        "vendedores",
                      )}{" "}
                      ·{" "}
                      {countLabel(
                        closing.closingInstallments,
                        "parcela",
                        "parcelas",
                      )}{" "}
                      · {formatCents(closing.paidInCents)} já pagos
                    </span>
                    {overview.installments > closing.closingInstallments ? (
                      <span>
                        {countLabel(
                          overview.installments - closing.closingInstallments,
                          "parcela fora",
                          "parcelas fora",
                        )}{" "}
                        do fechamento (canceladas ou ajustadas)
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <ButtonLink
                    href={`/admin/payouts?competencia=${competence}`}
                    variant="ghost"
                    size="sm"
                    iconAfter={ArrowRight}
                  >
                    Abrir fechamento
                  </ButtonLink>
                </div>
              </>
            ) : (
              <EmptyState
                icon={CircleDollarSign}
                title={`Nenhuma parcela em ${label}`}
                description="O fechamento aparece aqui quando houver comissão nesta competência."
              />
            )}
          </Card>

          <Card aria-labelledby="overview-ranking-title">
            <CardHeading
              titleId="overview-ranking-title"
              kicker={`Produção de ${label}`}
              title="Ranking de vendedores"
              action={<span className={styles.hint}>Por crédito vendido</span>}
            />

            {overview.ranking.length > 0 ? (
              <>
                <ol className={styles.ranking}>
                  {overview.ranking.map((seller, index) => (
                    <li key={seller.sellerId}>
                      <span className={styles.position} aria-hidden="true">
                        {index + 1}º
                      </span>
                      <span className={styles.rankingName}>
                        <Link href={`/admin/sellers/${seller.sellerId}`}>
                          {seller.sellerName}
                        </Link>
                        <small>
                          {countLabel(seller.sales, "venda", "vendas")}
                        </small>
                      </span>
                      <strong className="num">
                        {formatCents(seller.creditInCents)}
                      </strong>
                    </li>
                  ))}
                </ol>
                {overview.otherSellers > 0 ? (
                  <p className={styles.more}>
                    E mais{" "}
                    {countLabel(
                      overview.otherSellers,
                      "vendedor",
                      "vendedores",
                    )}{" "}
                    com vendas no mês.
                  </p>
                ) : null}
              </>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title={`Nenhuma venda em ${label}`}
                description="O ranking considera as vendas pela data em que foram feitas."
              />
            )}
          </Card>

          <Card aria-labelledby="overview-administrators-title">
            <CardHeading
              titleId="overview-administrators-title"
              kicker={`Produção de ${label}`}
              title="Produção por administradora"
              action={<span className={styles.hint}>Crédito vendido</span>}
            />

            {overview.administrators.length > 0 ? (
              <ul className={styles.shares}>
                {overview.administrators.map((administrator) => (
                  <li key={administrator.administratorId}>
                    <div className={styles.shareHeader}>
                      <strong>{administrator.administratorName}</strong>
                      <span className="num">
                        {formatCents(administrator.creditInCents)}
                      </span>
                    </div>
                    <progress
                      className={styles.shareBar}
                      max={10_000}
                      value={administrator.shareBasisPoints}
                      aria-label={`Participação de ${administrator.administratorName}`}
                    />
                    <small className={styles.shareNote}>
                      {formatBasisPoints(administrator.shareBasisPoints)} do
                      crédito ·{" "}
                      {countLabel(administrator.sales, "venda", "vendas")}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Building2}
                title={`Nenhuma venda em ${label}`}
                description="A participação de cada administradora aparece com as vendas do mês."
              />
            )}
          </Card>

          <Card aria-labelledby="overview-shortcuts-title">
            <CardHeading
              titleId="overview-shortcuts-title"
              kicker="Cadastros e consultas"
              title="Atalhos"
              description="Os módulos da administração, a um clique."
            />

            <ul className={styles.shortcuts}>
              {SHORTCUTS.map((shortcut) => (
                <li key={shortcut.href}>
                  <ButtonLink
                    href={shortcut.href}
                    variant="secondary"
                    icon={shortcut.icon}
                    fullWidth
                  >
                    {shortcut.label}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
