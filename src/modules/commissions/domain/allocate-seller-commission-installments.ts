import { calculateSellerCommissionTotal } from "./calculate-seller-commission";

const MAX_INSTALLMENTS = 120;

export type SellerCommissionInstallmentAllocationInput = {
  creditAmountInCents: bigint;
  sellerRateBasisPoints: number;
  installmentRatesBasisPoints: readonly number[];
};

export type AllocatedSellerCommissionInstallment = Readonly<{
  number: number;
  rateBasisPoints: number;
  amountInCents: bigint;
}>;

export type SellerCommissionInstallmentAllocation =
  readonly AllocatedSellerCommissionInstallment[];

export class SellerCommissionInstallmentAllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SellerCommissionInstallmentAllocationError";
  }
}

/**
 * Distribui a comissão do vendedor entre as parcelas na proporção da régua da
 * administradora. A régua diz o que a administradora paga à corretora em cada
 * parcela, então a soma dela é o teto: o percentual do vendedor sai de dentro
 * desse total e não pode excedê-lo.
 *
 * As parcelas anteriores são truncadas em centavos e a última recebe todo o
 * resíduo necessário para preservar o valor total da comissão.
 */
export function allocateSellerCommissionInstallments({
  creditAmountInCents,
  sellerRateBasisPoints,
  installmentRatesBasisPoints,
}: SellerCommissionInstallmentAllocationInput): SellerCommissionInstallmentAllocation {
  let totalCommissionInCents: bigint;

  try {
    totalCommissionInCents = calculateSellerCommissionTotal({
      creditAmountInCents,
      sellerRateBasisPoints,
    });
  } catch (error) {
    if (error instanceof RangeError) {
      throw new SellerCommissionInstallmentAllocationError(error.message);
    }

    throw error;
  }

  if (
    !Array.isArray(installmentRatesBasisPoints) ||
    installmentRatesBasisPoints.length < 1 ||
    installmentRatesBasisPoints.length > MAX_INSTALLMENTS
  ) {
    throw new SellerCommissionInstallmentAllocationError(
      "A distribuição deve conter entre 1 e 120 parcelas",
    );
  }

  let distributedRateBasisPoints = 0;

  for (const rateBasisPoints of installmentRatesBasisPoints) {
    if (
      !Number.isInteger(rateBasisPoints) ||
      rateBasisPoints < 1 ||
      rateBasisPoints > 10_000
    ) {
      throw new SellerCommissionInstallmentAllocationError(
        "Cada percentual de parcela deve estar entre 1 e 10.000 pontos-base",
      );
    }

    distributedRateBasisPoints += rateBasisPoints;
  }

  if (distributedRateBasisPoints < sellerRateBasisPoints) {
    throw new SellerCommissionInstallmentAllocationError(
      "O percentual do vendedor não pode exceder o total da régua da administradora",
    );
  }

  let allocatedAmountInCents = BigInt(0);
  const lastInstallmentIndex = installmentRatesBasisPoints.length - 1;

  const allocation = installmentRatesBasisPoints.map(
    (rateBasisPoints, index) => {
      const amountInCents =
        index === lastInstallmentIndex
          ? totalCommissionInCents - allocatedAmountInCents
          : (totalCommissionInCents * BigInt(rateBasisPoints)) /
            BigInt(distributedRateBasisPoints);

      allocatedAmountInCents += amountInCents;

      return Object.freeze({
        number: index + 1,
        rateBasisPoints,
        amountInCents,
      });
    },
  );

  return Object.freeze(allocation);
}
