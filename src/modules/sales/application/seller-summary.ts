import { calculateSellerCommissionTotal } from "@/modules/commissions";
import { sumInstallmentAmounts } from "./installment-totals";
import type { SellerSaleListItem } from "./seller-commission-repository";

export type SellerSummaryMonth = {
  /** Competência no formato AAAA-MM. */
  competence: string;
  installments: number;
  totalInCents: bigint;
};

export type SellerSummary = {
  sales: number;
  creditInCents: bigint;
  /**
   * Comissão pelo percentual gravado em cada venda, que é a regra do MVP.
   * Existe mesmo nas vendas que não têm parcelas geradas.
   */
  commissionInCents: bigint;
  /**
   * Soma das parcelas dessas mesmas vendas. Nasce igual à comissão por
   * construção; fica separada para que uma divergência apareça em vez de se
   * esconder atrás de um número só.
   */
  installmentsInCents: bigint;
  /**
   * Quantas vendas têm parcelas que não somam a própria comissão. Contadas uma
   * a uma de propósito: no total, uma venda a menos e outra a mais se anulam, e
   * as duas estariam erradas.
   */
  salesWithMismatch: number;
  /**
   * Quantas vendas não têm parcelas geradas. Elas fazem a soma das parcelas
   * ficar legitimamente abaixo da comissão, e sem isso o resumo acusaria
   * divergência onde não há.
   */
  salesWithoutInstallments: number;
  /** Competências dessas vendas, da mais antiga para a mais recente. */
  months: SellerSummaryMonth[];
};

/**
 * Resume as vendas já recortadas pelo período: quantas são, quanto de crédito
 * representam, quanto de comissão geram e como esse valor se distribui pelos
 * meses. Não filtra nada — quem decide o recorte é quem leu as vendas, e o
 * vendedor já entrou na consulta.
 */
export function summarizeSellerSales(
  sales: readonly SellerSaleListItem[],
): SellerSummary {
  const months = new Map<string, SellerSummaryMonth>();
  let creditInCents = BigInt(0);
  let commissionInCents = BigInt(0);
  let installmentsInCents = BigInt(0);
  let salesWithMismatch = 0;
  let salesWithoutInstallments = 0;

  for (const sale of sales) {
    const saleCommissionInCents = calculateSellerCommissionTotal({
      creditAmountInCents: sale.creditAmountInCents,
      sellerRateBasisPoints: sale.sellerRateBasisPoints,
    });
    const saleInstallmentsInCents = sumInstallmentAmounts(sale.installments);

    creditInCents += sale.creditAmountInCents;
    commissionInCents += saleCommissionInCents;
    installmentsInCents += saleInstallmentsInCents;

    if (sale.installments.length === 0) {
      // Venda anterior à régua: não ter parcelas é o que ela é, não um erro.
      salesWithoutInstallments += 1;
    } else if (saleInstallmentsInCents !== saleCommissionInCents) {
      salesWithMismatch += 1;
    }

    for (const installment of sale.installments) {
      const month = months.get(installment.competence) ?? {
        competence: installment.competence,
        installments: 0,
        totalInCents: BigInt(0),
      };

      month.installments += 1;
      month.totalInCents += installment.amountInCents;
      months.set(installment.competence, month);
    }
  }

  return {
    sales: sales.length,
    creditInCents,
    commissionInCents,
    installmentsInCents,
    salesWithMismatch,
    salesWithoutInstallments,
    months: [...months.values()].sort((first, second) =>
      first.competence.localeCompare(second.competence),
    ),
  };
}
