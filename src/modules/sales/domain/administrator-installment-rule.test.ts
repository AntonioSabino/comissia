import { describe, expect, it } from "vitest";
import {
  AdministratorInstallmentRuleValidationError,
  installmentRuleTotalBasisPoints,
  validateAdministratorInstallmentRule,
  type AdministratorInstallmentRuleInput,
} from "./administrator-installment-rule";

const ADMINISTRATOR_ID = "2f81455e-01cd-4b4f-8614-30fda79fd987";

function ruleInput(
  overrides: AdministratorInstallmentRuleInput = {},
): AdministratorInstallmentRuleInput {
  return {
    administratorId: ADMINISTRATOR_ID,
    product: "Auto Leve",
    effectiveFrom: "2026-01-01",
    installmentRatesBasisPoints: [75, 50, 25],
    ...overrides,
  };
}

/** Lista com uma posição ausente, que `map` e `every` saltariam. */
function sparseDistribution(): number[] {
  const rates = [75, 50, 25];
  Reflect.deleteProperty(rates, 1);

  return rates;
}

function fieldErrors(input: AdministratorInstallmentRuleInput) {
  try {
    validateAdministratorInstallmentRule(input);
  } catch (error) {
    if (error instanceof AdministratorInstallmentRuleValidationError) {
      return error.fieldErrors;
    }

    throw error;
  }

  throw new Error("A validação deveria ter recusado a régua");
}

describe("validateAdministratorInstallmentRule", () => {
  it("aceita a régua e preserva a ordem informada", () => {
    expect(
      validateAdministratorInstallmentRule(
        ruleInput({ installmentRatesBasisPoints: [75, 50, 25] }),
      ),
    ).toEqual({
      administratorId: ADMINISTRATOR_ID,
      product: "Auto Leve",
      effectiveFrom: "2026-01-01",
      installmentRatesBasisPoints: [75, 50, 25],
    });
  });

  it("normaliza o produto informado", () => {
    expect(
      validateAdministratorInstallmentRule(
        ruleInput({ product: "  Imóvel   Premiado " }),
      ).product,
    ).toBe("Imóvel Premiado");
  });

  it("aceita uma única parcela", () => {
    expect(
      validateAdministratorInstallmentRule(
        ruleInput({ installmentRatesBasisPoints: [150] }),
      ).installmentRatesBasisPoints,
    ).toEqual([150]);
  });

  it("aceita 120 parcelas", () => {
    const rates = Array.from({ length: 120 }, () => 10);

    expect(
      validateAdministratorInstallmentRule(
        ruleInput({ installmentRatesBasisPoints: rates }),
      ).installmentRatesBasisPoints,
    ).toHaveLength(120);
  });

  it.each([1, 10_000])("aceita o percentual de %i pontos-base", (rate) => {
    expect(
      validateAdministratorInstallmentRule(
        ruleInput({ installmentRatesBasisPoints: [rate] }),
      ).installmentRatesBasisPoints,
    ).toEqual([rate]);
  });

  it("não permite alterar a distribuição validada", () => {
    const informed = [75, 50, 25];
    const rule = validateAdministratorInstallmentRule(
      ruleInput({ installmentRatesBasisPoints: informed }),
    );

    expect(() => {
      (rule.installmentRatesBasisPoints as number[])[0] = 1;
    }).toThrow(TypeError);
    expect(informed).toEqual([75, 50, 25]);
  });

  it("recusa administradora que não é identificador", () => {
    expect(fieldErrors(ruleInput({ administratorId: "porto" }))).toEqual({
      administratorId: "Selecione a administradora",
    });
  });

  it.each([" A ", "x".repeat(121)])("recusa o produto %p", (product) => {
    expect(fieldErrors(ruleInput({ product }))).toHaveProperty("product");
  });

  it.each(["", "2026-02-30", "01/01/2026"])(
    "recusa a vigência %p",
    (effectiveFrom) => {
      expect(fieldErrors(ruleInput({ effectiveFrom }))).toHaveProperty(
        "effectiveFrom",
      );
    },
  );

  it.each([
    ["lista vazia", []],
    ["mais de 120 parcelas", Array.from({ length: 121 }, () => 10)],
    ["percentual zerado", [0]],
    ["percentual negativo", [-75]],
    ["percentual acima de 10.000", [10_001]],
    ["percentual fracionário", [75.5]],
    ["percentual não numérico", ["75"]],
    ["percentual ausente", [75, null]],
    ["lista inteiramente ausente", new Array<number>(3)],
    ["lista com posição ausente", sparseDistribution()],
    ["distribuição que não é lista", 75],
  ])("recusa %s", (_case, installmentRatesBasisPoints) => {
    expect(
      fieldErrors(ruleInput({ installmentRatesBasisPoints })),
    ).toHaveProperty("installmentRatesBasisPoints");
  });

  it("aponta todos os campos inválidos de uma vez", () => {
    expect(
      fieldErrors({
        administratorId: "porto",
        product: "",
        effectiveFrom: "2026-13-01",
        installmentRatesBasisPoints: [],
      }),
    ).toEqual({
      administratorId: expect.any(String),
      product: expect.any(String),
      effectiveFrom: expect.any(String),
      installmentRatesBasisPoints: expect.any(String),
    });
  });
});

describe("installmentRuleTotalBasisPoints", () => {
  it("soma a distribuição informada", () => {
    expect(installmentRuleTotalBasisPoints([75, 50, 25])).toBe(150);
  });

  it("mantém a soma de uma única parcela", () => {
    expect(installmentRuleTotalBasisPoints([150])).toBe(150);
  });

  it("soma o limite de 120 parcelas sem perder precisão", () => {
    expect(
      installmentRuleTotalBasisPoints(
        Array.from({ length: 120 }, () => 10_000),
      ),
    ).toBe(1_200_000);
  });
});
