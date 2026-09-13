import { centsToDecimalString } from "@/shared/money";

/** Data de negócio (AAAA-MM-DD) no formato brasileiro. */
export function formatBusinessDate(date: string): string {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

/** Competência (AAAA-MM) no formato brasileiro. */
export function formatCompetence(competence: string): string {
  const [year, month] = competence.split("-");

  return `${month}/${year}`;
}

/**
 * Valores permanecem em centavos e só viram texto aqui, na borda da tela. O
 * agrupamento é aplicado sobre a parte inteira em `bigint`, sem passar por
 * `number` em momento algum.
 */
export function formatCents(cents: bigint): string {
  const [reais, centavos] = centsToDecimalString(cents).split(".");

  return `R$ ${new Intl.NumberFormat("pt-BR").format(BigInt(reais))},${centavos}`;
}

/** Percentual em pontos-base, com duas casas. */
export function formatBasisPoints(basisPoints: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(basisPoints / 10_000);
}
