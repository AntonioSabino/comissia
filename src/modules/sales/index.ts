export type {
  SaleDetails,
  SaleInstallmentDetail,
} from "./application/sale-repository";
export {
  INITIAL_QUOTA_STATUS,
  isQuotaStatus,
  QUOTA_STATUSES,
  type QuotaStatus,
} from "./domain/quota-status";
export {
  administratorInstallmentRules,
  administrators,
  commissionInstallments,
  commissionInstallmentStatusEnum,
  commissionInstallmentStatusEvents,
  quotaStatusEnum,
  saleCodeSequence,
  saleQuotaStatusEvents,
  sales,
} from "./infrastructure/db/schema";
export type {
  Administrator,
  AdministratorInstallmentRule,
  CommissionInstallment,
  CommissionInstallmentStatusEvent,
  NewAdministrator,
  NewAdministratorInstallmentRule,
  NewCommissionInstallment,
  NewCommissionInstallmentStatusEvent,
  NewSale,
  NewSaleQuotaStatusEvent,
  Sale,
  SaleQuotaStatusEvent,
} from "./infrastructure/db/schema";
