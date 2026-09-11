import { isValidDateOnly } from "@/shared/date-only";
import { parseBrlToCents } from "@/shared/money";
import { isUuid } from "@/shared/uuid";

export type SaleRegistrationInput = {
  administratorId?: unknown;
  sellerId?: unknown;
  customerName?: unknown;
  product?: unknown;
  groupCode?: unknown;
  quotaCode?: unknown;
  soldOn?: unknown;
  creditAmount?: unknown;
  commissionInstallments?: unknown;
  firstInstallmentDueOn?: unknown;
};

export type ValidSaleRegistration = {
  administratorId: string;
  sellerId: string;
  customerName: string;
  product: string;
  groupCode: string;
  quotaCode: string;
  soldOn: string;
  creditAmountInCents: bigint;
  commissionInstallments: number;
  firstInstallmentDueOn: string;
};

export type SaleField = keyof SaleRegistrationInput;

export type SaleFieldErrors = Partial<Record<SaleField, string>>;

export class SaleValidationError extends Error {
  constructor(public readonly fieldErrors: SaleFieldErrors) {
    super("Revise os campos informados");
    this.name = "SaleValidationError";
  }
}

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9./-]{0,19}$/;
const MAX_COMMISSION_INSTALLMENTS = 120;
const POSTGRES_BIGINT_MAX = BigInt("9223372036854775807");

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function parseInstallments(value: unknown): number | null {
  const raw = typeof value === "number" ? String(value) : text(value);

  if (!/^\d{1,3}$/.test(raw)) {
    return null;
  }

  const installments = Number(raw);

  return installments >= 1 && installments <= MAX_COMMISSION_INSTALLMENTS
    ? installments
    : null;
}

/**
 * Valida e normaliza os dados informados no cadastro de uma venda. `today` é a
 * data operacional, usada para recusar vendas com data futura.
 */
export function validateSaleRegistration(
  input: SaleRegistrationInput,
  today: string,
): ValidSaleRegistration {
  const administratorId = isUuid(input.administratorId)
    ? input.administratorId
    : null;
  const sellerId = isUuid(input.sellerId) ? input.sellerId : null;
  const customerName = text(input.customerName);
  const product = text(input.product);
  const groupCode = text(input.groupCode);
  const quotaCode = text(input.quotaCode);
  const soldOn = text(input.soldOn);
  const firstInstallmentDueOn = text(input.firstInstallmentDueOn);
  const creditAmountInCents = parseBrlToCents(text(input.creditAmount));
  const commissionInstallments = parseInstallments(
    input.commissionInstallments,
  );
  const fieldErrors: SaleFieldErrors = {};

  if (!administratorId) {
    fieldErrors.administratorId = "Selecione a administradora";
  }

  if (!sellerId) {
    fieldErrors.sellerId = "Selecione o vendedor";
  }

  if (customerName.length < 2 || customerName.length > 160) {
    fieldErrors.customerName = "Informe o cliente com 2 a 160 caracteres";
  }

  if (product.length < 2 || product.length > 120) {
    fieldErrors.product = "Informe o produto com 2 a 120 caracteres";
  }

  if (!IDENTIFIER_PATTERN.test(groupCode)) {
    fieldErrors.groupCode =
      "Informe o grupo com até 20 letras, números, ponto, barra ou hífen";
  }

  if (!IDENTIFIER_PATTERN.test(quotaCode)) {
    fieldErrors.quotaCode =
      "Informe a cota com até 20 letras, números, ponto, barra ou hífen";
  }

  const hasValidSoldOn = isValidDateOnly(soldOn);

  if (!hasValidSoldOn) {
    fieldErrors.soldOn = "Informe uma data de venda válida";
  } else if (soldOn > today) {
    fieldErrors.soldOn = "A data da venda não pode ser futura";
  }

  if (creditAmountInCents === null || creditAmountInCents <= BigInt(0)) {
    fieldErrors.creditAmount = "Informe o crédito vendido em reais";
  } else if (creditAmountInCents > POSTGRES_BIGINT_MAX) {
    fieldErrors.creditAmount = "O crédito informado excede o limite permitido";
  }

  if (commissionInstallments === null) {
    fieldErrors.commissionInstallments = `Informe de 1 a ${MAX_COMMISSION_INSTALLMENTS} parcelas`;
  }

  if (!isValidDateOnly(firstInstallmentDueOn)) {
    fieldErrors.firstInstallmentDueOn =
      "Informe uma data válida para a primeira previsão";
  } else if (hasValidSoldOn && firstInstallmentDueOn < soldOn) {
    fieldErrors.firstInstallmentDueOn =
      "A primeira previsão não pode ser anterior à data da venda";
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    !administratorId ||
    !sellerId ||
    creditAmountInCents === null ||
    commissionInstallments === null
  ) {
    throw new SaleValidationError(fieldErrors);
  }

  return {
    administratorId,
    sellerId,
    customerName,
    product,
    groupCode,
    quotaCode,
    soldOn,
    creditAmountInCents,
    commissionInstallments,
    firstInstallmentDueOn,
  };
}
