import type { SellerCommissionInstallment } from "./seller-commission-repository";

export type MonthlyCommissionForecast = {
  /** Competência no formato AAAA-MM. */
  competence: string;
  totalInCents: bigint;
  installments: SellerCommissionInstallment[];
};

/** Competência (AAAA-MM) de uma data de negócio (AAAA-MM-DD). */
export function competenceOf(date: string): string {
  return date.slice(0, 7);
}

/**
 * Agrupa as parcelas por competência, da mais antiga para a mais recente, e
 * soma cada mês em centavos inteiros. A ordem da lista recebida não importa.
 */
export function groupInstallmentsByCompetence(
  installments: readonly SellerCommissionInstallment[],
): MonthlyCommissionForecast[] {
  const months = new Map<string, MonthlyCommissionForecast>();

  for (const installment of installments) {
    const month = months.get(installment.competence) ?? {
      competence: installment.competence,
      totalInCents: BigInt(0),
      installments: [],
    };

    month.totalInCents += installment.amountInCents;
    month.installments.push(installment);
    months.set(installment.competence, month);
  }

  return [...months.values()]
    .sort((first, second) => first.competence.localeCompare(second.competence))
    .map((month) => ({
      ...month,
      installments: [...month.installments].sort(
        (first, second) =>
          first.dueOn.localeCompare(second.dueOn) ||
          first.saleCode.localeCompare(second.saleCode) ||
          first.number - second.number,
      ),
    }));
}

/**
 * Competência a exibir: a pedida, quando existe; senão a do mês corrente; senão
 * a próxima com valor previsto; e, se tudo já passou, a última.
 */
export function selectCompetence(
  months: readonly MonthlyCommissionForecast[],
  requested: string | undefined,
  today: string,
): string | null {
  if (months.length === 0) {
    return null;
  }

  const available = months.map((month) => month.competence);

  if (requested && available.includes(requested)) {
    return requested;
  }

  const current = competenceOf(today);

  return (
    available.find((competence) => competence >= current) ??
    available[available.length - 1]
  );
}
