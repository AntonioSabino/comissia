import { isInPayoutClosing, type PayoutStage } from "@/modules/commissions";
import type { StatementInstallment } from "./commission-statement-repository";
import { sumInstallmentAmounts } from "./installment-totals";
import { competenceOf } from "./monthly-commission-forecast";
import { buildPayoutClosing } from "./payout-closing";

/**
 * Situação do mês como o vendedor a lê. A etapa do fechamento (`stage`) é a
 * visão da administração: para ela, um mês com parcela prevista está "em
 * conferência". Para o vendedor, isso só é verdade quando o fechamento já
 * começou; antes disso o mês é uma previsão (futuro) ou aguarda o fechamento
 * (já passou e ninguém fechou).
 */
export type SellerMonthStatus =
  | "pago"
  | "programado"
  | "em-fechamento"
  | "aguardando-fechamento"
  | "previsto"
  | "sem-valor";

export type SellerMonthlyPayment = {
  /** Competência no formato AAAA-MM. */
  competence: string;
  stage: PayoutStage;
  status: SellerMonthStatus;
  /** Parcelas que compõem o fechamento do mês. */
  closingInstallments: number;
  /** Valor do fechamento do mês: o que falta pagar mais o que já foi pago. */
  amountInCents: bigint;
  toPayInCents: bigint;
  paidInCents: bigint;
  /**
   * Parcelas previstas ou programadas: o que ainda vai ser pago. Contado pela
   * situação, e não pelo valor, porque uma parcela pode valer zero centavo.
   */
  pendingInstallments: number;
  /** Data de negócio do último pagamento registrado no mês, se houve. */
  paidOn: string | null;
  /** Canceladas e ajustadas do mês, que não entram no valor. */
  outsideInstallments: number;
  /** Parcelas do mês, pela previsão, venda e número. */
  installments: StatementInstallment[];
};

export type SellerPaymentHistory = {
  /** Meses do histórico e da agenda, do mais recente para o mais antigo. */
  months: SellerMonthlyPayment[];
  /** Todos os meses com parcela, do mais antigo ao mais recente. */
  timeline: SellerMonthlyPayment[];
  /** Previsto e programado em todos os meses: o que ainda vai receber. */
  pendingInCents: bigint;
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

function sellerStatusOf(
  stage: PayoutStage,
  wasReviewed: boolean,
  isPast: boolean,
): SellerMonthStatus {
  switch (stage) {
    case "pago":
      return "pago";
    case "programado":
      return "programado";
    case "vazio":
      return "sem-valor";
    default:
      if (wasReviewed) {
        return "em-fechamento";
      }

      return isPast ? "aguardando-fechamento" : "previsto";
  }
}

/**
 * Histórico e agenda de pagamentos do vendedor, um mês por competência, com os
 * mesmos totais da tela de repasses. `months` traz os meses até o corrente e
 * os futuros já conferidos ou pagos; `timeline` traz todos, inclusive a
 * previsão, para a tela de Pagamentos mostrar histórico e agenda juntos.
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
      const wasReviewed = list.some(
        (installment) =>
          installment.status === "programada" || installment.status === "paga",
      );
      const month: SellerMonthlyPayment = {
        competence,
        stage: closing.stage,
        status: sellerStatusOf(
          closing.stage,
          wasReviewed,
          competence < currentCompetence,
        ),
        closingInstallments: closing.closingInstallments,
        amountInCents: closing.totalInCents,
        toPayInCents: closing.toPayInCents,
        paidInCents: closing.paidInCents,
        pendingInstallments: list.filter(
          (installment) =>
            installment.status === "prevista" ||
            installment.status === "programada",
        ).length,
        paidOn: paidAt ? businessDateOf(paidAt) : null,
        outsideInstallments: list.filter(
          (installment) => !isInPayoutClosing(installment.status),
        ).length,
        installments: [...list].sort(
          (first, second) =>
            first.dueOn.localeCompare(second.dueOn) ||
            first.saleCode.localeCompare(second.saleCode) ||
            first.number - second.number,
        ),
      };

      return {
        month,
        paidAt,
        hasPending: list.some(
          (installment) =>
            installment.status === "prevista" ||
            installment.status === "programada",
        ),
        wasReviewed,
      };
    });

  // O próximo pagamento é um fechamento que já devia ou já começou a
  // acontecer: o futuro só previsto é agenda, e não vira "próximo pagamento".
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
    timeline: allMonths.map(({ month }) => month).reverse(),
    pendingInCents: sumInstallmentAmounts(
      installments.filter(
        (installment) =>
          installment.status === "prevista" ||
          installment.status === "programada",
      ),
    ),
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
