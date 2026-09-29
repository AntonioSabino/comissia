import { describe, expect, it } from "vitest";
import type { CommissionInstallmentStatus } from "@/modules/commissions";
import type { AdminCommissionInstallment } from "./admin-commission-repository";
import { buildPayoutClosing, resolvePayoutCompetence } from "./payout-closing";

let sequence = 0;

function installment(
  sellerName: string,
  status: CommissionInstallmentStatus,
  amountInCents: number,
  dueOn = "2026-08-07",
): AdminCommissionInstallment {
  sequence += 1;

  return {
    id: `installment-${sequence}`,
    competence: "2026-08",
    dueOn,
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

describe("buildPayoutClosing", () => {
  it("separa o que falta pagar, o que foi pago e o que fica fora do fechamento", () => {
    const closing = buildPayoutClosing([
      installment("Marina", "prevista", 10_000),
      installment("Marina", "programada", 20_000),
      installment("Marina", "paga", 30_000),
      installment("Marina", "cancelada", 40_000),
      installment("Marina", "ajustada", 50_000),
    ]);

    expect(closing.toPayInCents).toBe(BigInt(30_000));
    expect(closing.scheduledInCents).toBe(BigInt(20_000));
    expect(closing.paidInCents).toBe(BigInt(30_000));
    expect(closing.totalInCents).toBe(BigInt(60_000));
    expect(closing.outsideInCents).toBe(BigInt(90_000));
    expect(closing.closingInstallments).toBe(3);
    expect(closing.plannedInstallments).toBe(1);
    expect(closing.stage).toBe("em-conferencia");
  });

  it("agrupa por vendedor em ordem alfabética, com a etapa de cada um", () => {
    const closing = buildPayoutClosing([
      installment("Rafael", "programada", 1_000),
      installment("Ana", "paga", 2_000),
      installment("Rafael", "paga", 3_000),
      installment("Bianca", "cancelada", 4_000),
    ]);

    expect(
      closing.sellers.map((seller) => [
        seller.sellerName,
        seller.stage,
        seller.toPayInCents,
      ]),
    ).toEqual([
      ["Ana", "pago", BigInt(0)],
      ["Bianca", "vazio", BigInt(0)],
      ["Rafael", "programado", BigInt(1_000)],
    ]);
    expect(closing.stage).toBe("programado");
  });

  it("fecha com a soma dos vendedores", () => {
    const closing = buildPayoutClosing([
      installment("Rafael", "prevista", 12_345),
      installment("Ana", "programada", 67_890),
      installment("Ana", "prevista", 1),
    ]);

    const sellersTotal = closing.sellers.reduce(
      (total, seller) => total + seller.toPayInCents,
      BigInt(0),
    );

    expect(sellersTotal).toBe(closing.toPayInCents);
    expect(closing.toPayInCents).toBe(BigInt(80_236));
  });

  it("conta a parcela programada de zero centavo como pagável", () => {
    const closing = buildPayoutClosing([
      installment("Ana", "programada", 0),
      installment("Ana", "paga", 0),
    ]);

    expect(closing.sellers[0].scheduledInCents).toBe(BigInt(0));
    expect(closing.sellers[0].scheduledInstallments).toBe(1);
    expect(closing.sellers[0].stage).toBe("programado");
  });

  it("ordena as parcelas do vendedor pela previsão", () => {
    const closing = buildPayoutClosing([
      installment("Ana", "prevista", 1, "2026-08-20"),
      installment("Ana", "prevista", 1, "2026-08-05"),
    ]);

    expect(closing.sellers[0].installments.map((item) => item.dueOn)).toEqual([
      "2026-08-05",
      "2026-08-20",
    ]);
  });

  it("devolve um fechamento vazio sem parcelas", () => {
    expect(buildPayoutClosing([])).toEqual({
      stage: "vazio",
      closingInstallments: 0,
      plannedInstallments: 0,
      sellers: [],
      toPayInCents: BigInt(0),
      scheduledInCents: BigInt(0),
      paidInCents: BigInt(0),
      totalInCents: BigInt(0),
      outsideInCents: BigInt(0),
    });
  });
});

describe("resolvePayoutCompetence", () => {
  it("respeita a competência pedida", () => {
    expect(resolvePayoutCompetence("2026-05", "2026-09-28")).toBe("2026-05");
  });

  it.each([undefined, "2026-13", "maio", ["2026-05", "2026-06"]])(
    "volta ao mês corrente quando recebe %s",
    (requested) => {
      expect(resolvePayoutCompetence(requested, "2026-09-28")).toBe("2026-09");
    },
  );
});
