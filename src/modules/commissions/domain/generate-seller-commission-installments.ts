import {
  allocateSellerCommissionInstallments,
  type SellerCommissionInstallmentAllocationInput,
} from "./allocate-seller-commission-installments";
import {
  buildCommissionInstallmentSchedule,
  type CommissionInstallmentScheduleInput,
} from "./commission-installment-schedule";
import {
  createCommissionInstallmentStatusHistory,
  type CommissionInstallmentStatusHistory,
} from "./commission-installment-status";

export type GenerateSellerCommissionInstallmentsInput =
  SellerCommissionInstallmentAllocationInput &
    Pick<CommissionInstallmentScheduleInput, "firstInstallmentDueOn"> & {
      /** Instante em que as parcelas são geradas e nascem como previstas. */
      createdAt: Date;
    };

export type GeneratedSellerCommissionInstallment = Readonly<{
  number: number;
  displayNumber: string;
  rateBasisPoints: number;
  competence: string;
  dueOn: string;
  amountInCents: bigint;
  statusHistory: CommissionInstallmentStatusHistory;
}>;

export type GeneratedSellerCommissionInstallments =
  readonly GeneratedSellerCommissionInstallment[];

/**
 * Compõe distribuição financeira, agenda mensal e situação inicial sem alterar
 * nenhum dos dados recebidos.
 */
export function generateSellerCommissionInstallments({
  creditAmountInCents,
  sellerRateBasisPoints,
  installmentRatesBasisPoints,
  firstInstallmentDueOn,
  createdAt,
}: GenerateSellerCommissionInstallmentsInput): GeneratedSellerCommissionInstallments {
  const allocation = allocateSellerCommissionInstallments({
    creditAmountInCents,
    sellerRateBasisPoints,
    installmentRatesBasisPoints,
  });
  const schedule = buildCommissionInstallmentSchedule({
    firstInstallmentDueOn,
    installments: allocation.length,
  });
  const totalInstallments = allocation.length;

  return Object.freeze(
    allocation.map((allocated, index) => {
      const scheduled = schedule[index];

      return Object.freeze({
        number: allocated.number,
        displayNumber: `${allocated.number}/${totalInstallments}`,
        rateBasisPoints: allocated.rateBasisPoints,
        competence: scheduled.competence,
        dueOn: scheduled.dueOn,
        amountInCents: allocated.amountInCents,
        statusHistory: createCommissionInstallmentStatusHistory(createdAt),
      });
    }),
  );
}
