/**
 * Soma parcelas em centavos inteiros. Existe para que a tela não faça conta de
 * dinheiro no meio do JSX e para que "os totais conferem" seja uma garantia
 * testada, e não uma coincidência.
 */
export function sumInstallmentAmounts(
  installments: readonly { amountInCents: bigint }[],
): bigint {
  return installments.reduce(
    (total, installment) => total + installment.amountInCents,
    BigInt(0),
  );
}
