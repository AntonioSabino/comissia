import { describe, expect, it } from "vitest";
import type { CommissionInstallmentStatus } from "@/modules/commissions";
import type { StatementInstallment } from "./commission-statement-repository";
import { buildSellerSummaryOverview } from "./seller-summary-overview";

const TODAY = "2026-09-28";

let sequence = 0;

function installment(
  competence: string,
  status: CommissionInstallmentStatus,
  amountInCents: number,
  overrides: Partial<StatementInstallment> = {},
): StatementInstallment {
  sequence += 1;

  return {
    id: `installment-${sequence}`,
    competence,
    dueOn: `${competence}-07`,
    number: 1,
    saleInstallments: 4,
    amountInCents: BigInt(amountInCents),
    status,
    saleId: `sale-${sequence}`,
    saleCode: `V-${String(sequence).padStart(6, "0")}`,
    sellerId: "seller",
    sellerName: "Marina",
    customerName: "Cliente",
    administratorName: "Administradora",
    product: "Imóvel",
    groupCode: "G1",
    quotaCode: "10",
    statusChangedAt: `${competence}-05T15:00:00.000Z`,
    ...overrides,
  };
}

const toDate = (instant: string) => instant.slice(0, 10);

describe("buildSellerSummaryOverview", () => {
  it("devolve zeros e nenhum pagamento quando não há parcelas", () => {
    const overview = buildSellerSummaryOverview([], TODAY, toDate);

    expect(overview).toEqual({
      hasInstallments: false,
      nextPayment: null,
      currentMonth: {
        competence: "2026-09",
        totalInCents: BigInt(0),
        closingInstallments: 0,
        installments: [],
      },
      scheduled: {
        amountInCents: BigInt(0),
        installments: 0,
        firstDueOn: null,
      },
      lastPayment: null,
      upcoming: { amountInCents: BigInt(0), installments: 0, competences: 0 },
    });
  });

  it("soma o mês corrente com prevista, programada e paga, em ordem de previsão", () => {
    const paid = installment("2026-09", "paga", 10_000, {
      dueOn: "2026-09-03",
      statusChangedAt: "2026-09-10T14:00:00.000Z",
    });
    const scheduled = installment("2026-09", "programada", 20_050, {
      dueOn: "2026-09-12",
    });
    const planned = installment("2026-09", "prevista", 30_000, {
      dueOn: "2026-09-07",
    });

    const overview = buildSellerSummaryOverview(
      [scheduled, planned, paid],
      TODAY,
      toDate,
    );

    expect(overview.currentMonth.totalInCents).toBe(BigInt(60_050));
    expect(overview.currentMonth.closingInstallments).toBe(3);
    expect(overview.currentMonth.installments).toEqual([
      paid,
      planned,
      scheduled,
    ]);
    expect(overview.nextPayment).toEqual({
      competence: "2026-09",
      status: "em-fechamento",
      toPayInCents: BigInt(50_050),
      pendingInstallments: 2,
      dueOn: "2026-09-07",
    });
    expect(overview.scheduled).toEqual({
      amountInCents: BigInt(20_050),
      installments: 1,
      firstDueOn: "2026-09-12",
    });
    expect(overview.lastPayment).toEqual({
      competence: "2026-09",
      paidInCents: BigInt(10_000),
      paidOn: "2026-09-10",
    });
  });

  it("deixa canceladas e ajustadas na lista do mês, mas fora de todas as somas", () => {
    const overview = buildSellerSummaryOverview(
      [
        installment("2026-09", "prevista", 5_000),
        installment("2026-09", "cancelada", 7_000),
        installment("2026-09", "ajustada", 9_000),
        installment("2026-11", "cancelada", 4_000),
      ],
      TODAY,
      toDate,
    );

    expect(overview.currentMonth.installments).toHaveLength(3);
    expect(overview.currentMonth.totalInCents).toBe(BigInt(5_000));
    expect(overview.currentMonth.closingInstallments).toBe(1);
    expect(overview.nextPayment?.toPayInCents).toBe(BigInt(5_000));
    expect(overview.upcoming).toEqual({
      amountInCents: BigInt(0),
      installments: 0,
      competences: 0,
    });
  });

  it("soma os meses futuros sem transformá-los em próximo pagamento", () => {
    const overview = buildSellerSummaryOverview(
      [
        installment("2026-08", "paga", 12_000),
        installment("2026-10", "prevista", 30_000),
        installment("2026-11", "prevista", 30_000),
        installment("2026-11", "prevista", 15_033),
      ],
      TODAY,
      toDate,
    );

    expect(overview.nextPayment).toBeNull();
    expect(overview.upcoming).toEqual({
      amountInCents: BigInt(75_033),
      installments: 3,
      competences: 2,
    });
    expect(overview.currentMonth.totalInCents).toBe(BigInt(0));
  });

  it("aponta como próximo o fechamento pendente mais antigo, inclusive futuro já conferido", () => {
    const late = buildSellerSummaryOverview(
      [
        installment("2026-07", "prevista", 1_000),
        installment("2026-09", "programada", 2_000),
      ],
      TODAY,
      toDate,
    );

    expect(late.nextPayment?.competence).toBe("2026-07");

    const reviewedAhead = buildSellerSummaryOverview(
      [
        installment("2026-08", "paga", 1_000),
        installment("2026-10", "programada", 2_000),
        installment("2026-10", "prevista", 500),
      ],
      TODAY,
      toDate,
    );

    expect(reviewedAhead.nextPayment).toMatchObject({
      competence: "2026-10",
      toPayInCents: BigInt(2_500),
    });
    expect(reviewedAhead.upcoming.amountInCents).toBe(BigInt(2_500));
    expect(reviewedAhead.scheduled.amountInCents).toBe(BigInt(2_000));
  });

  it("usa o pagamento registrado por último, mesmo de competência mais antiga", () => {
    const overview = buildSellerSummaryOverview(
      [
        installment("2026-08", "paga", 8_000, {
          statusChangedAt: "2026-08-07T14:00:00.000Z",
        }),
        installment("2026-07", "paga", 3_000, {
          statusChangedAt: "2026-09-02T02:30:00.000Z",
        }),
        installment("2026-07", "paga", 4_000, {
          statusChangedAt: "2026-09-01T14:00:00.000Z",
        }),
      ],
      TODAY,
      (instant) =>
        instant.startsWith("2026-09-02T02") ? "2026-09-01" : toDate(instant),
    );

    expect(overview.lastPayment).toEqual({
      competence: "2026-07",
      paidInCents: BigInt(7_000),
      paidOn: "2026-09-01",
    });
  });

  it("conta pagamento e programação de valor zero", () => {
    const overview = buildSellerSummaryOverview(
      [
        installment("2026-08", "paga", 0, {
          statusChangedAt: "2026-08-07T14:00:00.000Z",
        }),
        installment("2026-09", "programada", 0),
      ],
      TODAY,
      toDate,
    );

    expect(overview.lastPayment).toEqual({
      competence: "2026-08",
      paidInCents: BigInt(0),
      paidOn: "2026-08-07",
    });
    expect(overview.scheduled).toEqual({
      amountInCents: BigInt(0),
      installments: 1,
      firstDueOn: "2026-09-07",
    });
    expect(overview.nextPayment).toMatchObject({
      competence: "2026-09",
      status: "programado",
      toPayInCents: BigInt(0),
      pendingInstallments: 1,
    });
  });

  it("descreve o mês passado sem fechamento como aguardando, igual a Pagamentos", () => {
    const overview = buildSellerSummaryOverview(
      [installment("2026-07", "prevista", 3_000)],
      TODAY,
      toDate,
    );

    expect(overview.nextPayment).toMatchObject({
      competence: "2026-07",
      status: "aguardando-fechamento",
      toPayInCents: BigInt(3_000),
    });
  });
});
