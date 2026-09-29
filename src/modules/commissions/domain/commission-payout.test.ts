import { describe, expect, it } from "vitest";
import {
  changeCommissionInstallmentStatus,
  CommissionInstallmentStatusError,
  createCommissionInstallmentStatusHistory,
} from "./commission-installment-status";
import {
  isInPayoutClosing,
  PAYOUT_PAYMENT,
  PAYOUT_REVIEW,
  payoutStageOf,
  planPayoutTransition,
} from "./commission-payout";

const CREATED_AT = new Date("2026-08-01T10:00:00.000Z");
const REVIEWED_AT = new Date("2026-08-03T12:00:00.000Z");
const PAID_AT = new Date("2026-08-07T15:00:00.000Z");

const planned = createCommissionInstallmentStatusHistory(CREATED_AT);
const scheduled = changeCommissionInstallmentStatus(
  planned,
  "programada",
  REVIEWED_AT,
);
const cancelled = changeCommissionInstallmentStatus(
  planned,
  "cancelada",
  REVIEWED_AT,
);

describe("fechamento mensal de comissões", () => {
  it("deixa canceladas e ajustadas fora do valor a pagar", () => {
    expect(isInPayoutClosing("prevista")).toBe(true);
    expect(isInPayoutClosing("programada")).toBe(true);
    expect(isInPayoutClosing("paga")).toBe(true);
    expect(isInPayoutClosing("cancelada")).toBe(false);
    expect(isInPayoutClosing("ajustada")).toBe(false);
  });

  it("fica em conferência enquanto houver uma parcela prevista", () => {
    expect(payoutStageOf(["paga", "programada", "prevista"])).toBe(
      "em-conferencia",
    );
  });

  it("fica programado quando tudo foi conferido e algo ainda não foi pago", () => {
    expect(payoutStageOf(["paga", "programada", "cancelada"])).toBe(
      "programado",
    );
  });

  it("só fica pago quando todas as parcelas do fechamento foram quitadas", () => {
    expect(payoutStageOf(["paga", "paga", "ajustada"])).toBe("pago");
  });

  it("fica vazio sem nenhuma parcela no fechamento", () => {
    expect(payoutStageOf([])).toBe("vazio");
    expect(payoutStageOf(["cancelada", "ajustada"])).toBe("vazio");
  });

  it("programa somente as parcelas previstas, na próxima posição do histórico", () => {
    const events = planPayoutTransition(
      [
        { installmentId: "a", history: planned },
        { installmentId: "b", history: scheduled },
        { installmentId: "c", history: cancelled },
      ],
      PAYOUT_REVIEW,
      REVIEWED_AT,
    );

    expect(events).toEqual([
      {
        installmentId: "a",
        sequence: 2,
        entry: {
          previousStatus: "prevista",
          status: "programada",
          changedAt: "2026-08-03T12:00:00.000Z",
        },
      },
    ]);
  });

  it("paga somente as parcelas programadas", () => {
    const events = planPayoutTransition(
      [
        { installmentId: "a", history: planned },
        { installmentId: "b", history: scheduled },
      ],
      PAYOUT_PAYMENT,
      PAID_AT,
    );

    expect(events).toEqual([
      {
        installmentId: "b",
        sequence: 3,
        entry: {
          previousStatus: "programada",
          status: "paga",
          changedAt: "2026-08-07T15:00:00.000Z",
        },
      },
    ]);
  });

  it("devolve um plano imutável nos dois níveis", () => {
    const events = planPayoutTransition(
      [{ installmentId: "a", history: planned }],
      PAYOUT_REVIEW,
      REVIEWED_AT,
    );

    expect(Object.isFrozen(events)).toBe(true);
    expect(Object.isFrozen(events[0])).toBe(true);
    expect(Object.isFrozen(events[0].entry)).toBe(true);
  });

  it("não gera evento quando nada está na situação de origem", () => {
    expect(
      planPayoutTransition(
        [{ installmentId: "b", history: scheduled }],
        PAYOUT_REVIEW,
        PAID_AT,
      ),
    ).toEqual([]);
  });

  it("recusa uma transição anterior ao último registro", () => {
    expect(() =>
      planPayoutTransition(
        [{ installmentId: "b", history: scheduled }],
        PAYOUT_PAYMENT,
        CREATED_AT,
      ),
    ).toThrow(CommissionInstallmentStatusError);
  });

  it("recusa parcela sem histórico em vez de ignorá-la", () => {
    expect(() =>
      planPayoutTransition(
        [{ installmentId: "x", history: [] }],
        PAYOUT_REVIEW,
        REVIEWED_AT,
      ),
    ).toThrow(CommissionInstallmentStatusError);
  });
});
