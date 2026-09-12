import { isValidDateOnly } from "@/shared/date-only";
import { isUuid } from "@/shared/uuid";

export const MAX_RULE_INSTALLMENTS = 120;
export const MAX_INSTALLMENT_RATE_BASIS_POINTS = 10_000;

export type AdministratorInstallmentRuleInput = {
  administratorId?: unknown;
  product?: unknown;
  effectiveFrom?: unknown;
  installmentRatesBasisPoints?: unknown;
};

export type ValidAdministratorInstallmentRule = {
  administratorId: string;
  product: string;
  effectiveFrom: string;
  /** Da primeira à última parcela, na ordem informada. */
  installmentRatesBasisPoints: readonly number[];
};

export type AdministratorInstallmentRuleField =
  keyof AdministratorInstallmentRuleInput;

export type AdministratorInstallmentRuleFieldErrors = Partial<
  Record<AdministratorInstallmentRuleField, string>
>;

export class AdministratorInstallmentRuleValidationError extends Error {
  constructor(
    public readonly fieldErrors: AdministratorInstallmentRuleFieldErrors,
  ) {
    super("Revise os campos informados");
    this.name = "AdministratorInstallmentRuleValidationError";
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/**
 * A distribuição é uma lista de percentuais em pontos-base, sempre inteiros:
 * ponto flutuante não é aceito nem convertido.
 */
function parseInstallmentRates(value: unknown): number[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_RULE_INSTALLMENTS
  ) {
    return null;
  }

  const rates = value.map((rate: unknown) =>
    typeof rate === "number" &&
    Number.isInteger(rate) &&
    rate >= 1 &&
    rate <= MAX_INSTALLMENT_RATE_BASIS_POINTS
      ? rate
      : null,
  );

  return rates.every((rate): rate is number => rate !== null) ? rates : null;
}

/** O percentual total da regra é a soma da distribuição. */
export function installmentRuleTotalBasisPoints(
  installmentRatesBasisPoints: readonly number[],
): number {
  return installmentRatesBasisPoints.reduce((total, rate) => total + rate, 0);
}

/**
 * Valida e normaliza uma versão da régua de parcelas da administradora. A
 * existência da administradora e a sobreposição de vigências dependem do que
 * já está gravado e são verificadas pelo repositório.
 */
export function validateAdministratorInstallmentRule(
  input: AdministratorInstallmentRuleInput,
): ValidAdministratorInstallmentRule {
  const administratorId = isUuid(input.administratorId)
    ? input.administratorId
    : null;
  const product = text(input.product);
  const effectiveFrom = text(input.effectiveFrom);
  const installmentRatesBasisPoints = parseInstallmentRates(
    input.installmentRatesBasisPoints,
  );
  const fieldErrors: AdministratorInstallmentRuleFieldErrors = {};

  if (!administratorId) {
    fieldErrors.administratorId = "Selecione a administradora";
  }

  if (product.length < 2 || product.length > 120) {
    fieldErrors.product = "Informe o produto ou plano com 2 a 120 caracteres";
  }

  if (!isValidDateOnly(effectiveFrom)) {
    fieldErrors.effectiveFrom = "Informe uma data de vigência válida";
  }

  if (installmentRatesBasisPoints === null) {
    fieldErrors.installmentRatesBasisPoints = `Informe de 1 a ${MAX_RULE_INSTALLMENTS} percentuais inteiros entre 1 e ${MAX_INSTALLMENT_RATE_BASIS_POINTS} pontos-base`;
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    !administratorId ||
    installmentRatesBasisPoints === null
  ) {
    throw new AdministratorInstallmentRuleValidationError(fieldErrors);
  }

  return {
    administratorId,
    product,
    effectiveFrom,
    installmentRatesBasisPoints: Object.freeze(installmentRatesBasisPoints),
  };
}
