import { describe, expect, it } from "vitest";
import {
  allocateSellerCommissionInstallments,
  SellerCommissionInstallmentAllocationError,
} from "./allocate-seller-commission-installments";

describe("allocateSellerCommissionInstallments", () => {
  it("distribui percentuais diferentes entre oito parcelas", () => {
    const allocation = allocateSellerCommissionInstallments({
      creditAmountInCents: BigInt("20000000"),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: [15, 15, 20, 20, 25, 25, 30, 50],
    });

    expect(allocation).toEqual([
      { number: 1, rateBasisPoints: 15, amountInCents: BigInt("30000") },
      { number: 2, rateBasisPoints: 15, amountInCents: BigInt("30000") },
      { number: 3, rateBasisPoints: 20, amountInCents: BigInt("40000") },
      { number: 4, rateBasisPoints: 20, amountInCents: BigInt("40000") },
      { number: 5, rateBasisPoints: 25, amountInCents: BigInt("50000") },
      { number: 6, rateBasisPoints: 25, amountInCents: BigInt("50000") },
      { number: 7, rateBasisPoints: 30, amountInCents: BigInt("60000") },
      { number: 8, rateBasisPoints: 50, amountInCents: BigInt("100000") },
    ]);
  });

  it("concentra na última parcela o resíduo acumulado de centavos", () => {
    const allocation = allocateSellerCommissionInstallments({
      creditAmountInCents: BigInt(1_001),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: [67, 67, 66],
    });

    expect(allocation.map(({ amountInCents }) => amountInCents)).toEqual([
      BigInt(6),
      BigInt(6),
      BigInt(8),
    ]);
    expect(
      allocation.reduce(
        (total, installment) => total + installment.amountInCents,
        BigInt(0),
      ),
    ).toBe(BigInt(20));
  });

  it("preserva o arredondamento do total quando as parcelas isoladas seriam zero", () => {
    const allocation = allocateSellerCommissionInstallments({
      creditAmountInCents: BigInt(25),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: [100, 100],
    });

    expect(allocation.map(({ amountInCents }) => amountInCents)).toEqual([
      BigInt(0),
      BigInt(1),
    ]);
  });

  it("atribui o total à parcela única", () => {
    const allocation = allocateSellerCommissionInstallments({
      creditAmountInCents: BigInt(5_001),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: [200],
    });

    expect(allocation[0]?.amountInCents).toBe(BigInt(100));
  });

  it("preserva a precisão acima de Number.MAX_SAFE_INTEGER", () => {
    const allocation = allocateSellerCommissionInstallments({
      creditAmountInCents: BigInt("9007199254740993"),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: [50, 50, 100],
    });

    expect(
      allocation.reduce(
        (total, installment) => total + installment.amountInCents,
        BigInt(0),
      ),
    ).toBe(BigInt("180143985094820"));
  });

  it("não altera a distribuição recebida e congela o resultado", () => {
    const rates = [100, 100];
    const allocation = allocateSellerCommissionInstallments({
      creditAmountInCents: BigInt(10_000),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: rates,
    });

    expect(rates).toEqual([100, 100]);
    expect(Object.isFrozen(allocation)).toBe(true);
    expect(allocation.every(Object.isFrozen)).toBe(true);
  });

  it.each([[[]], [Array.from({ length: 121 }, () => 1)]])(
    "recusa uma quantidade fora do limite",
    (installmentRatesBasisPoints) => {
      expect(() =>
        allocateSellerCommissionInstallments({
          creditAmountInCents: BigInt(10_000),
          sellerRateBasisPoints: 200,
          installmentRatesBasisPoints,
        }),
      ).toThrow("A distribuição deve conter entre 1 e 120 parcelas");
    },
  );

  it.each([0, -1, 1.5, 10_001, Number.NaN])(
    "recusa o percentual de parcela inválido %s",
    (rateBasisPoints) => {
      expect(() =>
        allocateSellerCommissionInstallments({
          creditAmountInCents: BigInt(10_000),
          sellerRateBasisPoints: 200,
          installmentRatesBasisPoints: [rateBasisPoints, 200],
        }),
      ).toThrow(
        "Cada percentual de parcela deve estar entre 1 e 10.000 pontos-base",
      );
    },
  );

  it("distribui na proporção da régua quando o total dela é maior que o percentual do vendedor", () => {
    // Régua de 4% da administradora em 2% + 1% + 1%; vendedor com 2% do crédito.
    const allocation = allocateSellerCommissionInstallments({
      creditAmountInCents: BigInt("20000000"),
      sellerRateBasisPoints: 200,
      installmentRatesBasisPoints: [200, 100, 100],
    });

    expect(allocation.map(({ amountInCents }) => amountInCents)).toEqual([
      BigInt("200000"),
      BigInt("100000"),
      BigInt("100000"),
    ]);
  });

  it("preserva a comissão do vendedor qualquer que seja o total da régua", () => {
    const distributed = (installmentRatesBasisPoints: number[]) =>
      allocateSellerCommissionInstallments({
        creditAmountInCents: BigInt("20000000"),
        sellerRateBasisPoints: 250,
        installmentRatesBasisPoints,
      }).reduce(
        (total, installment) => total + installment.amountInCents,
        BigInt(0),
      );

    expect(distributed([400, 300, 300])).toBe(BigInt("500000"));
    expect(distributed([250])).toBe(BigInt("500000"));
    expect(distributed([100, 100, 100, 100, 100])).toBe(BigInt("500000"));
  });

  it("recusa percentual do vendedor acima do total da régua", () => {
    expect(() =>
      allocateSellerCommissionInstallments({
        creditAmountInCents: BigInt(10_000),
        sellerRateBasisPoints: 450,
        installmentRatesBasisPoints: [200, 200],
      }),
    ).toThrow(
      "O percentual do vendedor não pode exceder o total da régua da administradora",
    );
  });

  it("aceita a régua cujo total é exatamente o percentual do vendedor", () => {
    const allocation = allocateSellerCommissionInstallments({
      creditAmountInCents: BigInt("20000000"),
      sellerRateBasisPoints: 400,
      installmentRatesBasisPoints: [200, 200],
    });

    expect(allocation.map(({ amountInCents }) => amountInCents)).toEqual([
      BigInt("400000"),
      BigInt("400000"),
    ]);
  });

  it("padroniza erros dos dados usados para calcular a comissão total", () => {
    expect(() =>
      allocateSellerCommissionInstallments({
        creditAmountInCents: BigInt(0),
        sellerRateBasisPoints: 200,
        installmentRatesBasisPoints: [200],
      }),
    ).toThrow(SellerCommissionInstallmentAllocationError);
  });
});
