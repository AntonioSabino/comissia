/** Situações da cota, nos termos usados pelo negócio. */
export const QUOTA_STATUSES = [
  "adimplente",
  "inadimplente",
  "cancelado",
  "contemplado",
] as const;

export type QuotaStatus = (typeof QUOTA_STATUSES)[number];

export const INITIAL_QUOTA_STATUS: QuotaStatus = "adimplente";

export function isQuotaStatus(value: unknown): value is QuotaStatus {
  return QUOTA_STATUSES.some((status) => status === value);
}
