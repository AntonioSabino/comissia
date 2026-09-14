import { describe, expect, it } from "vitest";
import type {
  SellerSaleInstallment,
  SellerSaleListItem,
} from "./seller-commission-repository";
import { summarizeSellerSales } from "./seller-summary";

function installment(
  number: number,
  competence: string,
  amountInCents: bigint,
): SellerSaleInstallment {
  return {
    id: `installment-${competence}-${number}`,
    number,
    competence,
    dueOn: `${competence}-10`,
    amountInCents,
    status: "prevista",
  };
}

function sale(
  code: string,
  creditAmountInCents: bigint,
  sellerRateBasisPoints: number,
  installments: SellerSaleInstallment[],
): SellerSaleListItem {
  return {
    id: `sale-${code}`,
    code,
    soldOn: "2026-03-12",
    customerName: "Cliente",
    product: "Imóvel",
    groupCode: "0412",
    quotaCode: "031",
    creditAmountInCents,
    quotaStatus: "adimplente",
    administratorId: "administrator",
    administratorName: "Administradora",
    sellerRateBasisPoints,
    firstInstallmentDueOn: "2026-04-10",
    installments,
  };
}

describe("seller summary", () => {
  it("devolve um resumo zerado quando não há vendas", () => {
    expect(summarizeSellerSales([])).toEqual({
      sales: 0,
      creditInCents: BigInt(0),
      commissionInCents: BigInt(0),
      installmentsInCents: BigInt(0),
      months: [],
    });
  });

  it("soma crédito, comissão e parcelas das vendas recebidas", () => {
    const summary = summarizeSellerSales([
      // 120.000,00 a 3% = 3.600,00, em duas parcelas de 1.800,00.
      sale("V-1", BigInt(12_000_000), 300, [
        installment(1, "2026-04", BigInt(180_000)),
        installment(2, "2026-05", BigInt(180_000)),
      ]),
      // 80.000,00 a 2,5% = 2.000,00, em uma parcela.
      sale("V-2", BigInt(8_000_000), 250, [
        installment(1, "2026-05", BigInt(200_000)),
      ]),
    ]);

    expect(summary.sales).toBe(2);
    expect(summary.creditInCents).toBe(BigInt(20_000_000));
    expect(summary.commissionInCents).toBe(BigInt(560_000));
    expect(summary.installmentsInCents).toBe(BigInt(560_000));
  });

  it("agrupa as parcelas por competência, da mais antiga para a mais recente", () => {
    const summary = summarizeSellerSales([
      sale("V-2", BigInt(8_000_000), 250, [
        installment(1, "2026-05", BigInt(200_000)),
      ]),
      sale("V-1", BigInt(12_000_000), 300, [
        installment(1, "2026-04", BigInt(180_000)),
        installment(2, "2026-05", BigInt(180_000)),
      ]),
    ]);

    expect(summary.months).toEqual([
      {
        competence: "2026-04",
        installments: 1,
        totalInCents: BigInt(180_000),
      },
      {
        competence: "2026-05",
        installments: 2,
        totalInCents: BigInt(380_000),
      },
    ]);
  });

  it("conta a comissão da venda sem parcelas, que a soma delas não alcança", () => {
    // Venda registrada antes de a régua existir: o percentual gravado continua
    // definindo a comissão, mesmo sem parcelas para distribuí-la.
    const summary = summarizeSellerSales([
      sale("V-3", BigInt(4_500_000), 200, []),
    ]);

    expect(summary.commissionInCents).toBe(BigInt(90_000));
    expect(summary.installmentsInCents).toBe(BigInt(0));
    expect(summary.months).toEqual([]);
  });

  it("mantém a comissão e a soma das parcelas separadas quando divergem", () => {
    const summary = summarizeSellerSales([
      sale("V-4", BigInt(10_000_000), 300, [
        installment(1, "2026-06", BigInt(100_000)),
      ]),
    ]);

    expect(summary.commissionInCents).toBe(BigInt(300_000));
    expect(summary.installmentsInCents).toBe(BigInt(100_000));
  });

  it("soma em centavos inteiros, sem perder exatidão em valores altos", () => {
    const summary = summarizeSellerSales([
      sale("V-5", BigInt("900000000000000000"), 10_000, []),
      sale("V-6", BigInt("900000000000000000"), 10_000, []),
    ]);

    expect(summary.creditInCents).toBe(BigInt("1800000000000000000"));
    expect(summary.commissionInCents).toBe(BigInt("1800000000000000000"));
  });
});
