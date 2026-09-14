import { isUuid } from "@/shared/uuid";
import { isQuotaStatus, type QuotaStatus } from "../domain/quota-status";
import {
  QuotaStatusUnchangedError,
  QuotaStatusValidationError,
  SaleNotFoundError,
} from "./errors";
import type { QuotaStatusRepository } from "./quota-status-repository";

type ChangeQuotaStatusDependencies = {
  repository: QuotaStatusRepository;
};

export type QuotaStatusChange = {
  id: string;
  previousStatus: QuotaStatus;
  status: QuotaStatus;
  changedAt: string;
};

export async function changeQuotaStatus(
  input: { saleId: unknown; status: unknown },
  { repository }: ChangeQuotaStatusDependencies,
): Promise<QuotaStatusChange> {
  if (!isUuid(input.saleId)) {
    throw new QuotaStatusValidationError("Identificador da venda inválido");
  }

  if (!isQuotaStatus(input.status)) {
    throw new QuotaStatusValidationError("Informe uma situação da cota válida");
  }

  const result = await repository.changeStatus(input.saleId, input.status);

  if (result.kind === "not-found") {
    throw new SaleNotFoundError();
  }

  if (result.kind === "unchanged") {
    throw new QuotaStatusUnchangedError();
  }

  return {
    id: input.saleId,
    previousStatus: result.previousStatus,
    status: result.status,
    changedAt: result.changedAt,
  };
}
