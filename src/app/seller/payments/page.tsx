import { ChevronLeft, ChevronRight, Download, WalletCards } from "lucide-react";
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
import {
  SELLER_MONTH_STATUS_LABELS,
  SELLER_MONTH_STATUS_TONES,
} from "@/app/_utils/payout-stage";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import {
  competenceOf,
  selectCompetence,
} from "@/modules/sales/application/monthly-commission-forecast";
import {
  buildSellerPaymentHistory,
  type SellerMonthlyPayment,
} from "@/modules/sales/application/seller-payment-history";
import { commissionStatementRepository } from "@/modules/sales/infrastructure/db/commission-statement-repository";
import styles from "./payments.module.css";

export const metadata: Metadata = {
  title: "Pagamentos | Comissia",
};

function installmentsLabel(count: number): string {
  return count === 1 ? "1 parcela" : `${count} parcelas`;
}

function monthTitle(month: SellerMonthlyPayment): string {
  switch (month.status) {
    case "pago":
      return month.paidOn
        ? `Pago em ${formatBusinessDate(month.paidOn)}`
        : "Pago";
    case "programado":
      return "Programado para pagamento";
    case "em-fechamento":
      return "Em fechamento";
    case "aguardando-fechamento":
      return "Aguardando fechamento";
    case "previsto":
      return "Previsto para o mês";
    default:
      return "Sem valor a receber";
  }
}

function monthExplanation(month: SellerMonthlyPayment): string {
  switch (month.status) {
    case "pago":
      return "A administração registrou o pagamento deste mês. O demonstrativo detalha cada parcela que o compõe.";
    case "programado":
      return "A administração conferiu o fechamento deste mês, e o pagamento está programado.";
    case "em-fechamento":
      return "Parte das parcelas deste mês já foi conferida ou paga; as demais ainda aguardam a conferência da administração.";
    case "aguardando-fechamento":
      return "Este mês já passou e a administração ainda não fechou o pagamento. Os valores são os calculados quando cada venda foi registrada.";
    case "previsto":
      return "Estes valores são previsões, calculadas quando cada venda foi registrada. Eles podem mudar se a situação da cota mudar.";
    default:
      return "As parcelas deste mês foram canceladas ou ajustadas e não entram no pagamento.";
  }
}

type SellerPaymentsPageProps = {
  searchParams: Promise<{ competencia?: string | string[] }>;
};

