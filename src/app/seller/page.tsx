import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX,
  HandCoins,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/app/_components/ui/alert";
import { ButtonLink } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable } from "@/app/_components/ui/data-table";
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
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { buildSellerSummaryOverview } from "@/modules/sales/application/seller-summary-overview";
import { summarizeSellerSales } from "@/modules/sales/application/seller-summary";
import { commissionStatementRepository } from "@/modules/sales/infrastructure/db/commission-statement-repository";
import { sellerCommissionRepository } from "@/modules/sales/infrastructure/db/seller-commission-repository";
import styles from "./seller-summary.module.css";

export const metadata: Metadata = {
  title: "Resumo | Comissia",
};

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Nome do mês da competência (AAAA-MM), como "setembro". */
function monthName(competence: string): string {
  return MONTH_NAMES[Number(competence.slice(5, 7)) - 1] ?? competence;
}

/** Competência por extenso, como "setembro de 2026". */
function formatCompetenceLong(competence: string): string {
  return `${monthName(competence)} de ${competence.slice(0, 4)}`;
}

function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function paymentsHref(competence: string): string {
  return `/seller/payments?competencia=${competence}`;
}

export default async function SellerPage() {
  const user = await requirePageRole("seller");
  const today = getBusinessDate();
  const currentCompetence = today.slice(0, 7);

  const header = (
    <PageHeader
      eyebrow="Área do vendedor"
      title="Resumo"
      subtitle={`Seus valores · competência ${formatCompetenceLong(currentCompetence)}`}
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

  const businessDateOf = (instant: string) =>
    getBusinessDate(new Date(instant));
  // O vendedor vem da sessão nas duas leituras: nenhuma aceita outro pela URL.
  const [installments, sales] = await Promise.all([
    commissionStatementRepository.listInstallments({
      sellerId: user.sellerId,
    }),
    sellerCommissionRepository.listSales(user.sellerId),
  ]);
  const overview = buildSellerSummaryOverview(
    installments,
    today,
    businessDateOf,
  );
  const salesSummary = summarizeSellerSales(sales);
  const { nextPayment, currentMonth, scheduled, lastPayment, upcoming } =
    overview;

  const salesBlock =
    salesSummary.sales > 0 ? (
      <Card tone="sunken" aria-labelledby="seller-summary-sales-title">
        <CardHeading
          titleId="seller-summary-sales-title"
          kicker="Todo o período"
          title="Suas vendas"
          description="Contam somente as suas vendas. A comissão é a prevista quando cada venda foi registrada."
          action={
            <ButtonLink
              href="/seller/sales"
              variant="secondary"
              size="sm"
              iconAfter={ArrowRight}
            >
              Ver as vendas
            </ButtonLink>
          }
        />

        <dl className={styles.salesStats}>
          <div className={styles.salesStat}>
            <dt>Vendas</dt>
            <dd className="num">{salesSummary.sales}</dd>
          </div>
          <div className={styles.salesStat}>
            <dt>Crédito vendido</dt>
            <dd className="num">{formatCents(salesSummary.creditInCents)}</dd>
          </div>
          <div className={styles.salesStat}>
            <dt>Comissão prevista</dt>
            <dd className={`num ${styles.money}`}>
              {formatCents(salesSummary.commissionInCents)}
            </dd>
          </div>
        </dl>

        {salesSummary.salesWithMismatch > 0 ? (
          <Alert tone="attention" className={styles.salesAlert}>
            {salesSummary.salesWithMismatch === 1
              ? "Uma venda sua tem parcelas que não somam a própria comissão."
              : `${salesSummary.salesWithMismatch} vendas suas têm parcelas que não somam a própria comissão.`}{" "}
            Avise a administração para conferir.
          </Alert>
        ) : salesSummary.salesWithoutInstallments > 0 ? (
          <Alert className={styles.salesAlert}>
            {salesSummary.salesWithoutInstallments === 1
              ? "Uma venda sua não tem parcelas geradas, então ela entra na comissão mas não aparece em nenhum mês."
              : `${salesSummary.salesWithoutInstallments} vendas suas não têm parcelas geradas, então elas entram na comissão mas não aparecem em nenhum mês.`}{" "}
            Fale com a administração para saber como serão pagas.
          </Alert>
        ) : null}
      </Card>
    ) : null;

  const privacyNote = (
    <p className={styles.privacy}>
      <ShieldCheck size={17} strokeWidth={1.8} aria-hidden="true" />
      <span>
        Você vê somente os seus acordos e valores. As condições financeiras da
        corretora permanecem restritas.
      </span>
    </p>
  );

  if (!overview.hasInstallments) {
    return (
      <>
        {header}
        <PageBody>
          <Card flush>
            <EmptyState
              icon={WalletCards}
              title="Você ainda não tem comissões"
              description="Assim que a administração registrar uma venda sua, as parcelas da comissão e os pagamentos aparecem aqui."
            />
            {privacyNote}
          </Card>
          {salesBlock}
        </PageBody>
      </>
    );
  }

  const nextNote = !nextPayment
    ? "Nenhum fechamento pendente. As parcelas dos próximos meses ainda estão em previsão."
    : nextPayment.stage === "programado"
      ? "Pagamento mensal programado pela corretora, aguardando o registro."
      : "Parcelas previstas, em conferência pela corretora antes do pagamento.";

  return (
    <>
      {header}

      <PageBody>
        <section
          className={styles.hero}
          aria-labelledby="seller-next-payment-title"
        >
          <div className={styles.heroText}>
            <h2 id="seller-next-payment-title" className={styles.heroKicker}>
              Próximo pagamento
            </h2>
            {nextPayment ? (
              <p className={`num ${styles.heroValue}`}>
                {formatCents(nextPayment.toPayInCents)}
              </p>
            ) : (
              <p className={styles.heroEmpty}>Nada pendente</p>
            )}
            <p className={styles.heroNote}>{nextNote}</p>
          </div>

          {nextPayment ? (
            <div className={styles.heroDate}>
              <CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" />
              <div className={styles.heroDateText}>
                <span>
                  {nextPayment.stage === "programado"
                    ? "Pagamento programado"
                    : "Pagamento previsto"}
                </span>
                <strong className="num">
                  {formatBusinessDate(nextPayment.dueOn)}
                </strong>
                <Link
                  className={styles.heroLink}
                  href={paymentsHref(nextPayment.competence)}
                >
                  Competência {formatCompetence(nextPayment.competence)} ·{" "}
                  {countLabel(
                    nextPayment.pendingInstallments,
                    "parcela",
                    "parcelas",
                  )}
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        <ul className={styles.metrics} aria-label="Seus valores">
          <li className={styles.metric}>
            <div className={styles.metricInner}>
              <span className={styles.metricIcon}>
                <HandCoins size={26} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className={styles.metricText}>
                <span className={styles.metricLabel}>
                  Previsto em {monthName(currentMonth.competence)}
                </span>
                <strong className={`num ${styles.metricValue}`}>
                  {formatCents(currentMonth.totalInCents)}
                </strong>
                <span className={styles.metricNote}>
                  {countLabel(
                    currentMonth.closingInstallments,
                    "parcela no mês",
                    "parcelas no mês",
                  )}
                </span>
              </div>
            </div>
          </li>

          <li className={styles.metric}>
            <div className={styles.metricInner}>
              <span className={styles.metricIcon}>
                <CalendarClock size={26} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className={styles.metricText}>
                <span className={styles.metricLabel}>
                  Programado para pagamento
                </span>
                <strong className={`num ${styles.metricValue}`}>
                  {formatCents(scheduled.amountInCents)}
                </strong>
                <span className={styles.metricNote}>
                  {scheduled.firstDueOn
                    ? `${countLabel(scheduled.installments, "parcela", "parcelas")} · a partir de ${formatBusinessDate(scheduled.firstDueOn)}`
                    : "Nada programado ainda"}
                </span>
              </div>
            </div>
          </li>

          <li className={styles.metric}>
            <div className={styles.metricInner}>
              <span className={styles.metricIcon}>
                <BadgeCheck size={26} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className={styles.metricText}>
                <span className={styles.metricLabel}>
                  {lastPayment
                    ? `Pago em ${monthName(lastPayment.competence)}`
                    : "Pago no último fechamento"}
                </span>
                <strong className={`num ${styles.metricValue}`}>
                  {lastPayment ? formatCents(lastPayment.paidInCents) : "—"}
                </strong>
                <span className={styles.metricNote}>
                  {lastPayment
                    ? `Registrado em ${formatBusinessDate(lastPayment.paidOn)}`
                    : "Nenhum pagamento registrado"}
                </span>
              </div>
            </div>
          </li>

          <li className={styles.metric}>
            <div className={styles.metricInner}>
              <span className={styles.metricIcon}>
                <CalendarRange size={26} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className={styles.metricText}>
                <span className={styles.metricLabel}>Próximos meses</span>
                <strong className={`num ${styles.metricValue}`}>
                  {formatCents(upcoming.amountInCents)}
                </strong>
                <span className={styles.metricNote}>
                  {upcoming.installments > 0
                    ? `Ainda previsto · ${countLabel(upcoming.competences, "competência", "competências")}`
                    : "Nada previsto depois deste mês"}
                </span>
              </div>
            </div>
          </li>
        </ul>

        <Card flush aria-labelledby="seller-month-title">
          <CardHeading
            titleId="seller-month-title"
            kicker={`Parcelas de ${formatCompetenceLong(currentMonth.competence)}`}
            title="Comissões deste mês"
            action={
              <ButtonLink
                href={paymentsHref(currentMonth.competence)}
                variant="secondary"
                size="sm"
                iconAfter={ArrowRight}
              >
                Ver o mês em Pagamentos
              </ButtonLink>
            }
          />

          {currentMonth.installments.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title="Nenhuma parcela neste mês"
              description={
                upcoming.installments > 0
                  ? "As suas próximas parcelas estão somadas em Próximos meses."
                  : "Quando houver parcela sua com competência neste mês, ela aparece aqui."
              }
            />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Venda</th>
                  <th>Cliente</th>
                  <th>Parcela</th>
                  <th>Previsão / pagamento</th>
                  <th className={styles.amount}>Valor</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {currentMonth.installments.map((installment) => (
                  <tr key={installment.id}>
                    <td className="num">
                      {formatCompetence(installment.competence)}
                    </td>
                    <td className="num">
                      <Link href={`/seller/sales/${installment.saleId}`}>
                        {installment.saleCode}
                      </Link>
                    </td>
                    <td>{installment.customerName}</td>
                    <td className="num">
                      {installment.number}/{installment.saleInstallments}
                    </td>
                    <td className="num">
                      {installment.status === "paga"
                        ? `Paga em ${formatBusinessDate(businessDateOf(installment.statusChangedAt))}`
                        : formatBusinessDate(installment.dueOn)}
                    </td>
                    <td className={`num ${styles.amount}`}>
                      {formatCents(installment.amountInCents)}
                    </td>
                    <td>
                      <StatusBadge
                        tone={INSTALLMENT_STATUS_TONES[installment.status]}
                      >
                        {INSTALLMENT_STATUS_LABELS[installment.status]}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}

          {privacyNote}
        </Card>

        {salesBlock}
      </PageBody>
    </>
  );
}
