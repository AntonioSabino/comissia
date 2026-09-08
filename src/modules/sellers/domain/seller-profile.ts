import {
  SellerValidationError,
  stringValue,
  type SellerFieldErrors,
} from "./seller-validation";

export type SellerProfileInput = {
  name?: unknown;
  document?: unknown;
  email?: unknown;
  phone?: unknown;
};

export type ValidSellerProfile = {
  name: string;
  document: string;
  email: string;
  phone: string | null;
};

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

export function collectSellerProfile(input: SellerProfileInput): {
  value: ValidSellerProfile;
  fieldErrors: SellerFieldErrors;
} {
  const name = stringValue(input.name).replace(/\s+/g, " ");
  const document = stringValue(input.document).replace(/\D/g, "");
  const email = stringValue(input.email).toLowerCase();
  const rawPhone = stringValue(input.phone);
  const phone = rawPhone.replace(/\D/g, "");
  const fieldErrors: SellerFieldErrors = {};

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

  return {
    value: { name, document, email, phone: phone || null },
    fieldErrors,
  };
}

export function validateSellerProfile(
  input: SellerProfileInput,
): ValidSellerProfile {
  const { value, fieldErrors } = collectSellerProfile(input);

  if (Object.keys(fieldErrors).length > 0) {
    throw new SellerValidationError(fieldErrors);
  }

  return value;
}
