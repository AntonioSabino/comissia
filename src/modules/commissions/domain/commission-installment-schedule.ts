import { isValidDateOnly } from "@/shared/date-only";

const MAX_COMMISSION_INSTALLMENTS = 120;
const MAX_YEAR = 9999;

export type CommissionInstallmentScheduleInput = {
  /** Data prevista da primeira parcela, no formato AAAA-MM-DD. */
  firstInstallmentDueOn: string;
  /** Quantidade de parcelas de comissão informada na venda. */
  installments: number;
};

export type ScheduledCommissionInstallment = Readonly<{
  /** Posição da parcela, de 1 até a quantidade contratada. */
  number: number;
  /** Competência mensal, no formato AAAA-MM. */
  competence: string;
  /** Data prevista de recebimento, no formato AAAA-MM-DD. */
  dueOn: string;
}>;

export type CommissionInstallmentSchedule =
  readonly ScheduledCommissionInstallment[];

export class CommissionInstallmentScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommissionInstallmentScheduleError";
  }
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

/** Último dia do mês, contando o ano bissexto. */
function lastDayOfMonth(year: number, month: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month, 0);
  return date.getUTCDate();
}

/**
 * Gera a competência e a data prevista de cada parcela a partir da primeira
 * data prevista, avançando um mês por parcela.
 *
 * O dia da primeira parcela é o dia de vencimento do contrato e permanece o
 * mesmo em todas as competências. Meses mais curtos encurtam apenas a própria
 * data prevista: vencendo dia 31, fevereiro cai no último dia do mês e março
 * volta a cair no dia 31.
 */
export function buildCommissionInstallmentSchedule({
  firstInstallmentDueOn,
  installments,
}: CommissionInstallmentScheduleInput): CommissionInstallmentSchedule {
  if (
    typeof firstInstallmentDueOn !== "string" ||
    !isValidDateOnly(firstInstallmentDueOn)
  ) {
    throw new CommissionInstallmentScheduleError(
      "Informe a data prevista da primeira parcela no formato AAAA-MM-DD",
    );
  }

  if (
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > MAX_COMMISSION_INSTALLMENTS
  ) {
    throw new CommissionInstallmentScheduleError(
      "A quantidade de parcelas deve estar entre 1 e 120",
    );
  }

  const [firstYear, firstMonth, anchorDay] = firstInstallmentDueOn
    .split("-")
    .map(Number);
  const lastYear = firstYear + Math.floor((firstMonth - 2 + installments) / 12);

  // Além de 9999 a competência deixaria de caber no formato AAAA.
  if (lastYear > MAX_YEAR) {
    throw new CommissionInstallmentScheduleError(
      "A última parcela não pode passar do ano 9999",
    );
  }

  const schedule: ScheduledCommissionInstallment[] = [];

  for (let index = 0; index < installments; index += 1) {
    const monthsFromFirst = firstMonth - 1 + index;
    const year = firstYear + Math.floor(monthsFromFirst / 12);
    const month = (monthsFromFirst % 12) + 1;
    const day = Math.min(anchorDay, lastDayOfMonth(year, month));

    schedule.push(
      Object.freeze({
        number: index + 1,
        competence: `${pad(year, 4)}-${pad(month, 2)}`,
        dueOn: `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`,
      }),
    );
  }

  return Object.freeze(schedule);
}
