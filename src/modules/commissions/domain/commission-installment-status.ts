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

/**
 * O histórico é a própria sequência de mudanças, em ordem cronológica. A
 * situação atual é sempre a da última entrada, e não um campo à parte que
 * poderia divergir do histórico gravado.
 */
export type CommissionInstallmentStatusHistory =
  readonly CommissionInstallmentStatusHistoryEntry[];

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

function freezeHistory(
  entries: CommissionInstallmentStatusHistoryEntry[],
): CommissionInstallmentStatusHistory {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

/** Inicia o histórico de uma nova parcela na situação Prevista. */
export function createCommissionInstallmentStatusHistory(
  createdAt: Date,
): CommissionInstallmentStatusHistory {
  return freezeHistory([
    {
      previousStatus: null,
      status: INITIAL_COMMISSION_INSTALLMENT_STATUS,
      changedAt: toIsoInstant(createdAt),
    },
  ]);
}

/** Situação atual da parcela: a da última mudança registrada. */
export function currentCommissionInstallmentStatus(
  history: CommissionInstallmentStatusHistory,
): CommissionInstallmentStatus {
  const lastEntry = history.at(-1);

  if (!lastEntry) {
    throw new CommissionInstallmentStatusError(
      "O histórico da parcela não tem nenhuma situação registrada",
    );
  }

  return lastEntry.status;
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
  const currentStatus = currentCommissionInstallmentStatus(history);

  if (!isCommissionInstallmentStatus(nextStatus)) {
    throw new CommissionInstallmentStatusError(
      "Informe uma situação de parcela válida",
    );
  }

  if (nextStatus === currentStatus) {
    throw new CommissionInstallmentStatusError(
      "A nova situação deve ser diferente da situação atual",
    );
  }

  const changedAtIso = toIsoInstant(changedAt);
  const lastEntry = history.at(-1);

  if (lastEntry && changedAtIso < lastEntry.changedAt) {
    throw new CommissionInstallmentStatusError(
      "A mudança não pode ser anterior ao último registro",
    );
  }

  return freezeHistory([
    ...history,
    {
      previousStatus: currentStatus,
      status: nextStatus,
      changedAt: changedAtIso,
    },
  ]);
}
