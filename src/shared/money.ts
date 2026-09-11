const CENTS_PER_REAL = BigInt(100);
const ZERO = BigInt(0);

/**
 * Converte um valor em reais digitado no padrão brasileiro ("200.000,50",
 * "200000", "R$ 1.234,5") para centavos. Devolve `null` quando o texto não é um
 * valor válido.
 */
export function parseBrlToCents(value: string): bigint | null {
  const normalized = value.trim().replace(/^R\$\s*/i, "");

  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [integerPart, decimalPart = ""] = normalized.split(",");

  return (
    BigInt(integerPart.replace(/\./g, "")) * CENTS_PER_REAL +
    BigInt(decimalPart.padEnd(2, "0"))
  );
}

/**
 * Representação decimal usada nos DTOs das bordas HTTP, porque
 * `JSON.stringify` não serializa `BigInt`: 20000050n vira "200000.50".
 */
export function centsToDecimalString(cents: bigint): string {
  const sign = cents < ZERO ? "-" : "";
  const absolute = cents < ZERO ? -cents : cents;
  const reais = absolute / CENTS_PER_REAL;
  const rest = absolute % CENTS_PER_REAL;

  return `${sign}${reais.toString()}.${rest.toString().padStart(2, "0")}`;
}
