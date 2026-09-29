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
  /** Valor do fechamento: o que falta pagar mais o que já foi pago. */
  totalInCents: bigint;
  /** Canceladas e ajustadas, que aparecem na composição sem entrar no valor. */
  outsideInCents: bigint;
};

export type SellerPayout<
  Installment extends AdminCommissionInstallment = AdminCommissionInstallment,
> = PayoutAmounts & {
  sellerId: string;
  sellerName: string;
  stage: PayoutStage;
  /** Parcelas que compõem o fechamento do vendedor. */
  closingInstallments: number;
  /**
   * Parcelas programadas, que o pagamento vai quitar. A tela decide pela
   * quantidade, e não pelo valor: uma parcela de zero centavo também precisa
   * ser paga para o fechamento terminar.
   */
  scheduledInstallments: number;
  installments: Installment[];
};

export type PayoutClosing<
  Installment extends AdminCommissionInstallment = AdminCommissionInstallment,
> = PayoutAmounts & {
  stage: PayoutStage;
  closingInstallments: number;
  /** Parcelas previstas que a conferência vai programar. */
  plannedInstallments: number;
  sellers: SellerPayout<Installment>[];
};

function amountsOf(
  installments: readonly AdminCommissionInstallment[],
): PayoutAmounts {
  const toPayInCents = sumInstallmentAmounts(
    installments.filter(
      (installment) =>
        installment.status === "prevista" ||
        installment.status === "programada",
    ),
  );
  const paidInCents = sumInstallmentAmounts(
    installments.filter((installment) => installment.status === "paga"),
  );

  return {
    toPayInCents,
    totalInCents: toPayInCents + paidInCents,
    scheduledInCents: sumInstallmentAmounts(
      installments.filter((installment) => installment.status === "programada"),
    ),
    paidInCents,
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
 * É genérico para que o demonstrativo, que lê parcelas mais detalhadas, some
 * exatamente como a tela de repasses.
 */
export function buildPayoutClosing<
  Installment extends AdminCommissionInstallment,
>(installments: readonly Installment[]): PayoutClosing<Installment> {
  const bySeller = new Map<string, Installment[]>();

  for (const installment of installments) {
    const list = bySeller.get(installment.sellerId) ?? [];
    list.push(installment);
    bySeller.set(installment.sellerId, list);
  }

  const sellers = [...bySeller.values()]
    .map((list): SellerPayout<Installment> => {
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
        scheduledInstallments: sorted.filter(
          (installment) => installment.status === "programada",
        ).length,
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
