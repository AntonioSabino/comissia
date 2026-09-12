export {
  INITIAL_QUOTA_STATUS,
  isQuotaStatus,
  QUOTA_STATUSES,
  type QuotaStatus,
} from "./domain/quota-status";
export {
  administrators,
  quotaStatusEnum,
  saleCodeSequence,
  sales,
} from "./infrastructure/db/schema";
export type {
  Administrator,
  NewAdministrator,
  NewSale,
  Sale,
} from "./infrastructure/db/schema";
