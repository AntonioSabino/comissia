import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/app/_components/ui/alert";
import { Button } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable } from "@/app/_components/ui/data-table";
import { Input } from "@/app/_components/ui/field";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState } from "@/app/_components/ui/state-block";
import {
  StatusBadge,
  type StatusTone,
} from "@/app/_components/ui/status-badge";
import { formatCents, formatCompetence } from "@/app/_utils/format";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import type { PayoutStage } from "@/modules/commissions";
import { shiftCompetence } from "@/modules/sales/application/monthly-commission-forecast";
import {
  buildPayoutClosing,
  resolvePayoutCompetence,
} from "@/modules/sales/application/payout-closing";
import { adminCommissionRepository } from "@/modules/sales/infrastructure/db/admin-commission-repository";
import { PayoutAction } from "./payout-action";
import styles from "./payouts.module.css";

export const metadata: Metadata = {
  title: "Repasses | Comissia",
};

const STAGE_LABELS: Record<PayoutStage, string> = {
  "em-conferencia": "Em conferência",
  programado: "Programado",
  pago: "Pago",
  vazio: "Sem repasse",
};

const STAGE_TONES: Record<PayoutStage, StatusTone> = {
  "em-conferencia": "pending",
  programado: "reconciled",
  pago: "received",
  vazio: "neutral",
};

type StepState = "done" | "current" | "upcoming";

const STEP_STATE_LABELS: Record<StepState, string> = {
  done: "concluída",
  current: "em andamento",
  upcoming: "a seguir",
};

function stepsOf(stage: PayoutStage): {
  review: StepState;
  payment: StepState;
} {
  switch (stage) {
    case "em-conferencia":
      return { review: "current", payment: "upcoming" };
    case "programado":
      return { review: "done", payment: "current" };
    case "pago":
      return { review: "done", payment: "done" };
    default:
      return { review: "upcoming", payment: "upcoming" };
  }
}

function installmentsLabel(count: number): string {
  return count === 1 ? "1 parcela" : `${count} parcelas`;
}

type PayoutsPageProps = {
  searchParams: Promise<{ competencia?: string | string[] }>;
};