export default async function SellerPaymentsPage({
  searchParams,
}: SellerPaymentsPageProps) {
  const user = await requirePageRole("seller");
  const { competencia } = await searchParams;
  const requested = Array.isArray(competencia) ? competencia[0] : competencia;

  const header = (
    <PageHeader
      eyebrow="Área do vendedor"
      title="Pagamentos"
      subtitle="O que você já recebeu, o que está programado e o que ainda está previsto, mês a mês."
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
              description="Peça à administração para vincular o seu acesso ao seu cadastro; sem isso não há pagamentos para mostrar."
            />
          </Card>
        </PageBody>
      </>
    );
  }

  const today = getBusinessDate();
  // O vendedor vem da sessão: esta tela nunca aceita outro pela URL.
  const history = buildSellerPaymentHistory(
    await commissionStatementRepository.listInstallments({
      sellerId: user.sellerId,
    }),
    today,
    (instant) => getBusinessDate(new Date(instant)),
  );
  const { timeline, lastPayment, nextPayment } = history;
  const selected = selectCompetence(
    timeline.map((item) => ({
      competence: item.competence,
      totalInCents: item.amountInCents,
    })),
    requested,
    today,
  );
  const index = timeline.findIndex((item) => item.competence === selected);
  const month = index >= 0 ? timeline[index] : null;
  const previous = index > 0 ? timeline[index - 1] : null;
  const next =
    index >= 0 && index < timeline.length - 1 ? timeline[index + 1] : null;
  const currentCompetence = competenceOf(today);
  const pendingMonths = timeline.filter(
    (item) => item.pendingInstallments > 0,
  ).length;

  if (!month) {
    return (
      <>
        {header}
        <PageBody>
          <Card flush>
            <EmptyState
              icon={WalletCards}
              title="Você ainda não tem comissões"
              description="Assim que a administração registrar uma venda sua, as parcelas aparecem aqui, mês a mês, do previsto ao pago."
            />
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <>
      {header}

      <PageBody>
        <dl className={styles.summary} aria-label="Resumo dos pagamentos">
          <div>
            <dt>Pago no ano</dt>
            <dd className={`${styles.value} num`}>
              {formatCents(history.paidThisYearInCents)}
            </dd>
            <dd className={styles.note}>Competências de {today.slice(0, 4)}</dd>
          </div>
          <div>
            <dt>Último pagamento</dt>
            <dd className={`${styles.value} num`}>
              {lastPayment ? formatCents(lastPayment.paidInCents) : "—"}
            </dd>
            <dd className={styles.note}>
              {lastPayment?.paidOn
                ? `Registrado em ${formatBusinessDate(lastPayment.paidOn)}`
                : "Nenhum pagamento registrado"}
            </dd>
          </div>
          <div>
            <dt>Próximo pagamento</dt>
            <dd className={`${styles.value} num`}>
              {nextPayment ? formatCents(nextPayment.toPayInCents) : "—"}
            </dd>
            <dd className={styles.note}>
              {nextPayment
                ? `${SELLER_MONTH_STATUS_LABELS[nextPayment.status]} · ${formatCompetence(nextPayment.competence)}`
                : "Nenhum fechamento pendente"}
            </dd>
          </div>
          <div>
            <dt>A receber</dt>
            <dd className={`${styles.value} num`}>
              {formatCents(history.pendingInCents)}
            </dd>
            <dd className={styles.note}>
              {pendingMonths === 0
                ? "Nada previsto ou programado"
                : `Previsto e programado em ${pendingMonths === 1 ? "1 mês" : `${pendingMonths} meses`}`}
            </dd>
          </div>
        </dl>

        <Card aria-labelledby="month-title">
          <CardHeading
            titleId="month-title"
            kicker={`Competência ${formatCompetence(month.competence)}`}
            title={monthTitle(month)}
            action={
              <nav
                className={styles.navigation}
                aria-label="Outras competências"
              >
                {previous ? (
                  <ButtonLink
                    href={`/seller/payments?competencia=${previous.competence}`}
                    variant="secondary"
                    size="sm"
                    icon={ChevronLeft}
                  >
                    {formatCompetence(previous.competence)}
                  </ButtonLink>
                ) : null}
                {next ? (
                  <ButtonLink
                    href={`/seller/payments?competencia=${next.competence}`}
                    variant="secondary"
                    size="sm"
                    iconAfter={ChevronRight}
                  >
                    {formatCompetence(next.competence)}
                  </ButtonLink>
                ) : null}
              </nav>
            }
          />

          <div className={styles.totalRow}>
            <p className={`num ${styles.total}`}>
              {formatCents(month.amountInCents)}
            </p>
            <StatusBadge tone={SELLER_MONTH_STATUS_TONES[month.status]}>
              {SELLER_MONTH_STATUS_LABELS[month.status]}
            </StatusBadge>
          </div>
          <p className={styles.totalNote}>
            {installmentsLabel(month.closingInstallments)} no pagamento
            {month.outsideInstallments > 0
              ? ` · ${installmentsLabel(month.outsideInstallments)} fora (canceladas ou ajustadas)`
              : ""}
          </p>

          <Alert>{monthExplanation(month)}</Alert>

          <div className={styles.monthActions}>
            <ButtonLink
              href={`/seller/payments/statement?competencia=${month.competence}`}
              variant="secondary"
              size="sm"
              icon={Download}
            >
              Baixar demonstrativo
            </ButtonLink>
          </div>
        </Card>

        <Card flush aria-labelledby="month-installments-title">
          <CardHeading
            titleId="month-installments-title"
            kicker={installmentsLabel(month.installments.length)}
            title={`Parcelas de ${formatCompetence(month.competence)}`}
            description="Cada linha mostra de qual venda o valor vem; o código abre a venda."
          />

          <DataTable>
            <thead>
              <tr>
                <th>Venda · parcela</th>
                <th>Previsão</th>
                <th>Cliente</th>
                <th>Administradora · produto</th>
                <th>Valor</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {month.installments.map((installment) => (
                <tr key={installment.id}>
                  <td className="num">
                    <Link
                      href={`/seller/sales/${installment.saleId}?competencia=${month.competence}`}
                    >
                      {installment.saleCode}
                    </Link>{" "}
                    · {installment.number}/{installment.saleInstallments}
                  </td>
                  <td className="num">
                    {formatBusinessDate(installment.dueOn)}
                  </td>
                  <td className={styles.text}>{installment.customerName}</td>
                  <td className={styles.text}>
                    {installment.administratorName} · {installment.product}
                  </td>
                  <td className="num">
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
        </Card>

        <Card flush aria-labelledby="months-title">
          <CardHeading
            titleId="months-title"
            kicker="Histórico e agenda"
            title="Todos os meses"
          />

          <DataTable>
            <thead>
              <tr>
                <th>Competência</th>
                <th>Pagamento</th>
                <th>Composição</th>
                <th>Valor</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((item) => {
                const isSelected = item.competence === month.competence;

                return (
                  <tr
                    key={item.competence}
                    aria-current={isSelected ? "true" : undefined}
                    className={isSelected ? styles.selected : undefined}
                  >
                    <td className="num">
                      <Link
                        href={`/seller/payments?competencia=${item.competence}`}
                      >
                        {formatCompetence(item.competence)}
                      </Link>
                      {item.competence === currentCompetence ? (
                        <span className={styles.current}> mês atual</span>
                      ) : null}
                    </td>
                    <td className="num">
                      {item.paidOn ? formatBusinessDate(item.paidOn) : "—"}
                    </td>
                    <td>{installmentsLabel(item.closingInstallments)}</td>
                    <td className="num">{formatCents(item.amountInCents)}</td>
                    <td>
                      <StatusBadge
                        tone={SELLER_MONTH_STATUS_TONES[item.status]}
                      >
                        {SELLER_MONTH_STATUS_LABELS[item.status]}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </Card>
      </PageBody>
    </>
  );
}
