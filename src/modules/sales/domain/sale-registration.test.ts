import { describe, expect, it } from "vitest";
import {
  SaleValidationError,
  validateSaleRegistration,
  type SaleRegistrationInput,
} from "./sale-registration";

const TODAY = "2026-09-10";

const validInput: SaleRegistrationInput = {
  administratorId: "2f81455e-01cd-4b4f-8614-30fda79fd987",
  sellerId: "8d0b7a4e-5c1f-4f6a-9b2e-3c4d5e6f7a8b",
  customerName: "  Cliente   Aurora ",
  product: " Imóvel ",
  groupCode: " 1234 ",
  quotaCode: "567",
  soldOn: "2026-09-05",
  creditAmount: "R$ 200.000,00",
  commissionInstallments: "6",
  firstInstallmentDueOn: "2026-10-05",
};

function fieldErrorsOf(input: SaleRegistrationInput) {
  try {
    validateSaleRegistration(input, TODAY);
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return error.fieldErrors;
    }

    throw error;
  }

  throw new Error("Esperava um erro de validação");
}

describe("validateSaleRegistration", () => {
  it("normaliza uma venda válida", () => {
    expect(validateSaleRegistration(validInput, TODAY)).toEqual({
      administratorId: "2f81455e-01cd-4b4f-8614-30fda79fd987",
      sellerId: "8d0b7a4e-5c1f-4f6a-9b2e-3c4d5e6f7a8b",
      customerName: "Cliente Aurora",
      product: "Imóvel",
      groupCode: "1234",
      quotaCode: "567",
      soldOn: "2026-09-05",
      creditAmountInCents: BigInt("20000000"),
      commissionInstallments: 6,
      firstInstallmentDueOn: "2026-10-05",
    });
  });

  it("aceita venda e primeira previsão no mesmo dia de hoje", () => {
    expect(
      validateSaleRegistration(
        { ...validInput, soldOn: TODAY, firstInstallmentDueOn: TODAY },
        TODAY,
      ).soldOn,
    ).toBe(TODAY);
  });

  it("reporta todos os campos obrigatórios de uma vez", () => {
    expect(Object.keys(fieldErrorsOf({})).sort()).toEqual(
      [
        "administratorId",
        "sellerId",
        "customerName",
        "product",
        "groupCode",
        "quotaCode",
        "soldOn",
        "creditAmount",
        "commissionInstallments",
        "firstInstallmentDueOn",
      ].sort(),
    );
  });

  it("recusa venda com data futura", () => {
    expect(fieldErrorsOf({ ...validInput, soldOn: "2026-09-11" })).toEqual({
      soldOn: "A data da venda não pode ser futura",
    });
  });

  it("recusa primeira previsão anterior à data da venda", () => {
    expect(
      fieldErrorsOf({ ...validInput, firstInstallmentDueOn: "2026-09-04" }),
    ).toEqual({
      firstInstallmentDueOn:
        "A primeira previsão não pode ser anterior à data da venda",
    });
  });

  it("aceita o maior crédito representável pelo bigint do PostgreSQL", () => {
    expect(
      validateSaleRegistration(
        { ...validInput, creditAmount: "92.233.720.368.547.758,07" },
        TODAY,
      ).creditAmountInCents,
    ).toBe(BigInt("9223372036854775807"));
  });

  it("recusa crédito acima do bigint do PostgreSQL", () => {
    expect(
      fieldErrorsOf({
        ...validInput,
        creditAmount: "92.233.720.368.547.758,08",
      }),
    ).toEqual({
      creditAmount: "O crédito informado excede o limite permitido",
    });
  });

  it.each(["0", "0,00", "abc", "-100"])("recusa o crédito %j", (credit) => {
    expect(fieldErrorsOf({ ...validInput, creditAmount: credit })).toEqual({
      creditAmount: "Informe o crédito vendido em reais",
    });
  });

  it.each(["0", "121", "2,5", "abc"])(
    "recusa %j parcelas de comissão",
    (installments) => {
      expect(
        fieldErrorsOf({ ...validInput, commissionInstallments: installments }),
      ).toEqual({ commissionInstallments: "Informe de 1 a 120 parcelas" });
    },
  );

  it("aceita a quantidade de parcelas como número", () => {
    expect(
      validateSaleRegistration(
        { ...validInput, commissionInstallments: 120 },
        TODAY,
      ).commissionInstallments,
    ).toBe(120);
  });

  it("recusa grupo e cota com caracteres inválidos ou longos demais", () => {
    expect(
      fieldErrorsOf({
        ...validInput,
        groupCode: "grupo 12",
        quotaCode: "1".repeat(21),
      }),
    ).toEqual({
      groupCode: "Informe o grupo com até 20 letras, números, ponto, barra ou hífen",
      quotaCode: "Informe a cota com até 20 letras, números, ponto, barra ou hífen",
    });
  });

  it("recusa identificadores que não são UUID", () => {
    expect(
      fieldErrorsOf({ ...validInput, administratorId: "porto", sellerId: 1 }),
    ).toEqual({
      administratorId: "Selecione a administradora",
      sellerId: "Selecione o vendedor",
    });
  });
});
