import { describe, expect, it } from "vitest";
import { SellerCommissionInstallmentAllocationError } from "./allocate-seller-commission-installments";
import { CommissionInstallmentScheduleError } from "./commission-installment-schedule";
import { currentCommissionInstallmentStatus } from "./commission-installment-status";
import { generateSellerCommissionInstallments } from "./generate-seller-commission-installments";

const CREATED_AT = new Date("2026-09-12T15:30:00.000Z");

describe("generateSellerCommissionInstallments", () => {
  it("compõe percentuais, valores, datas, numeração e situação inicial", () => {
    const installments = generateSellerCommissionInstallments({
      creditAmountInCents: BigInt("20000000"),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: [15, 15, 20, 20, 25, 25, 30, 50],
      firstInstallmentDueOn: "2026-01-31",
      createdAt: CREATED_AT,
    });

    expect(
      installments.map(
        ({
          displayNumber,
          rateBasisPoints,
          amountInCents,
          competence,
          dueOn,
        }) => ({
          displayNumber,
          rateBasisPoints,
          amountInCents,
          competence,
          dueOn,
        }),
      ),
    ).toEqual([
      {
        displayNumber: "1/8",
        rateBasisPoints: 15,
        amountInCents: BigInt("30000"),
        competence: "2026-01",
        dueOn: "2026-01-31",
      },
      {
        displayNumber: "2/8",
        rateBasisPoints: 15,
        amountInCents: BigInt("30000"),
        competence: "2026-02",
        dueOn: "2026-02-28",
      },
      {
        displayNumber: "3/8",
        rateBasisPoints: 20,
        amountInCents: BigInt("40000"),
        competence: "2026-03",
        dueOn: "2026-03-31",
      },
      {
        displayNumber: "4/8",
        rateBasisPoints: 20,
        amountInCents: BigInt("40000"),
        competence: "2026-04",
        dueOn: "2026-04-30",
      },
      {
        displayNumber: "5/8",
        rateBasisPoints: 25,
        amountInCents: BigInt("50000"),
        competence: "2026-05",
        dueOn: "2026-05-31",
      },
      {
        displayNumber: "6/8",
        rateBasisPoints: 25,
        amountInCents: BigInt("50000"),
        competence: "2026-06",
        dueOn: "2026-06-30",
      },
      {
        displayNumber: "7/8",
        rateBasisPoints: 30,
        amountInCents: BigInt("60000"),
        competence: "2026-07",
        dueOn: "2026-07-31",
      },
      {
        displayNumber: "8/8",
        rateBasisPoints: 50,
        amountInCents: BigInt("100000"),
        competence: "2026-08",
        dueOn: "2026-08-31",
      },
    ]);
    expect(
      installments.every(
        ({ statusHistory }) =>
          currentCommissionInstallmentStatus(statusHistory) === "prevista",
      ),
    ).toBe(true);
  });

  it("preserva o total e mantém o resíduo somente na última parcela", () => {
    const installments = generateSellerCommissionInstallments({
      creditAmountInCents: BigInt(1_001),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: [67, 67, 66],
      firstInstallmentDueOn: "2026-10-05",
      createdAt: CREATED_AT,
    });

    expect(installments.map(({ amountInCents }) => amountInCents)).toEqual([
      BigInt(6),
      BigInt(6),
      BigInt(8),
    ]);
    expect(
      installments.reduce(
        (total, installment) => total + installment.amountInCents,
        BigInt(0),
      ),
    ).toBe(BigInt(20));
  });

  it("preserva a ordem recebida sem alterar os percentuais", () => {
    const rates = [50, 25, 125];
    const installments = generateSellerCommissionInstallments({
      creditAmountInCents: BigInt(10_000),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: rates,
      firstInstallmentDueOn: "2026-10-05",
      createdAt: CREATED_AT,
    });

    expect(installments.map(({ rateBasisPoints }) => rateBasisPoints)).toEqual(
      rates,
    );
    expect(rates).toEqual([50, 25, 125]);
  });

  it("devolve a estrutura completa congelada", () => {
    const installments = generateSellerCommissionInstallments({
      creditAmountInCents: BigInt(10_000),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: [100, 100],
      firstInstallmentDueOn: "2026-10-05",
      createdAt: CREATED_AT,
    });

    expect(Object.isFrozen(installments)).toBe(true);
    expect(installments.every(Object.isFrozen)).toBe(true);
    expect(
      installments.every(
        ({ statusHistory }) =>
          Object.isFrozen(statusHistory) &&
          statusHistory.every(Object.isFrozen),
      ),
    ).toBe(true);
  });

  it("propaga a validação da distribuição financeira", () => {
    expect(() =>
      generateSellerCommissionInstallments({
        creditAmountInCents: BigInt(10_000),
        sellerRateBasisPoints: 200,
        installmentRatesBasisPoints: [50, 100],
        firstInstallmentDueOn: "2026-10-05",
        createdAt: CREATED_AT,
      }),
    ).toThrow(SellerCommissionInstallmentAllocationError);
  });

  it("propaga a validação da agenda", () => {
    expect(() =>
      generateSellerCommissionInstallments({
        creditAmountInCents: BigInt(10_000),
        sellerRateBasisPoints: 200,
        installmentRatesBasisPoints: [200],
        firstInstallmentDueOn: "2026-02-30",
        createdAt: CREATED_AT,
      }),
    ).toThrow(CommissionInstallmentScheduleError);
  });
});
