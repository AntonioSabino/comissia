import { describe, expect, it } from "vitest";
import type { CommissionInstallmentStatus } from "@/modules/commissions";
import type { StatementInstallment } from "./commission-statement-repository";
import { buildSellerPaymentHistory } from "./seller-payment-history";

const TODAY = "2026-09-28";

let sequence = 0;

function installment(
  competence: string,
  status: CommissionInstallmentStatus,
  amountInCents: number,
  statusChangedAt = `${competence}-05T15:00:00.000Z`,
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
    statusChangedAt,
  };
}

const toDate = (instant: string) => instant.slice(0, 10);

describe("buildSellerPaymentHistory", () => {
  it("resume cada mês com os totais do fechamento, do mais recente ao mais antigo", () => {
    const history = buildSellerPaymentHistory(
      [
        installment("2026-07", "paga", 10_000, "2026-07-07T14:00:00.000Z"),
        installment("2026-07", "paga", 5_000, "2026-07-08T14:00:00.000Z"),
        installment("2026-08", "programada", 20_000),
        installment("2026-08", "cancelada", 7_000),
        installment("2026-09", "prevista", 30_000),
      ],
      TODAY,
      toDate,
    );

    expect(history.months).toMatchObject([
      {
        competence: "2026-09",
        stage: "em-conferencia",
        closingInstallments: 1,
        amountInCents: BigInt(30_000),
        toPayInCents: BigInt(30_000),
        paidInCents: BigInt(0),
        paidOn: null,
      },
      {
        competence: "2026-08",
        stage: "programado",
        closingInstallments: 1,
        amountInCents: BigInt(20_000),
        toPayInCents: BigInt(20_000),
        paidInCents: BigInt(0),
        paidOn: null,
      },
      {
        competence: "2026-07",
        stage: "pago",
        closingInstallments: 2,
        amountInCents: BigInt(15_000),
        toPayInCents: BigInt(0),
        paidInCents: BigInt(15_000),
        paidOn: "2026-07-08",
      },
    ]);
    expect(history.outsideInstallments).toBe(1);
  });

  it("descreve o mês como o vendedor o lê", () => {
    const history = buildSellerPaymentHistory(
      [
        installment("2026-06", "paga", 1_000),
        installment("2026-07", "programada", 1_000),
        installment("2026-08", "paga", 1_000),
        installment("2026-08", "prevista", 1_000),
        installment("2026-09", "prevista", 1_000),
        installment("2026-05", "prevista", 1_000),
        installment("2026-11", "prevista", 1_000),
        installment("2026-12", "cancelada", 1_000),
      ],
      TODAY,
      toDate,
    );

    expect(
      history.timeline.map((month) => [month.competence, month.status]),
    ).toEqual([
      ["2026-05", "aguardando-fechamento"],
      ["2026-06", "pago"],
      ["2026-07", "programado"],
      ["2026-08", "em-fechamento"],
      ["2026-09", "previsto"],
      ["2026-11", "previsto"],
      ["2026-12", "sem-valor"],
    ]);
  });

  it("traz todos os meses na linha do tempo e soma o que ainda vai receber", () => {
    const history = buildSellerPaymentHistory(
      [
        installment("2026-12", "prevista", 5_000),
        installment("2026-07", "paga", 1_000),
        installment("2026-08", "programada", 2_000),
        installment("2026-08", "ajustada", 9_000),
      ],
      TODAY,
      toDate,
    );

    expect(history.timeline.map((month) => month.competence)).toEqual([
      "2026-07",
      "2026-08",
      "2026-12",
    ]);
    expect(history.pendingInCents).toBe(BigInt(7_000));
    expect(history.timeline.map((month) => month.pendingInstallments)).toEqual([
      0, 1, 1,
    ]);
    expect(history.timeline[1].outsideInstallments).toBe(1);
    expect(history.timeline[1].installments).toHaveLength(2);
  });

  it("conta como pendente o mês com parcela de zero centavo", () => {
    const history = buildSellerPaymentHistory(
      [installment("2026-10", "prevista", 0)],
      TODAY,
      toDate,
    );

    expect(history.pendingInCents).toBe(BigInt(0));
    expect(history.timeline[0].pendingInstallments).toBe(1);
  });

  it("mostra o futuro só quando o mês já foi conferido ou pago", () => {
    const history = buildSellerPaymentHistory(
      [
        installment("2026-10", "programada", 1_000),
        installment("2026-11", "prevista", 1_000),
      ],
      TODAY,
      toDate,
    );

    expect(history.months.map((month) => month.competence)).toEqual([
      "2026-10",
    ]);
  });

  it("aponta o último pagamento e o fechamento pendente mais antigo", () => {
    const history = buildSellerPaymentHistory(
      [
        installment("2026-05", "paga", 1_000),
        installment("2026-06", "paga", 2_000),
        installment("2026-07", "prevista", 3_000),
        installment("2026-08", "programada", 4_000),
        installment("2026-12", "prevista", 5_000),
      ],
      TODAY,
      toDate,
    );

    expect(history.lastPayment?.competence).toBe("2026-06");
    expect(history.nextPayment?.competence).toBe("2026-07");
  });

  it("aponta como último o pagamento registrado por último, não a competência mais nova", () => {
    const history = buildSellerPaymentHistory(
      [
        installment("2026-08", "paga", 8_000, "2026-08-07T14:00:00.000Z"),
        installment("2026-06", "paga", 6_000, "2026-09-02T14:00:00.000Z"),
      ],
      TODAY,
      toDate,
    );

    expect(history.lastPayment?.competence).toBe("2026-06");
    expect(history.lastPayment?.paidOn).toBe("2026-09-02");
  });

  it("não aponta como próximo pagamento um mês futuro só previsto", () => {
    const history = buildSellerPaymentHistory(
      [
        installment("2026-08", "paga", 1_000),
        installment("2026-12", "prevista", 5_000),
      ],
      TODAY,
      toDate,
    );

    expect(history.nextPayment).toBeNull();
  });

  it("soma o pago no ano corrente, e só ele", () => {
    const history = buildSellerPaymentHistory(
      [
        installment("2025-12", "paga", 9_999),
        installment("2026-01", "paga", 1_000),
        installment("2026-02", "paga", 2_345),
        installment("2026-03", "programada", 7_000),
      ],
      TODAY,
      toDate,
    );

    expect(history.paidThisYearInCents).toBe(BigInt(3_345));
  });

  it("conta um pagamento de zero centavo como pagamento", () => {
    const history = buildSellerPaymentHistory(
      [installment("2026-08", "paga", 0)],
      TODAY,
      toDate,
    );

    expect(history.lastPayment?.competence).toBe("2026-08");
    expect(history.months[0].stage).toBe("pago");
  });

  it("devolve um histórico vazio sem parcelas", () => {
    expect(buildSellerPaymentHistory([], TODAY, toDate)).toEqual({
      months: [],
      paidThisYearInCents: BigInt(0),
      timeline: [],
      pendingInCents: BigInt(0),
      lastPayment: null,
      nextPayment: null,
      outsideInstallments: 0,
    });
  });
});
