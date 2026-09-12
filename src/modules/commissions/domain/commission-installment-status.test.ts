import { describe, expect, it } from "vitest";
import {
  changeCommissionInstallmentStatus,
  COMMISSION_INSTALLMENT_STATUSES,
  CommissionInstallmentStatusError,
  createCommissionInstallmentStatusHistory,
  INITIAL_COMMISSION_INSTALLMENT_STATUS,
  isCommissionInstallmentStatus,
} from "./commission-installment-status";

const CREATED_AT = new Date("2026-09-12T10:00:00.000Z");

describe("commission installment statuses", () => {
  it("disponibiliza todas as situações definidas pelo negócio", () => {
    expect(COMMISSION_INSTALLMENT_STATUSES).toEqual([
      "prevista",
      "programada",
      "paga",
      "cancelada",
      "ajustada",
    ]);
  });

  it("reconhece somente situações suportadas", () => {
    expect(isCommissionInstallmentStatus("prevista")).toBe(true);
    expect(isCommissionInstallmentStatus("pendente")).toBe(false);
    expect(isCommissionInstallmentStatus(null)).toBe(false);
  });

  it("inicia uma nova parcela como prevista e registra sua criação", () => {
    expect(createCommissionInstallmentStatusHistory(CREATED_AT)).toEqual({
      currentStatus: INITIAL_COMMISSION_INSTALLMENT_STATUS,
      entries: [
        {
          previousStatus: null,
          status: "prevista",
          changedAt: "2026-09-12T10:00:00.000Z",
        },
      ],
    });
  });

  it("preserva todas as transições em ordem cronológica", () => {
    const initial = createCommissionInstallmentStatusHistory(CREATED_AT);
    const scheduled = changeCommissionInstallmentStatus(
      initial,
      "programada",
      new Date("2026-09-13T10:00:00.000Z"),
    );
    const paid = changeCommissionInstallmentStatus(
      scheduled,
      "paga",
      new Date("2026-09-14T10:00:00.000Z"),
    );

    expect(paid).toEqual({
      currentStatus: "paga",
      entries: [
        {
          previousStatus: null,
          status: "prevista",
          changedAt: "2026-09-12T10:00:00.000Z",
        },
        {
          previousStatus: "prevista",
          status: "programada",
          changedAt: "2026-09-13T10:00:00.000Z",
        },
        {
          previousStatus: "programada",
          status: "paga",
          changedAt: "2026-09-14T10:00:00.000Z",
        },
      ],
    });
  });

  it("não altera o histórico recebido ao registrar uma mudança", () => {
    const initial = createCommissionInstallmentStatusHistory(CREATED_AT);

    changeCommissionInstallmentStatus(
      initial,
      "cancelada",
      new Date("2026-09-13T10:00:00.000Z"),
    );

    expect(initial.currentStatus).toBe("prevista");
    expect(initial.entries).toHaveLength(1);
    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(initial.entries)).toBe(true);
  });

  it("recusa uma situação não suportada", () => {
    const initial = createCommissionInstallmentStatusHistory(CREATED_AT);

    expect(() =>
      changeCommissionInstallmentStatus(
        initial,
        "pendente",
        new Date("2026-09-13T10:00:00.000Z"),
      ),
    ).toThrow(CommissionInstallmentStatusError);
  });

  it("recusa registrar novamente a situação atual", () => {
    const initial = createCommissionInstallmentStatusHistory(CREATED_AT);

    expect(() =>
      changeCommissionInstallmentStatus(
        initial,
        "prevista",
        new Date("2026-09-13T10:00:00.000Z"),
      ),
    ).toThrow("A nova situação deve ser diferente da situação atual");
  });

  it("recusa instante inválido", () => {
    expect(() =>
      createCommissionInstallmentStatusHistory(new Date("invalid")),
    ).toThrow("Informe um instante válido para a mudança de situação");
  });

  it("recusa mudança anterior ao último registro", () => {
    const initial = createCommissionInstallmentStatusHistory(CREATED_AT);

    expect(() =>
      changeCommissionInstallmentStatus(
        initial,
        "ajustada",
        new Date("2026-09-12T09:59:59.999Z"),
      ),
    ).toThrow("A mudança não pode ser anterior ao último registro");
  });
});
