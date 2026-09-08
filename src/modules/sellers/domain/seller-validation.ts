export type SellerField =
  | "name"
  | "document"
  | "email"
  | "phone"
  | "active"
  | "ratePercentage"
  | "effectiveFrom";

export type SellerFieldErrors = Partial<Record<SellerField, string>>;

export class SellerValidationError extends Error {
  constructor(public readonly fieldErrors: SellerFieldErrors) {
    super("Revise os campos informados");
    this.name = "SellerValidationError";
  }
}

export function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
