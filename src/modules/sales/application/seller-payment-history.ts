import { isInPayoutClosing, type PayoutStage } from "@/modules/commissions";
import type { StatementInstallment } from "./commission-statement-repository";
import { sumInstallmentAmounts } from "./installment-totals";
import { competenceOf } from "./monthly-commission-forecast";
import { buildPayoutClosing } from "./payout-closing";

export type SellerMonthlyPayment = {
  /** Competência no formato AAAA-MM. */
  competence: string;
  stage: PayoutStage;
  /** Parcelas que compõem o fechamento do mês. */
  closingInstallments: number;
  /** Valor do fechamento do mês: o que falta pagar mais o que já foi pago. */
  amountInCents: bigint;
  toPayInCents: bigint;
  paidInCents: bigint;
  /** Data de negócio do último pagamento registrado no mês, se houve. */
  paidOn: string | null;
};

export type SellerPaymentHistory = {
  /** Meses do histórico e da agenda, do mais recente para o mais antigo. */
  months: SellerMonthlyPayment[];
  paidThisYearInCents: bigint;
  lastPayment: SellerMonthlyPayment | null;
  nextPayment: SellerMonthlyPayment | null;
  /** Canceladas e ajustadas, que não entram em nenhum fechamento. */
  outsideInstallments: number;
};

function latest(values: readonly string[]): string | null {
  return values.reduce<string | null>(
    (current, value) => (current === null || value > current ? value : current),
    null,
  );
}

/**
 * Histórico e agenda de pagamentos do vendedor, um mês por competência, com os
 * mesmos totais da tela de repasses. Entram os meses até o corrente e os meses
 * futuros que já foram conferidos ou pagos; o restante do futuro é previsão, e
 * já tem tela própria.
 *
 * `businessDateOf` converte o instante do evento na data de negócio, para que
 * esta regra não dependa de fuso horário.
 */
export function buildSellerPaymentHistory(
  installments: readonly StatementInstallment[],
  today: string,
  businessDateOf: (instant: string) => string,
): SellerPaymentHistory {
  const byCompetence = new Map<string, StatementInstallment[]>();

  for (const installment of installments) {
    const list = byCompetence.get(installment.competence) ?? [];
    list.push(installment);
    byCompetence.set(installment.competence, list);
  }

  const currentCompetence = competenceOf(today);
  const allMonths = [...byCompetence.entries()]
    .sort(([first], [second]) => second.localeCompare(first))
    .map(([competence, list]) => {
      const closing = buildPayoutClosing(list);
      const paid = list.filter((installment) => installment.status === "paga");
      const paidAt = latest(
        paid.map((installment) => installment.statusChangedAt),
      );
      const month: SellerMonthlyPayment = {
        competence,
        stage: closing.stage,
        closingInstallments: closing.closingInstallments,
        amountInCents: closing.totalInCents,
        toPayInCents: closing.toPayInCents,
        paidInCents: closing.paidInCents,
        paidOn: paidAt ? businessDateOf(paidAt) : null,
      };

      return {
        month,
        paidAt,
        hasPending: list.some(
          (installment) =>
            installment.status === "prevista" ||
            installment.status === "programada",
        ),
        wasReviewed: list.some(
          (installment) =>
            installment.status === "programada" ||
            installment.status === "paga",
        ),
      };
    });

  // O resumo olha os mesmos meses da tabela: o futuro só previsto fica na
  // Previsão mensal, e não vira "próximo pagamento".
  const shown = allMonths.filter(
    ({ month, wasReviewed }) =>
      month.competence <= currentCompetence || wasReviewed,
  );
  const months = shown.map(({ month }) => month);
  // O próximo pagamento é o fechamento pendente mais antigo, mesmo que seja
  // de um mês que ficou para trás sem conferência.
  const next = [...shown].reverse().find(({ hasPending }) => hasPending);
  // O último pagamento é o registrado por último, e não o da competência mais
  // recente: a administração pode pagar um mês antigo depois de um mais novo.
  const last = shown.reduce<(typeof shown)[number] | undefined>(
    (current, candidate) =>
      candidate.paidAt !== null &&
      (current?.paidAt == null || candidate.paidAt > current.paidAt)
        ? candidate
        : current,
    undefined,
  );
  const currentYear = today.slice(0, 4);

  return {
    months,
    paidThisYearInCents: sumInstallmentAmounts(
      installments.filter(
        (installment) =>
          installment.status === "paga" &&
          installment.competence.startsWith(`${currentYear}-`),
      ),
    ),
    lastPayment: last?.month ?? null,
    nextPayment: next?.month ?? null,
    outsideInstallments: installments.filter(
      (installment) => !isInPayoutClosing(installment.status),
    ).length,
  };
}
