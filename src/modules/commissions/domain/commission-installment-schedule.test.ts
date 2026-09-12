import { describe, expect, it } from "vitest";
import {
  buildCommissionInstallmentSchedule,
  CommissionInstallmentScheduleError,
} from "./commission-installment-schedule";

describe("commission installment schedule", () => {
  it("gera uma parcela por competência a partir da primeira data prevista", () => {
    const schedule = buildCommissionInstallmentSchedule({
      firstInstallmentDueOn: "2026-09-10",
      installments: 3,
    });

    expect(schedule).toEqual([
      { number: 1, competence: "2026-09", dueOn: "2026-09-10" },
      { number: 2, competence: "2026-10", dueOn: "2026-10-10" },
      { number: 3, competence: "2026-11", dueOn: "2026-11-10" },
    ]);
  });

  it("gera uma única parcela quando a venda tem uma parcela", () => {
    expect(
      buildCommissionInstallmentSchedule({
        firstInstallmentDueOn: "2026-09-10",
        installments: 1,
      }),
    ).toEqual([{ number: 1, competence: "2026-09", dueOn: "2026-09-10" }]);
  });

  it("avança o ano na virada de dezembro para janeiro", () => {
    const schedule = buildCommissionInstallmentSchedule({
      firstInstallmentDueOn: "2026-11-05",
      installments: 4,
    });

    expect(schedule.map((installment) => installment.competence)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
    expect(schedule.at(-1)?.dueOn).toBe("2027-02-05");
  });

  it("avança corretamente entre os anos 0099 e 0100", () => {
    const schedule = buildCommissionInstallmentSchedule({
      firstInstallmentDueOn: "0099-12-31",
      installments: 2,
    });

    expect(schedule).toEqual([
      { number: 1, competence: "0099-12", dueOn: "0099-12-31" },
      { number: 2, competence: "0100-01", dueOn: "0100-01-31" },
    ]);
  });

  it("mantém o dia de vencimento e encurta apenas os meses mais curtos", () => {
    const schedule = buildCommissionInstallmentSchedule({
      firstInstallmentDueOn: "2026-01-31",
      installments: 4,
    });

    expect(schedule.map((installment) => installment.dueOn)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("usa o último dia de fevereiro em ano bissexto", () => {
    const schedule = buildCommissionInstallmentSchedule({
      firstInstallmentDueOn: "2028-01-30",
      installments: 2,
    });

    expect(schedule).toEqual([
      { number: 1, competence: "2028-01", dueOn: "2028-01-30" },
      { number: 2, competence: "2028-02", dueOn: "2028-02-29" },
    ]);
  });

  it("mantém a competência do mês mesmo quando a data prevista é encurtada", () => {
    const [, february] = buildCommissionInstallmentSchedule({
      firstInstallmentDueOn: "2026-01-31",
      installments: 2,
    });

    expect(february).toEqual({
      number: 2,
      competence: "2026-02",
      dueOn: "2026-02-28",
    });
  });

  it("numera todas as parcelas em sequência até o limite contratado", () => {
    const schedule = buildCommissionInstallmentSchedule({
      firstInstallmentDueOn: "2026-01-31",
      installments: 120,
    });

    expect(schedule).toHaveLength(120);
    expect(schedule.map((installment) => installment.number)).toEqual(
      Array.from({ length: 120 }, (_, index) => index + 1),
    );
    expect(schedule.at(-1)).toEqual({
      number: 120,
      competence: "2035-12",
      dueOn: "2035-12-31",
    });
  });

  it("devolve uma agenda imutável", () => {
    const schedule = buildCommissionInstallmentSchedule({
      firstInstallmentDueOn: "2026-09-10",
      installments: 2,
    });

    expect(Object.isFrozen(schedule)).toBe(true);
    expect(Object.isFrozen(schedule[0])).toBe(true);
  });

  it("recusa data prevista fora do formato AAAA-MM-DD", () => {
    expect(() =>
      buildCommissionInstallmentSchedule({
        firstInstallmentDueOn: "10/09/2026",
        installments: 3,
      }),
    ).toThrow(CommissionInstallmentScheduleError);
  });

  it("recusa data prevista inexistente no calendário", () => {
    expect(() =>
      buildCommissionInstallmentSchedule({
        firstInstallmentDueOn: "2026-02-30",
        installments: 3,
      }),
    ).toThrow(
      "Informe a data prevista da primeira parcela no formato AAAA-MM-DD",
    );
  });

  it("recusa uma agenda que passaria do ano 9999", () => {
    expect(() =>
      buildCommissionInstallmentSchedule({
        firstInstallmentDueOn: "9999-12-31",
        installments: 2,
      }),
    ).toThrow("A última parcela não pode passar do ano 9999");
  });

  it("aceita a agenda que termina exatamente no fim de 9999", () => {
    const schedule = buildCommissionInstallmentSchedule({
      firstInstallmentDueOn: "9999-12-31",
      installments: 1,
    });

    expect(schedule).toEqual([
      { number: 1, competence: "9999-12", dueOn: "9999-12-31" },
    ]);
  });

  it("recusa quantidade de parcelas fora de 1 a 120", () => {
    const invalidCounts = [0, -1, 121, 1.5, Number.NaN];

    for (const installments of invalidCounts) {
      expect(() =>
        buildCommissionInstallmentSchedule({
          firstInstallmentDueOn: "2026-09-10",
          installments,
        }),
      ).toThrow("A quantidade de parcelas deve estar entre 1 e 120");
    }
  });
});
