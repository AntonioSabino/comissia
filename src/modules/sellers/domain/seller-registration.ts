export type SellerRegistrationInput = {
  name?: unknown;
  document?: unknown;
  email?: unknown;
  phone?: unknown;
  active?: unknown;
  ratePercentage?: unknown;
  effectiveFrom?: unknown;
};

export type ValidSellerRegistration = {
  name: string;
  document: string;
  email: string;
  phone: string | null;
  active: boolean;
  rateBasisPoints: number;
  effectiveFrom: string;
};

export type SellerRegistrationField =
  | "name"
  | "document"
  | "email"
  | "phone"
  | "active"
  | "ratePercentage"
  | "effectiveFrom";

export class SellerValidationError extends Error {
  constructor(
    public readonly fieldErrors: Partial<
      Record<SellerRegistrationField, string>
    >,
  ) {
    super("Revise os campos informados");
    this.name = "SellerValidationError";
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateDigit = (length: number) => {
    const sum = digits
      .slice(0, length)
      .split("")
      .reduce(
        (total, digit, index) => total + Number(digit) * (length + 1 - index),
        0,
      );
    const remainder = (sum * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculateDigit(9) === Number(digits[9]) &&
    calculateDigit(10) === Number(digits[10])
  );
}

function parseRateBasisPoints(value: string): number | null {
  const normalized = value.replace(",", ".");

  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [integerPart, decimalPart = ""] = normalized.split(".");
  const basisPoints =
    Number(integerPart) * 100 + Number(decimalPart.padEnd(2, "0"));

  return basisPoints >= 1 && basisPoints <= 10_000 ? basisPoints : null;
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateSellerRegistration(
  input: SellerRegistrationInput,
): ValidSellerRegistration {
  const name = stringValue(input.name).replace(/\s+/g, " ");
  const document = stringValue(input.document).replace(/\D/g, "");
  const email = stringValue(input.email).toLowerCase();
  const rawPhone = stringValue(input.phone);
  const phone = rawPhone.replace(/\D/g, "");
  const ratePercentage = stringValue(input.ratePercentage);
  const effectiveFrom = stringValue(input.effectiveFrom);
  const rateBasisPoints = parseRateBasisPoints(ratePercentage);
  const fieldErrors: SellerValidationError["fieldErrors"] = {};

  if (name.length < 2 || name.length > 160) {
    fieldErrors.name = "Informe um nome entre 2 e 160 caracteres";
  }

  if (!isValidCpf(document)) {
    fieldErrors.document = "Informe um CPF válido";
  }

  if (
    email.length === 0 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    fieldErrors.email = "Informe um e-mail válido";
  }

  if (rawPhone.length > 0 && !/^\d{10,11}$/.test(phone)) {
    fieldErrors.phone = "Informe um telefone com DDD";
  }

  if (input.active !== undefined && typeof input.active !== "boolean") {
    fieldErrors.active = "Informe uma situação válida";
  }

  if (rateBasisPoints === null) {
    fieldErrors.ratePercentage = "Informe um percentual entre 0,01% e 100%";
  }

  if (!isValidDateOnly(effectiveFrom)) {
    fieldErrors.effectiveFrom = "Informe uma data de vigência válida";
  }

  if (Object.keys(fieldErrors).length > 0 || rateBasisPoints === null) {
    throw new SellerValidationError(fieldErrors);
  }

  return {
    name,
    document,
    email,
    phone: phone || null,
    active: typeof input.active === "boolean" ? input.active : true,
    rateBasisPoints,
    effectiveFrom,
  };
}
