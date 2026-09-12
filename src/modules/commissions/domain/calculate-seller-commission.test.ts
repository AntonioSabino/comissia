import { describe, expect, it } from "vitest";
import { calculateSellerCommissionTotal } from "./calculate-seller-commission";

describe("calculateSellerCommissionTotal", () => {
  it("calcula R$ 4.000 para um crédito de R$ 200.000 a 2%", () => {
    expect(
      calculateSellerCommissionTotal({
        creditAmountInCents: BigInt("20000000"),
        sellerRateBasisPoints: 200,
      }),
    ).toBe(BigInt("400000"));
  });

  it("arredonda frações de centavo para o centavo mais próximo", () => {
    expect(
      calculateSellerCommissionTotal({
        creditAmountInCents: BigInt(1),
        sellerRateBasisPoints: 4_999,
      }),
    ).toBe(BigInt(0));
    expect(
      calculateSellerCommissionTotal({
        creditAmountInCents: BigInt(1),
        sellerRateBasisPoints: 5_000,
      }),
    ).toBe(BigInt(1));
  });

  it("preserva a precisão para créditos acima de Number.MAX_SAFE_INTEGER", () => {
    expect(
      calculateSellerCommissionTotal({
        creditAmountInCents: BigInt("9007199254740993"),
        sellerRateBasisPoints: 200,
      }),
    ).toBe(BigInt("180143985094820"));
  });

  it("recusa crédito não positivo", () => {
    expect(() =>
      calculateSellerCommissionTotal({
        creditAmountInCents: BigInt(0),
        sellerRateBasisPoints: 200,
      }),
    ).toThrow("O crédito vendido deve ser maior que zero");
  });

  it.each([0, 10_001, 200.5, Number.NaN])(
    "recusa o percentual inválido %s",
    (sellerRateBasisPoints) => {
      expect(() =>
        calculateSellerCommissionTotal({
          creditAmountInCents: BigInt(100),
          sellerRateBasisPoints,
        }),
      ).toThrow("O percentual deve estar entre 1 e 10.000 pontos-base");
    },
  );
});
