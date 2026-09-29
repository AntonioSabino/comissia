import type { SellerCommissionInstallment } from "./seller-commission-repository";

export type MonthlyCommissionForecast = {
  /** Competência no formato AAAA-MM. */
  competence: string;
  totalInCents: bigint;
  installments: SellerCommissionInstallment[];
};

const COMPETENCE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Reconhece uma competência no formato AAAA-MM. A tela usa isto antes de
 * devolver ao navegador um valor que veio da própria URL.
 */
export function isCompetence(value: unknown): value is string {
  return typeof value === "string" && COMPETENCE_PATTERN.test(value);
}

/** Competência (AAAA-MM) de uma data de negócio (AAAA-MM-DD). */
export function competenceOf(date: string): string {
  return date.slice(0, 7);
}

/** Competência deslocada em meses, sem passar por `Date` nem fuso horário. */
export function shiftCompetence(competence: string, months: number): string {
  const [year, month] = competence.split("-").map(Number);
  const index = year * 12 + (month - 1) + months;
  const shiftedYear = Math.floor(index / 12);
  const shiftedMonth = (index % 12) + 1;

  return `${String(shiftedYear).padStart(4, "0")}-${String(shiftedMonth).padStart(2, "0")}`;
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
 * Competência a exibir: a pedida, quando existe; senão a próxima com valor a
 * partir do mês corrente; senão a última com valor; e, se nenhuma tiver valor,
 * a última.
 *
 * A busca ignora meses zerados porque uma parcela pode valer zero centavo
 * quando a comissão é de poucos centavos: abrir a tela num mês de R$ 0,00
 * esconderia o próximo mês com dinheiro. A competência pedida é respeitada
 * mesmo zerada, porque ali a escolha foi de quem navegou.
 */
export function selectCompetence(
  months: readonly Pick<
    MonthlyCommissionForecast,
    "competence" | "totalInCents"
  >[],
  requested: string | undefined,
  today: string,
): string | null {
  if (months.length === 0) {
    return null;
  }

  if (requested && months.some((month) => month.competence === requested)) {
    return requested;
  }

  const current = competenceOf(today);
  const withValue = months.filter((month) => month.totalInCents > BigInt(0));

  const next = withValue.find((month) => month.competence >= current);

  return (
    next?.competence ??
    withValue[withValue.length - 1]?.competence ??
    months[months.length - 1].competence
  );
}
