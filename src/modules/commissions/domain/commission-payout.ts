import {
  changeCommissionInstallmentStatus,
  currentCommissionInstallmentStatus,
  type CommissionInstallmentStatus,
  type CommissionInstallmentStatusHistory,
  type CommissionInstallmentStatusHistoryEntry,
} from "./commission-installment-status";

/**
 * Situações que compõem o fechamento mensal. Cancelada não é paga, e ajustada
 * depende de uma operação própria, com valor e motivo, que ainda não existe:
 * as duas aparecem na composição, mas ficam fora do valor a pagar.
 */
const PAYOUT_CLOSING_STATUSES: readonly CommissionInstallmentStatus[] = [
  "prevista",
  "programada",
  "paga",
];

export function isInPayoutClosing(
  status: CommissionInstallmentStatus,
): boolean {
  return PAYOUT_CLOSING_STATUSES.includes(status);
}

export type PayoutTransition = Readonly<{
  from: CommissionInstallmentStatus;
  to: CommissionInstallmentStatus;
}>;

/** Conferir o fechamento programa as parcelas previstas do mês. */
export const PAYOUT_REVIEW: PayoutTransition = Object.freeze({
  from: "prevista",
  to: "programada",
});

/** Registrar o pagamento quita as parcelas já programadas. */
export const PAYOUT_PAYMENT: PayoutTransition = Object.freeze({
  from: "programada",
  to: "paga",
});

/**
 * Etapa de um conjunto de parcelas no fechamento: de um vendedor ou do mês
 * inteiro. Basta uma prevista para o conjunto ainda estar em conferência, e
 * ele só está pago quando todas as parcelas do fechamento foram quitadas.
 */
export type PayoutStage = "em-conferencia" | "programado" | "pago" | "vazio";

export function payoutStageOf(
  statuses: readonly CommissionInstallmentStatus[],
): PayoutStage {
  const closing = statuses.filter(isInPayoutClosing);

  if (closing.length === 0) {
    return "vazio";
  }

  if (closing.includes("prevista")) {
    return "em-conferencia";
  }

  if (closing.includes("programada")) {
    return "programado";
  }

  return "pago";
}

export type PayoutInstallmentHistory = Readonly<{
  installmentId: string;
  history: CommissionInstallmentStatusHistory;
}>;

export type PayoutStatusEvent = Readonly<{
  installmentId: string;
  /** Posição do novo evento no histórico da parcela, a partir de 1. */
  sequence: number;
  entry: CommissionInstallmentStatusHistoryEntry;
}>;

/**
 * Eventos que a transição gera: um por parcela que está exatamente na situação
 * de origem. As demais são ignoradas, e não recusadas, para que conferir ou
 * pagar de novo não falhe por causa das parcelas que já avançaram. O plano é
 * imutável nos dois níveis, como as demais coleções do módulo.
 */
export function planPayoutTransition(
  installments: readonly PayoutInstallmentHistory[],
  transition: PayoutTransition,
  changedAt: Date,
): readonly PayoutStatusEvent[] {
  const events: PayoutStatusEvent[] = [];

  for (const { installmentId, history } of installments) {
    if (currentCommissionInstallmentStatus(history) !== transition.from) {
      continue;
    }

    const next = changeCommissionInstallmentStatus(
      history,
      transition.to,
      changedAt,
    );

    events.push(
      Object.freeze({
        installmentId,
        sequence: next.length,
        entry: next[next.length - 1],
      }),
    );
  }

  return Object.freeze(events);
}
