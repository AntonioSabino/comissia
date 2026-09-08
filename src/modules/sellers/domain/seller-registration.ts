import {
  collectSellerCommissionRate,
  type SellerCommissionRateInput,
} from "./seller-commission-rate";
import {
  collectSellerProfile,
  type SellerProfileInput,
  type ValidSellerProfile,
} from "./seller-profile";
import {
  SellerValidationError,
  type SellerFieldErrors,
} from "./seller-validation";

export type SellerRegistrationInput = SellerProfileInput &
  SellerCommissionRateInput & {
    active?: unknown;
  };

export type ValidSellerRegistration = ValidSellerProfile & {
  active: boolean;
  rateBasisPoints: number;
  effectiveFrom: string;
};

export function validateSellerRegistration(
  input: SellerRegistrationInput,
): ValidSellerRegistration {
  const profile = collectSellerProfile(input);
  const rate = collectSellerCommissionRate(input);
  const fieldErrors: SellerFieldErrors = {
    ...profile.fieldErrors,
    ...rate.fieldErrors,
  };

  if (input.active !== undefined && typeof input.active !== "boolean") {
    fieldErrors.active = "Informe uma situação válida";
  }

  if (
    rate.value.rateBasisPoints === null ||
    Object.keys(fieldErrors).length > 0
  ) {
    throw new SellerValidationError(fieldErrors);
  }

  return {
    ...profile.value,
    active: typeof input.active === "boolean" ? input.active : true,
    rateBasisPoints: rate.value.rateBasisPoints,
    effectiveFrom: rate.value.effectiveFrom,
  };
}
