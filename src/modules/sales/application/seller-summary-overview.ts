import type {
  CommissionInstallmentStatus,
  PayoutStage,
} from "@/modules/commissions";
import type { StatementInstallment } from "./commission-statement-repository";
import { sumInstallmentAmounts } from "./installment-totals";
import { competenceOf } from "./monthly-commission-forecast";
import { buildPayoutClosing } from "./payout-closing";

export type SellerSummaryNextPayment = {
  /** Competência no formato AAAA-MM. */
  competence: string;
  stage: PayoutStage;
  /** Previstas e programadas do mês: o que ainda falta pagar. */
  toPayInCents: bigint;
  /** Parcelas que ainda faltam pagar no mês. */
  pendingInstallments: number;
  /** Data prevista mais próxima entre as parcelas que faltam pagar. */
  dueOn: string;
};

export type SellerSummaryCurrentMonth = {
  competence: string;
  /** Valor do fechamento do mês: o que falta pagar mais o que já foi pago. */
  totalInCents: bigint;
  closingInstallments: number;
  /**
   * Todas as parcelas do mês, inclusive canceladas e ajustadas, que aparecem
   * na lista com a própria situação mas não entram no valor.
   */
  installments: StatementInstallment[];
};

export type SellerSummaryScheduled = {
  /** Programadas de qualquer competência: o que o próximo registro quita. */
  amountInCents: bigint;
  installments: number;
  firstDueOn: string | null;
};

export type SellerSummaryLastPayment = {
  competence: string;
  paidInCents: bigint;
  /** Data de negócio do último pagamento registrado. */
  paidOn: string;
};

export type SellerSummaryUpcoming = {
  /** Previstas e programadas de competências depois do mês corrente. */
  amountInCents: bigint;
  installments: number;
  competences: number;
};

export type SellerSummaryOverview = {
  hasInstallments: boolean;
  nextPayment: SellerSummaryNextPayment | null;
  currentMonth: SellerSummaryCurrentMonth;
  scheduled: SellerSummaryScheduled;
  lastPayment: SellerSummaryLastPayment | null;
  upcoming: SellerSummaryUpcoming;
};

function isPending(status: CommissionInstallmentStatus): boolean {
  return status === "prevista" || status === "programada";
}

function earliest(values: readonly string[]): string | null {
  return values.reduce<string | null>(
    (current, value) => (current === null || value < current ? value : current),
    null,
  );
}

function latest(values: readonly string[]): string | null {
  return values.reduce<string | null>(
    (current, value) => (current === null || value > current ? value : current),
    null,
  );
}

function byDueDate(
  first: StatementInstallment,
  second: StatementInstallment,
): number {
  return (
    first.dueOn.localeCompare(second.dueOn) ||
    first.saleCode.localeCompare(second.saleCode) ||
    first.number - second.number
  );
}

/**
 * Números do Resumo do vendedor, a partir das parcelas dele. As somas passam
 * pelo mesmo fechamento da tela de repasses, sempre em centavos inteiros, e
 * canceladas e ajustadas nunca entram em valor nenhum.
 *
 * O próximo pagamento segue a regra da tela de Pagamentos: o fechamento
 * pendente mais antigo entre os meses até o corrente e os futuros já
 * conferidos. O futuro só previsto entra em "Próximos meses", e não vira
 * próximo pagamento.
 *
 * `businessDateOf` converte o instante do evento na data de negócio, para que
 * esta regra não dependa de fuso horário.
 */
export function buildSellerSummaryOverview(
  installments: readonly StatementInstallment[],
  today: string,
  businessDateOf: (instant: string) => string,
): SellerSummaryOverview {
  const currentCompetence = competenceOf(today);
  const byCompetence = new Map<string, StatementInstallment[]>();

  for (const installment of installments) {
    const list = byCompetence.get(installment.competence) ?? [];
    list.push(installment);
    byCompetence.set(installment.competence, list);
  }

  const competences = [...byCompetence.keys()].sort();

  const nextCompetence = competences.find((competence) => {
    const list = byCompetence.get(competence) ?? [];
    const wasReviewed = list.some(
      (installment) =>
        installment.status === "programada" || installment.status === "paga",
    );

    return (
      (competence <= currentCompetence || wasReviewed) &&
      list.some((installment) => isPending(installment.status))
    );
  });
  let nextPayment: SellerSummaryNextPayment | null = null;

  if (nextCompetence !== undefined) {
    const list = byCompetence.get(nextCompetence) ?? [];
    const pending = list.filter((installment) => isPending(installment.status));
    const closing = buildPayoutClosing(list);

    nextPayment = {
      competence: nextCompetence,
      stage: closing.stage,
      toPayInCents: closing.toPayInCents,
      pendingInstallments: pending.length,
      dueOn: earliest(pending.map((installment) => installment.dueOn)) ?? "",
    };
  }

  const currentList = byCompetence.get(currentCompetence) ?? [];
  const currentClosing = buildPayoutClosing(currentList);

  const scheduled = installments.filter(
    (installment) => installment.status === "programada",
  );

  // O último pagamento é o registrado por último, e não o da competência mais
  // recente: a administração pode pagar um mês antigo depois de um mais novo.
  let lastPayment: SellerSummaryLastPayment | null = null;
  let lastPaidAt: string | null = null;

  for (const competence of competences) {
    const list = byCompetence.get(competence) ?? [];
    const paid = list.filter((installment) => installment.status === "paga");
    const paidAt = latest(
      paid.map((installment) => installment.statusChangedAt),
    );

    if (paidAt !== null && (lastPaidAt === null || paidAt > lastPaidAt)) {
      lastPaidAt = paidAt;
      lastPayment = {
        competence,
        paidInCents: sumInstallmentAmounts(paid),
        paidOn: businessDateOf(paidAt),
      };
    }
  }

  const upcoming = installments.filter(
    (installment) =>
      installment.competence > currentCompetence &&
      isPending(installment.status),
  );

  return {
    hasInstallments: installments.length > 0,
    nextPayment,
    currentMonth: {
      competence: currentCompetence,
      totalInCents: currentClosing.totalInCents,
      closingInstallments: currentClosing.closingInstallments,
      installments: [...currentList].sort(byDueDate),
    },
    scheduled: {
      amountInCents: sumInstallmentAmounts(scheduled),
      installments: scheduled.length,
      firstDueOn: earliest(scheduled.map((installment) => installment.dueOn)),
    },
    lastPayment,
    upcoming: {
      amountInCents: sumInstallmentAmounts(upcoming),
      installments: upcoming.length,
      competences: new Set(
        upcoming.map((installment) => installment.competence),
      ).size,
    },
  };
}
