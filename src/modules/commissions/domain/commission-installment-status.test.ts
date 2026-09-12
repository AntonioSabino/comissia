import { describe, expect, it } from "vitest";
import {
  changeCommissionInstallmentStatus,
  COMMISSION_INSTALLMENT_STATUSES,
  CommissionInstallmentStatusError,
  createCommissionInstallmentStatusHistory,
  currentCommissionInstallmentStatus,
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
    const history = createCommissionInstallmentStatusHistory(CREATED_AT);

    expect(history).toEqual([
      {
        previousStatus: null,
        status: "prevista",
        changedAt: "2026-09-12T10:00:00.000Z",
      },
    ]);
    expect(currentCommissionInstallmentStatus(history)).toBe(
      INITIAL_COMMISSION_INSTALLMENT_STATUS,
    );
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

    expect(paid).toEqual([
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
    ]);
    expect(currentCommissionInstallmentStatus(paid)).toBe("paga");
  });

  it("toma a situação atual da última entrada do histórico", () => {
    const callerHistory = [
      {
        previousStatus: null,
        status: "prevista" as const,
        changedAt: "2026-09-12T10:00:00.000Z",
      },
      {
        previousStatus: "prevista" as const,
        status: "programada" as const,
        changedAt: "2026-09-13T10:00:00.000Z",
      },
    ];

    expect(currentCommissionInstallmentStatus(callerHistory)).toBe(
      "programada",
    );
    expect(
      changeCommissionInstallmentStatus(
        callerHistory,
        "paga",
        new Date("2026-09-14T10:00:00.000Z"),
      ).at(-1),
    ).toEqual({
      previousStatus: "programada",
      status: "paga",
      changedAt: "2026-09-14T10:00:00.000Z",
    });
  });

  it("recusa um histórico sem nenhuma situação registrada", () => {
    expect(() => currentCommissionInstallmentStatus([])).toThrow(
      "O histórico da parcela não tem nenhuma situação registrada",
    );
    expect(() =>
      changeCommissionInstallmentStatus([], "paga", CREATED_AT),
    ).toThrow(CommissionInstallmentStatusError);
  });

  it("não altera o histórico recebido ao registrar uma mudança", () => {
    const initial = createCommissionInstallmentStatusHistory(CREATED_AT);

    changeCommissionInstallmentStatus(
      initial,
      "cancelada",
      new Date("2026-09-13T10:00:00.000Z"),
    );

    expect(initial).toHaveLength(1);
    expect(currentCommissionInstallmentStatus(initial)).toBe("prevista");
    expect(Object.isFrozen(initial)).toBe(true);
  });

  it("não congela entradas pertencentes ao chamador", () => {
    const callerEntry = {
      previousStatus: null,
      status: "prevista" as const,
      changedAt: "2026-09-12T10:00:00.000Z",
    };
    const callerHistory = [callerEntry];

    const changed = changeCommissionInstallmentStatus(
      callerHistory,
      "programada",
      new Date("2026-09-13T10:00:00.000Z"),
    );

    expect(Object.isFrozen(callerEntry)).toBe(false);
    expect(Object.isFrozen(callerHistory)).toBe(false);
    expect(changed[0]).not.toBe(callerEntry);
    expect(Object.isFrozen(changed[0])).toBe(true);
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
