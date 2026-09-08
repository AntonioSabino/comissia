import { describe, expect, it } from "vitest";
import { isValidCpf, validateSellerProfile } from "./seller-profile";
import { SellerValidationError } from "./seller-validation";

const validInput = {
  name: "  Maria   da Silva ",
  document: "529.982.247-25",
  email: " MARIA@EXAMPLE.COM ",
  phone: "(11) 99999-9999",
};

describe("seller profile validation", () => {
  it("normalizes valid profile data", () => {
    expect(validateSellerProfile(validInput)).toEqual({
      name: "Maria da Silva",
      document: "52998224725",
      email: "maria@example.com",
      phone: "11999999999",
    });
  });

  it("accepts an empty phone", () => {
    expect(validateSellerProfile({ ...validInput, phone: "  " }).phone).toBe(
      null,
    );
  });

  it("validates CPF check digits", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("reports every invalid field at once", () => {
    let thrown: unknown;

    try {
      validateSellerProfile({
        name: "",
        document: "123",
        email: "invalid",
        phone: "999",
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SellerValidationError);
    expect((thrown as SellerValidationError).fieldErrors).toEqual({
      name: "Informe um nome entre 2 e 160 caracteres",
      document: "Informe um CPF válido",
      email: "Informe um e-mail válido",
      phone: "Informe um telefone com DDD",
    });
  });
});
