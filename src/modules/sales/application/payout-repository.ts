import type { PayoutTransition } from "@/modules/commissions";

export type PayoutTransitionInput = {
  /** Competência no formato AAAA-MM. */
  competence: string;
  /** Sem vendedor, a transição vale para a competência inteira. */
  sellerId?: string;
  transition: PayoutTransition;
  changedAt: Date;
};

export type PayoutTransitionResult = {
  /** Parcelas que mudaram de situação. */
  installments: number;
  totalInCents: bigint;
};

export interface PayoutRepository {
  /**
   * Avança, numa única transação, as parcelas da competência que estão na
   * situação de origem, gravando um evento de histórico para cada uma.
   */
  advance(input: PayoutTransitionInput): Promise<PayoutTransitionResult>;
}
