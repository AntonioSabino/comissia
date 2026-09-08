import { describe, expect, it } from "vitest";
import { validateSellerRegistration } from "./seller-registration";
import { SellerValidationError } from "./seller-validation";

const validInput = {
  name: "  Maria   da Silva ",
  document: "529.982.247-25",
  email: " MARIA@EXAMPLE.COM ",
  phone: "(11) 99999-9999",
  active: true,
  ratePercentage: "2,50",
  effectiveFrom: "2026-08-29",
};

describe("seller registration validation", () => {
  it("normalizes valid registration data", () => {
    expect(validateSellerRegistration(validInput)).toEqual({
      name: "Maria da Silva",
      document: "52998224725",
      email: "maria@example.com",
      phone: "11999999999",
      active: true,
      rateBasisPoints: 250,
      effectiveFrom: "2026-08-29",
    });
  });

  it("registers an active seller when the situation is omitted", () => {
    expect(
      validateSellerRegistration({ ...validInput, active: undefined }).active,
    ).toBe(true);
  });

  it("joins profile and commission rate errors", () => {
    let thrown: unknown;

    try {
      validateSellerRegistration({
        ...validInput,
        name: "",
        active: "sim",
        ratePercentage: "100,01",
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SellerValidationError);
    expect((thrown as SellerValidationError).fieldErrors).toEqual({
      name: "Informe um nome entre 2 e 160 caracteres",
      active: "Informe uma situação válida",
      ratePercentage: "Informe um percentual entre 0,01% e 100%",
    });
  });
});
