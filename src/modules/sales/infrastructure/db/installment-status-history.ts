import {
  currentCommissionInstallmentStatus,
  type CommissionInstallmentStatus,
  type CommissionInstallmentStatusHistoryEntry,
} from "@/modules/commissions";

export type InstallmentStatusEventRow = {
  installmentId: string;
  previousStatus: CommissionInstallmentStatus | null;
  status: CommissionInstallmentStatus | null;
  changedAt: Date | null;
};

/**
 * As consultas trazem uma linha por evento de situação. Aqui elas viram o
 * histórico de cada parcela, na ordem em que vieram, para que a situação seja
 * sempre derivada pelo domínio — e não por um campo que poderia divergir.
 */
export function collectStatusHistories(
  rows: readonly InstallmentStatusEventRow[],
): Map<string, CommissionInstallmentStatusHistoryEntry[]> {
  const histories = new Map<
    string,
    CommissionInstallmentStatusHistoryEntry[]
  >();

  for (const row of rows) {
    const history = histories.get(row.installmentId) ?? [];

    if (row.status && row.changedAt) {
      history.push({
        previousStatus: row.previousStatus,
        status: row.status,
        changedAt: row.changedAt.toISOString(),
      });
    }

    histories.set(row.installmentId, history);
  }

  return histories;
}

/**
 * Sem atalho: parcela sem histórico é inconsistência de persistência, e o
 * domínio recusa histórico vazio em vez de apresentar uma situação que ninguém
 * registrou.
 */
export function resolveInstallmentStatus(
  histories: Map<string, CommissionInstallmentStatusHistoryEntry[]>,
  installmentId: string,
): CommissionInstallmentStatus {
  return currentCommissionInstallmentStatus(histories.get(installmentId) ?? []);
}
