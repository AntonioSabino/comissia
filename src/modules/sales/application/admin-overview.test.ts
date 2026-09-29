import { describe, expect, it } from "vitest";
import type { CommissionInstallmentStatus } from "@/modules/commissions";
import type { AdminCommissionInstallment } from "./admin-commission-repository";
import { buildAdminOverview, soldPeriodOf } from "./admin-overview";
import type { SaleListItem } from "./sale-repository";

let sequence = 0;

function sale(
  sellerName: string,
  administratorName: string,
  creditInReais: number,
): SaleListItem {
  sequence += 1;

  return {
    id: `sale-${sequence}`,
    code: `V-${String(sequence).padStart(6, "0")}`,
    soldOn: "2026-09-10",
    sellerId: `seller-${sellerName}`,
    sellerName,
    administratorId: `administrator-${administratorName}`,
    administratorName,
    customerName: "Cliente",
    groupCode: "G1",
    quotaCode: "10",
    creditAmountInCents: BigInt(creditInReais) * BigInt(100),
    quotaStatus: "adimplente",
  };
}

function installment(
  sellerName: string,
  status: CommissionInstallmentStatus,
  amountInCents: number,
): AdminCommissionInstallment {
  sequence += 1;

  return {
    id: `installment-${sequence}`,
    competence: "2026-09",
    dueOn: "2026-09-07",
    number: 1,
    saleInstallments: 4,
    amountInCents: BigInt(amountInCents),
    status,
    saleId: `sale-${sequence}`,
    saleCode: `V-${String(sequence).padStart(6, "0")}`,
    sellerId: `seller-${sellerName}`,
    sellerName,
  };
}

describe("soldPeriodOf", () => {
  it("vai do primeiro ao último dia do mês", () => {
    expect(soldPeriodOf("2026-09")).toEqual({
      soldFrom: "2026-09-01",
      soldTo: "2026-09-30",
    });
  });

  it("conhece fevereiro, inclusive em ano bissexto", () => {
    expect(soldPeriodOf("2026-02").soldTo).toBe("2026-02-28");
    expect(soldPeriodOf("2028-02").soldTo).toBe("2028-02-29");
  });

  it("segue a regra gregoriana do bissexto em qualquer ano aceito", () => {
    expect(soldPeriodOf("0000-02").soldTo).toBe("0000-02-29");
    expect(soldPeriodOf("0099-02").soldTo).toBe("0099-02-28");
    expect(soldPeriodOf("1900-02").soldTo).toBe("1900-02-28");
    expect(soldPeriodOf("2000-02").soldTo).toBe("2000-02-29");
  });

  it("fecha dezembro em 31", () => {
    expect(soldPeriodOf("2026-12").soldTo).toBe("2026-12-31");
  });
});

describe("buildAdminOverview", () => {
  it("soma a produção do mês e ordena o ranking pelo crédito", () => {
    const overview = buildAdminOverview(
      [
        sale("Marina", "Porto", 100_000),
        sale("Rafael", "Itaú", 520_000),
        sale("Marina", "Itaú", 305_000),
        sale("Bianca", "Porto", 75_000),
      ],
      [],
    );

    expect(overview.sales).toBe(4);
    expect(overview.creditInCents).toBe(BigInt(100_000_000));
    expect(
      overview.ranking.map((seller) => [
        seller.sellerName,
        seller.sales,
        seller.creditInCents,
      ]),
    ).toEqual([
      ["Rafael", 1, BigInt(52_000_000)],
      ["Marina", 2, BigInt(40_500_000)],
      ["Bianca", 1, BigInt(7_500_000)],
    ]);
    expect(overview.otherSellers).toBe(0);
  });

  it("mostra só os cinco primeiros e conta os demais", () => {
    const overview = buildAdminOverview(
      ["A", "B", "C", "D", "E", "F", "G"].map((name, index) =>
        sale(name, "Porto", 1_000 * (index + 1)),
      ),
      [],
    );

    expect(overview.ranking.map((seller) => seller.sellerName)).toEqual([
      "G",
      "F",
      "E",
      "D",
      "C",
    ]);
    expect(overview.otherSellers).toBe(2);
  });

  it("desempata pelo nome", () => {
    const overview = buildAdminOverview(
      [sale("Carla", "Porto", 1_000), sale("Ana", "Porto", 1_000)],
      [],
    );

    expect(overview.ranking.map((seller) => seller.sellerName)).toEqual([
      "Ana",
      "Carla",
    ]);
  });

  it("dá a participação de cada administradora em pontos-base, arredondada para baixo", () => {
    const overview = buildAdminOverview(
      [
        sale("Marina", "Porto", 100),
        sale("Marina", "Itaú", 100),
        sale("Marina", "Itaú", 100),
      ],
      [],
    );

    expect(
      overview.administrators.map((administrator) => [
        administrator.administratorName,
        administrator.sales,
        administrator.shareBasisPoints,
      ]),
    ).toEqual([
      ["Itaú", 2, 6_666],
      ["Porto", 1, 3_333],
    ]);
  });

  it("usa o mesmo fechamento da tela de repasses", () => {
    const overview = buildAdminOverview(
      [],
      [
        installment("Marina", "programada", 20_000),
        installment("Rafael", "paga", 10_000),
        installment("Rafael", "cancelada", 5_000),
      ],
    );

    expect(overview.closing.toPayInCents).toBe(BigInt(20_000));
    expect(overview.closing.paidInCents).toBe(BigInt(10_000));
    expect(overview.closing.outsideInCents).toBe(BigInt(5_000));
    expect(overview.closing.sellers).toHaveLength(2);
    expect(overview.installments).toBe(3);
  });

  it("conta as parcelas de um mês só com canceladas e ajustadas", () => {
    const overview = buildAdminOverview(
      [],
      [
        installment("Marina", "cancelada", 5_000),
        installment("Marina", "ajustada", 2_000),
      ],
    );

    expect(overview.closing.closingInstallments).toBe(0);
    expect(overview.installments).toBe(2);
    expect(overview.closing.outsideInCents).toBe(BigInt(7_000));
  });

  it("devolve um mês vazio sem dividir por zero", () => {
    const overview = buildAdminOverview([], []);

    expect(overview.sales).toBe(0);
    expect(overview.creditInCents).toBe(BigInt(0));
    expect(overview.ranking).toEqual([]);
    expect(overview.administrators).toEqual([]);
    expect(overview.closing.stage).toBe("vazio");
  });
});