export default async function PayoutsPage({ searchParams }: PayoutsPageProps) {
  await requirePageRole("admin");
  const { competencia } = await searchParams;
  const competence = resolvePayoutCompetence(competencia, getBusinessDate());
  const installments = await adminCommissionRepository.listInstallments({
    competenceFrom: competence,
    competenceTo: competence,
  });
  const closing = buildPayoutClosing(installments);
  const steps = stepsOf(closing.stage);
  const label = formatCompetence(competence);
  const previous = shiftCompetence(competence, -1);
  const next = shiftCompetence(competence, 1);

  return (
    <>
      <PageHeader
        eyebrow="Contas a pagar"
        title="Repasses"
        subtitle="Um pagamento mensal por vendedor, conferido antes de ser registrado."
      />

      <PageBody>
        <nav className={styles.period} aria-label="Competência do fechamento">
          <Link
            className={styles.periodLink}
            href={`/admin/payouts?competencia=${previous}`}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            {formatCompetence(previous)}
          </Link>
          <form className={styles.periodForm} method="get">
            <Input
              className={styles.periodInput}
              type="month"
              name="competencia"
              defaultValue={competence}
              aria-label="Competência"
              required
            />
            <Button type="submit" variant="secondary" size="sm">
              Abrir
            </Button>
          </form>
          <Link
            className={styles.periodLink}
            href={`/admin/payouts?competencia=${next}`}
          >
            {formatCompetence(next)}
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </nav>

        <section className={styles.hero} aria-labelledby="payout-total">
          <div className={styles.heroText}>
            <span className={styles.heroKicker}>Fechamento {label}</span>
            <h2 id="payout-total" className={`${styles.heroAmount} num`}>
              {formatCents(closing.toPayInCents)} a pagar
            </h2>
            <p className={styles.heroDescription}>
              {closing.closingInstallments === 0
                ? "Nenhuma parcela de comissão nesta competência."
                : `${installmentsLabel(closing.closingInstallments)} de ${closing.sellers.length === 1 ? "1 vendedor" : `${closing.sellers.length} vendedores`}, com ${formatCents(closing.paidInCents)} já pagos.`}
            </p>
          </div>

          <ol className={styles.steps} aria-label="Etapas do fechamento">
            <li className={styles[steps.review]}>
              {steps.review === "done" ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : steps.review === "current" ? (
                <Clock3 size={16} aria-hidden="true" />
              ) : (
                <Circle size={16} aria-hidden="true" />
              )}
              Conferência
              <span className="visually-hidden">
                , {STEP_STATE_LABELS[steps.review]}
              </span>
            </li>
            <li className={styles[steps.payment]}>
              {steps.payment === "done" ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <Banknote size={16} aria-hidden="true" />
              )}
              Pagamento
              <span className="visually-hidden">
                , {STEP_STATE_LABELS[steps.payment]}
              </span>
            </li>
          </ol>

          <PayoutAction
            endpoint={`/api/admin/payouts/${competence}/review`}
            label="Conferir fechamento"
            icon={CheckCircle2}
            disabled={closing.plannedInstallments === 0}
            title={`Conferir fechamento de ${label}`}
            description="As parcelas previstas desta competência passam a programadas. Depois da conferência, registre o pagamento de cada vendedor."
            lines={[
              {
                label: "Parcelas a conferir",
                value: String(closing.plannedInstallments),
              },
              {
                label: "Já programadas",
                note: "Não mudam",
                value: formatCents(closing.scheduledInCents),
              },
              {
                label: "Total a pagar",
                value: formatCents(closing.toPayInCents),
                emphasis: true,
              },
            ]}
            confirmLabel="Confirmar conferência"
            successMessage="Fechamento conferido. As parcelas previstas foram programadas."
          />
        </section>

        <Card flush aria-labelledby="payout-composition-title">
          <CardHeading
            titleId="payout-composition-title"
            kicker={
              closing.sellers.length === 1
                ? "1 vendedor"
                : `${closing.sellers.length} vendedores`
            }
            title="Composição do fechamento"
            description="Canceladas e ajustadas aparecem aqui, mas ficam fora do valor a pagar."
          />

          <div className={styles.totals} aria-label="Totais do fechamento">
            <div>
              <span>Parcelas no fechamento</span>
              <strong className="num">{closing.closingInstallments}</strong>
            </div>
            <div>
              <span>A pagar</span>
              <strong className="num">
                {formatCents(closing.toPayInCents)}
              </strong>
            </div>
            <div>
              <span>Pago</span>
              <strong className="num">
                {formatCents(closing.paidInCents)}
              </strong>
            </div>
            <div>
              <span>Fora do fechamento</span>
              <strong className="num">
                {formatCents(closing.outsideInCents)}
              </strong>
            </div>
          </div>

          {closing.sellers.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title={`Nenhuma parcela em ${label}`}
              description="Escolha outra competência ou cadastre vendas com parcelas neste mês."
            />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Parcelas</th>
                  <th>A pagar</th>
                  <th>Pago</th>
                  <th>Situação</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {closing.sellers.map((seller) => (
                  <tr key={seller.sellerId}>
                    <td>
                      <Link
                        href={`/admin/commissions?from=${competence}&to=${competence}&seller=${seller.sellerId}`}
                      >
                        {seller.sellerName}
                      </Link>
                    </td>
                    <td className="num">
                      {seller.closingInstallments}
                      {seller.installments.length >
                      seller.closingInstallments ? (
                        <small className={styles.outside}>
                          {" "}
                          +
                          {seller.installments.length -
                            seller.closingInstallments}{" "}
                          fora
                        </small>
                      ) : null}
                    </td>
                    <td className="num">{formatCents(seller.toPayInCents)}</td>
                    <td className="num">{formatCents(seller.paidInCents)}</td>
                    <td>
                      <StatusBadge tone={STAGE_TONES[seller.stage]}>
                        {STAGE_LABELS[seller.stage]}
                      </StatusBadge>
                    </td>
                    <td className={styles.rowAction}>
                      <PayoutAction
                        endpoint={`/api/admin/payouts/${competence}/sellers/${seller.sellerId}/payment`}
                        label="Marcar como pago"
                        accessibleLabel={`Marcar como pago o repasse de ${seller.sellerName}`}
                        variant="secondary"
                        size="sm"
                        icon={Banknote}
                        disabled={seller.scheduledInCents === BigInt(0)}
                        title={`Registrar pagamento de ${seller.sellerName}`}
                        description={`As parcelas programadas de ${label} passam a pagas. Parcelas ainda previstas continuam aguardando a conferência.`}
                        lines={[
                          {
                            label: "Valor pago",
                            note: `Competência ${label}`,
                            value: formatCents(seller.scheduledInCents),
                            emphasis: true,
                          },
                        ]}
                        confirmLabel="Confirmar pagamento"
                        successMessage={`Pagamento de ${seller.sellerName} registrado.`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>

        <Alert>
          Recebimentos importados, corte por recebimento e repasses a parceiros
          ficam para um próximo incremento. Aqui o fechamento considera as
          parcelas de comissão geradas no cadastro das vendas.
        </Alert>
      </PageBody>
    </>
  );
}
