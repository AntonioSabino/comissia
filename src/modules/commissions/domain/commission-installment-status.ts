export const COMMISSION_INSTALLMENT_STATUSES = [
  "prevista",
  "programada",
  "paga",
  "cancelada",
  "ajustada",
] as const;

export type CommissionInstallmentStatus =
  (typeof COMMISSION_INSTALLMENT_STATUSES)[number];

export const INITIAL_COMMISSION_INSTALLMENT_STATUS: CommissionInstallmentStatus =
  "prevista";

export type CommissionInstallmentStatusHistoryEntry = Readonly<{
  previousStatus: CommissionInstallmentStatus | null;
  status: CommissionInstallmentStatus;
  changedAt: string;
}>;

export type CommissionInstallmentStatusHistory = Readonly<{
  currentStatus: CommissionInstallmentStatus;
  entries: readonly CommissionInstallmentStatusHistoryEntry[];
}>;

export class CommissionInstallmentStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommissionInstallmentStatusError";
  }
}

export function isCommissionInstallmentStatus(
  value: unknown,
): value is CommissionInstallmentStatus {
  return COMMISSION_INSTALLMENT_STATUSES.some((status) => status === value);
}

function toIsoInstant(changedAt: Date): string {
  if (!(changedAt instanceof Date) || Number.isNaN(changedAt.getTime())) {
    throw new CommissionInstallmentStatusError(
      "Informe um instante válido para a mudança de situação",
    );
  }

  return changedAt.toISOString();
}

function createHistory(
  currentStatus: CommissionInstallmentStatus,
  entries: CommissionInstallmentStatusHistoryEntry[],
): CommissionInstallmentStatusHistory {
  return Object.freeze({
    currentStatus,
    entries: Object.freeze(entries.map((entry) => Object.freeze({ ...entry }))),
  });
}

/**
 * Inicia o histórico de uma nova parcela na situação Prevista.
 */
export function createCommissionInstallmentStatusHistory(
  createdAt: Date,
): CommissionInstallmentStatusHistory {
  return createHistory(INITIAL_COMMISSION_INSTALLMENT_STATUS, [
    {
      previousStatus: null,
      status: INITIAL_COMMISSION_INSTALLMENT_STATUS,
      changedAt: toIsoInstant(createdAt),
    },
  ]);
}

/**
 * Registra uma mudança sem alterar o histórico recebido. A ordem cronológica é
 * validada para impedir que uma transição retroativa corrompa a auditoria.
 */
export function changeCommissionInstallmentStatus(
  history: CommissionInstallmentStatusHistory,
  nextStatus: unknown,
  changedAt: Date,
): CommissionInstallmentStatusHistory {
  if (!isCommissionInstallmentStatus(nextStatus)) {
    throw new CommissionInstallmentStatusError(
      "Informe uma situação de parcela válida",
    );
  }

  if (nextStatus === history.currentStatus) {
    throw new CommissionInstallmentStatusError(
      "A nova situação deve ser diferente da situação atual",
    );
  }

  const changedAtIso = toIsoInstant(changedAt);
  const lastEntry = history.entries.at(-1);

  if (lastEntry && changedAtIso < lastEntry.changedAt) {
    throw new CommissionInstallmentStatusError(
      "A mudança não pode ser anterior ao último registro",
    );
  }

  return createHistory(nextStatus, [
    ...history.entries,
    {
      previousStatus: history.currentStatus,
      status: nextStatus,
      changedAt: changedAtIso,
    },
  ]);
}
