import {
  isInPayoutClosing,
  payoutStageOf,
  type PayoutStage,
} from "@/modules/commissions";
import type { AdminCommissionInstallment } from "./admin-commission-repository";
import { sumInstallmentAmounts } from "./installment-totals";
import { competenceOf, isCompetence } from "./monthly-commission-forecast";

export type PayoutAmounts = {
  /** Previstas e programadas: o que ainda sai do caixa. */
  toPayInCents: bigint;
  /** Programadas: o que o registro de pagamento vai quitar. */
  scheduledInCents: bigint;
  paidInCents: bigint;
  /** Canceladas e ajustadas, que aparecem na composição sem entrar no valor. */
  outsideInCents: bigint;
};

export type SellerPayout = PayoutAmounts & {
  sellerId: string;
  sellerName: string;
  stage: PayoutStage;
  /** Parcelas que compõem o fechamento do vendedor. */
  closingInstallments: number;
  installments: AdminCommissionInstallment[];
};

export type PayoutClosing = PayoutAmounts & {
  stage: PayoutStage;
  closingInstallments: number;
  /** Parcelas previstas que a conferência vai programar. */
  plannedInstallments: number;
  sellers: SellerPayout[];
};

function amountsOf(
  installments: readonly AdminCommissionInstallment[],
): PayoutAmounts {
  return {
    toPayInCents: sumInstallmentAmounts(
      installments.filter(
        (installment) =>
          installment.status === "prevista" ||
          installment.status === "programada",
      ),
    ),
    scheduledInCents: sumInstallmentAmounts(
      installments.filter((installment) => installment.status === "programada"),
    ),
    paidInCents: sumInstallmentAmounts(
      installments.filter((installment) => installment.status === "paga"),
    ),
    outsideInCents: sumInstallmentAmounts(
      installments.filter(
        (installment) => !isInPayoutClosing(installment.status),
      ),
    ),
  };
}

function countClosing(
  installments: readonly AdminCommissionInstallment[],
): number {
  return installments.filter((installment) =>
    isInPayoutClosing(installment.status),
  ).length;
}

/**
 * Monta o fechamento de uma competência a partir das parcelas dela: os totais
 * do mês e a composição por vendedor, em ordem alfabética. A soma é sempre em
 * centavos inteiros, e o total do mês é a soma dos vendedores por construção.
 */
export function buildPayoutClosing(
  installments: readonly AdminCommissionInstallment[],
): PayoutClosing {
  const bySeller = new Map<string, AdminCommissionInstallment[]>();

  for (const installment of installments) {
    const list = bySeller.get(installment.sellerId) ?? [];
    list.push(installment);
    bySeller.set(installment.sellerId, list);
  }

  const sellers = [...bySeller.values()]
    .map((list): SellerPayout => {
      const sorted = [...list].sort(
        (first, second) =>
          first.dueOn.localeCompare(second.dueOn) ||
          first.saleCode.localeCompare(second.saleCode) ||
          first.number - second.number,
      );

      return {
        sellerId: sorted[0].sellerId,
        sellerName: sorted[0].sellerName,
        stage: payoutStageOf(sorted.map((installment) => installment.status)),
        closingInstallments: countClosing(sorted),
        installments: sorted,
        ...amountsOf(sorted),
      };
    })
    .sort(
      (first, second) =>
        first.sellerName.localeCompare(second.sellerName, "pt-BR") ||
        first.sellerId.localeCompare(second.sellerId),
    );

  return {
    stage: payoutStageOf(installments.map((installment) => installment.status)),
    closingInstallments: countClosing(installments),
    plannedInstallments: installments.filter(
      (installment) => installment.status === "prevista",
    ).length,
    sellers,
    ...amountsOf(installments),
  };
}

/**
 * Competência do fechamento: a pedida pela URL, quando válida; senão a do mês
 * corrente, que é o fechamento que a administração costuma estar fazendo.
 */
export function resolvePayoutCompetence(
  requested: string | string[] | undefined,
  today: string,
): string {
  return typeof requested === "string" && isCompetence(requested)
    ? requested
    : competenceOf(today);
}
