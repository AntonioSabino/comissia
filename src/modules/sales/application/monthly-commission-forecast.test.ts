import { describe, expect, it } from "vitest";
import {
  competenceOf,
  groupInstallmentsByCompetence,
  isCompetence,
  shiftCompetence,
  selectCompetence,
} from "./monthly-commission-forecast";
import type { SellerCommissionInstallment } from "./seller-commission-repository";

const TODAY = "2026-09-13";

function installment(
  overrides: Partial<SellerCommissionInstallment> = {},
): SellerCommissionInstallment {
  return {
    id: `parcela-${overrides.competence ?? "2026-09"}-${overrides.number ?? 1}`,
    competence: "2026-09",
    dueOn: "2026-09-10",
    number: 1,
    saleInstallments: 3,
    amountInCents: BigInt(100_000),
    status: "prevista",
    saleId: "venda-1",
    saleCode: "V-000001",
    product: "Auto Leve",
    administratorName: "Porto Consórcio",
    customerName: "Cliente Aurora",
    ...overrides,
  };
}

describe("groupInstallmentsByCompetence", () => {
  it("agrupa por competência somando os centavos do mês", () => {
    const months = groupInstallmentsByCompetence([
      installment({ competence: "2026-09", amountInCents: BigInt(120_000) }),
      installment({
        competence: "2026-09",
        number: 2,
        amountInCents: BigInt(80_000),
      }),
      installment({ competence: "2026-10", amountInCents: BigInt(50_000) }),
    ]);

    expect(
      months.map(({ competence, totalInCents }) => ({
        competence,
        totalInCents,
      })),
    ).toEqual([
      { competence: "2026-09", totalInCents: BigInt(200_000) },
      { competence: "2026-10", totalInCents: BigInt(50_000) },
    ]);
  });

  it("ordena as competências da mais antiga para a mais recente", () => {
    const months = groupInstallmentsByCompetence([
      installment({ competence: "2027-01" }),
      installment({ competence: "2026-12" }),
      installment({ competence: "2026-09" }),
    ]);

    expect(months.map(({ competence }) => competence)).toEqual([
      "2026-09",
      "2026-12",
      "2027-01",
    ]);
  });

  it("ordena as parcelas do mês por data prevista, venda e número", () => {
    const months = groupInstallmentsByCompetence([
      installment({ dueOn: "2026-09-20", saleCode: "V-000002", number: 3 }),
      installment({ dueOn: "2026-09-10", saleCode: "V-000001", number: 2 }),
      installment({ dueOn: "2026-09-10", saleCode: "V-000001", number: 1 }),
    ]);

    expect(
      months[0].installments.map(
        ({ saleCode, number }) => `${saleCode}:${number}`,
      ),
    ).toEqual(["V-000001:1", "V-000001:2", "V-000002:3"]);
  });

  it("preserva a precisão de valores acima de Number.MAX_SAFE_INTEGER", () => {
    const months = groupInstallmentsByCompetence([
      installment({ amountInCents: BigInt("9007199254740993") }),
      installment({ number: 2, amountInCents: BigInt("9007199254740993") }),
    ]);

    expect(months[0].totalInCents).toBe(BigInt("18014398509481986"));
  });

  it("aceita lista vazia", () => {
    expect(groupInstallmentsByCompetence([])).toEqual([]);
  });
});

describe("selectCompetence", () => {
  const months = groupInstallmentsByCompetence([
    installment({ competence: "2026-07" }),
    installment({ competence: "2026-09" }),
    installment({ competence: "2026-11" }),
  ]);

  it("respeita a competência pedida quando ela tem parcelas", () => {
    expect(selectCompetence(months, "2026-07", TODAY)).toBe("2026-07");
  });

  it("ignora competência pedida sem parcelas e usa o mês corrente", () => {
    expect(selectCompetence(months, "2026-08", TODAY)).toBe("2026-09");
    expect(selectCompetence(months, "não é competência", TODAY)).toBe(
      "2026-09",
    );
  });

  it("usa a próxima competência com valor quando o mês corrente não tem", () => {
    expect(selectCompetence(months, undefined, "2026-10-01")).toBe("2026-11");
  });

  it("usa a última competência quando todas já passaram", () => {
    expect(selectCompetence(months, undefined, "2027-03-01")).toBe("2026-11");
  });

  it("usa a primeira competência quando todas são futuras", () => {
    expect(selectCompetence(months, undefined, "2026-01-01")).toBe("2026-07");
  });

  it("pula a competência zerada e abre na próxima com valor", () => {
    const zeroed = groupInstallmentsByCompetence([
      installment({ competence: "2026-09", amountInCents: BigInt(0) }),
      installment({ competence: "2026-10", amountInCents: BigInt(90_000) }),
    ]);

    expect(selectCompetence(zeroed, undefined, TODAY)).toBe("2026-10");
  });

  it("respeita a competência zerada quando ela foi pedida", () => {
    const zeroed = groupInstallmentsByCompetence([
      installment({ competence: "2026-09", amountInCents: BigInt(0) }),
      installment({ competence: "2026-10", amountInCents: BigInt(90_000) }),
    ]);

    expect(selectCompetence(zeroed, "2026-09", TODAY)).toBe("2026-09");
  });

  it("usa a última competência com valor quando as seguintes são zeradas", () => {
    const zeroed = groupInstallmentsByCompetence([
      installment({ competence: "2026-07", amountInCents: BigInt(90_000) }),
      installment({ competence: "2026-10", amountInCents: BigInt(0) }),
    ]);

    expect(selectCompetence(zeroed, undefined, TODAY)).toBe("2026-07");
  });

  it("usa a última competência quando nenhuma tem valor", () => {
    const zeroed = groupInstallmentsByCompetence([
      installment({ competence: "2026-07", amountInCents: BigInt(0) }),
      installment({ competence: "2026-10", amountInCents: BigInt(0) }),
    ]);

    expect(selectCompetence(zeroed, undefined, TODAY)).toBe("2026-10");
  });

  it("não escolhe nada quando não há parcelas", () => {
    expect(selectCompetence([], undefined, TODAY)).toBeNull();
  });
});

describe("competenceOf", () => {
  it("usa o ano e o mês da data de negócio", () => {
    expect(competenceOf("2026-09-13")).toBe("2026-09");
  });
});

describe("isCompetence", () => {
  it.each(["2026-01", "2026-09", "2026-12", "9999-12"])(
    "reconhece %p",
    (value) => {
      expect(isCompetence(value)).toBe(true);
    },
  );

  it.each([
    "2026-00",
    "2026-13",
    "2026-9",
    "202-09",
    "2026-09-13",
    "2026/09",
    " 2026-09",
    "",
  ])("recusa %p", (value) => {
    expect(isCompetence(value)).toBe(false);
  });

  it("recusa valor que não é texto", () => {
    expect(isCompetence(undefined)).toBe(false);
    expect(isCompetence(202609)).toBe(false);
    expect(isCompetence(["2026-09"])).toBe(false);
  });
});

describe("shiftCompetence", () => {
  it("avança e recua dentro do ano", () => {
    expect(shiftCompetence("2026-08", 1)).toBe("2026-09");
    expect(shiftCompetence("2026-08", -1)).toBe("2026-07");
  });

  it("atravessa a virada do ano nos dois sentidos", () => {
    expect(shiftCompetence("2026-12", 1)).toBe("2027-01");
    expect(shiftCompetence("2026-01", -1)).toBe("2025-12");
    expect(shiftCompetence("2026-01", -13)).toBe("2024-12");
  });
});
