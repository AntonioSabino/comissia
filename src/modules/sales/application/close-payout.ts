import { PAYOUT_PAYMENT, PAYOUT_REVIEW } from "@/modules/commissions";
import { isUuid } from "@/shared/uuid";
import {
  NothingToPayError,
  NothingToReviewError,
  PayoutValidationError,
} from "./errors";
import { isCompetence } from "./monthly-commission-forecast";
import type {
  PayoutRepository,
  PayoutTransitionResult,
} from "./payout-repository";

type PayoutDependencies = {
  repository: PayoutRepository;
  now?: () => Date;
};

function readCompetence(value: unknown): string {
  if (!isCompetence(value)) {
    throw new PayoutValidationError("Informe uma competência válida");
  }

  return value;
}

/**
 * Confere o fechamento do mês: todas as parcelas previstas da competência
 * passam a programadas. As que já avançaram ficam como estão.
 */
export async function reviewPayoutClosing(
  input: { competence: unknown },
  { repository, now = () => new Date() }: PayoutDependencies,
): Promise<PayoutTransitionResult> {
  const competence = readCompetence(input.competence);
  const result = await repository.advance({
    competence,
    transition: PAYOUT_REVIEW,
    changedAt: now(),
  });

  if (result.installments === 0) {
    throw new NothingToReviewError();
  }

  return result;
}

/**
 * Registra o pagamento de um vendedor na competência: as parcelas programadas
 * dele passam a pagas. Previstas continuam aguardando a conferência.
 */
export async function paySellerPayout(
  input: { competence: unknown; sellerId: unknown },
  { repository, now = () => new Date() }: PayoutDependencies,
): Promise<PayoutTransitionResult> {
  const competence = readCompetence(input.competence);

  if (!isUuid(input.sellerId)) {
    throw new PayoutValidationError("Identificador do vendedor inválido");
  }

  const result = await repository.advance({
    competence,
    sellerId: input.sellerId,
    transition: PAYOUT_PAYMENT,
    changedAt: now(),
  });

  if (result.installments === 0) {
    throw new NothingToPayError();
  }

  return result;
}
