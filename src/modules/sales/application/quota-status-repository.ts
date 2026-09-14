import type { QuotaStatus } from "../domain/quota-status";

export type QuotaStatusHistoryEntry = {
  id: string;
  sequence: number;
  previousStatus: QuotaStatus | null;
  status: QuotaStatus;
  changedAt: string;
};

export type QuotaStatusChangePersistenceResult =
  | { kind: "not-found" }
  | { kind: "unchanged" }
  | {
      kind: "updated";
      previousStatus: QuotaStatus;
      status: QuotaStatus;
      changedAt: string;
    };

export interface QuotaStatusRepository {
  changeStatus(
    saleId: string,
    status: QuotaStatus,
  ): Promise<QuotaStatusChangePersistenceResult>;
  listHistory(saleId: string): Promise<QuotaStatusHistoryEntry[]>;
}
