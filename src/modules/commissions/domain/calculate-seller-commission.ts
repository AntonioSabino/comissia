const BASIS_POINTS_SCALE = BigInt(10_000);
const ROUNDING_THRESHOLD = BASIS_POINTS_SCALE / BigInt(2);
const ZERO = BigInt(0);

export type SellerCommissionCalculationInput = {
  creditAmountInCents: bigint;
  sellerRateBasisPoints: number;
};

/**
 * Calcula a comissão total do vendedor em centavos usando o percentual que a
 * venda preservou como snapshot. Resultados com fração de centavo são
 * arredondados para o centavo mais próximo, com meio centavo para cima.
 */
export function calculateSellerCommissionTotal({
  creditAmountInCents,
  sellerRateBasisPoints,
}: SellerCommissionCalculationInput): bigint {
  if (creditAmountInCents <= ZERO) {
    throw new RangeError("O crédito vendido deve ser maior que zero");
  }

  if (
    !Number.isInteger(sellerRateBasisPoints) ||
    sellerRateBasisPoints < 1 ||
    sellerRateBasisPoints > 10_000
  ) {
    throw new RangeError(
      "O percentual deve estar entre 1 e 10.000 pontos-base",
    );
  }

  const scaledCommission = creditAmountInCents * BigInt(sellerRateBasisPoints);
  const wholeCents = scaledCommission / BASIS_POINTS_SCALE;
  const fractionOfCent = scaledCommission % BASIS_POINTS_SCALE;

  return fractionOfCent >= ROUNDING_THRESHOLD
    ? wholeCents + BigInt(1)
    : wholeCents;
}
