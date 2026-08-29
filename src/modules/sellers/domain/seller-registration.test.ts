import { describe, expect, it } from "vitest";
import {
  isValidCpf,
  SellerValidationError,
  validateSellerRegistration,
} from "./seller-registration";

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

  it("validates CPF check digits", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("rejects invalid required fields and percentage", () => {
    expect(() =>
      validateSellerRegistration({
        ...validInput,
        name: "",
        document: "123",
        email: "invalid",
        ratePercentage: "100,01",
        effectiveFrom: "2026-02-30",
      }),
    ).toThrow(SellerValidationError);
  });

  it("accepts the percentage boundaries", () => {
    expect(
      validateSellerRegistration({
        ...validInput,
        ratePercentage: "0,01",
      }).rateBasisPoints,
    ).toBe(1);
    expect(
      validateSellerRegistration({
        ...validInput,
        ratePercentage: "100",
      }).rateBasisPoints,
    ).toBe(10_000);
  });
});
