import { describe, expect, it } from "vitest";
import { sumInstallmentAmounts } from "./installment-totals";

describe("sumInstallmentAmounts", () => {
  it("soma os centavos das parcelas", () => {
    expect(
      sumInstallmentAmounts([
        { amountInCents: BigInt(200_000) },
        { amountInCents: BigInt(100_000) },
        { amountInCents: BigInt(100_000) },
      ]),
    ).toBe(BigInt(400_000));
  });

  it("aceita parcela de zero centavo", () => {
    expect(
      sumInstallmentAmounts([
        { amountInCents: BigInt(0) },
        { amountInCents: BigInt(1) },
      ]),
    ).toBe(BigInt(1));
  });

  it("devolve zero para lista vazia", () => {
    expect(sumInstallmentAmounts([])).toBe(BigInt(0));
  });

  it("preserva a precisão acima de Number.MAX_SAFE_INTEGER", () => {
    expect(
      sumInstallmentAmounts([
        { amountInCents: BigInt("9007199254740993") },
        { amountInCents: BigInt("9007199254740993") },
      ]),
    ).toBe(BigInt("18014398509481986"));
  });
});
