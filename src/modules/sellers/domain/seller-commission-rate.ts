import { isValidDateOnly } from "@/shared/date-only";
import {
  SellerValidationError,
  stringValue,
  type SellerFieldErrors,
} from "./seller-validation";

export type SellerCommissionRateInput = {
  ratePercentage?: unknown;
  effectiveFrom?: unknown;
};

export type ValidSellerCommissionRate = {
  rateBasisPoints: number;
  effectiveFrom: string;
};

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

export function collectSellerCommissionRate(input: SellerCommissionRateInput): {
  value: { rateBasisPoints: number | null; effectiveFrom: string };
  fieldErrors: SellerFieldErrors;
} {
  const rateBasisPoints = parseRateBasisPoints(
    stringValue(input.ratePercentage),
  );
  const effectiveFrom = stringValue(input.effectiveFrom);
  const fieldErrors: SellerFieldErrors = {};

  if (rateBasisPoints === null) {
    fieldErrors.ratePercentage = "Informe um percentual entre 0,01% e 100%";
  }

  if (!isValidDateOnly(effectiveFrom)) {
    fieldErrors.effectiveFrom = "Informe uma data de vigência válida";
  }

  return { value: { rateBasisPoints, effectiveFrom }, fieldErrors };
}

export function validateSellerCommissionRate(
  input: SellerCommissionRateInput,
): ValidSellerCommissionRate {
  const { value, fieldErrors } = collectSellerCommissionRate(input);

  if (value.rateBasisPoints === null || Object.keys(fieldErrors).length > 0) {
    throw new SellerValidationError(fieldErrors);
  }

  return {
    rateBasisPoints: value.rateBasisPoints,
    effectiveFrom: value.effectiveFrom,
  };
}
