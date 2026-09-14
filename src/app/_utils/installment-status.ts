import type { StatusTone } from "@/app/_components/ui/status-badge";
import type { CommissionInstallmentStatus } from "@/modules/commissions";

export const INSTALLMENT_STATUS_LABELS: Record<
  CommissionInstallmentStatus,
  string
> = {
  prevista: "Prevista",
  programada: "Programada",
  paga: "Paga",
  cancelada: "Cancelada",
  ajustada: "Ajustada",
};

/** Verde só para parcela paga: no Design System, verde é dinheiro recebido. */
export const INSTALLMENT_STATUS_TONES: Record<
  CommissionInstallmentStatus,
  StatusTone
> = {
  prevista: "pending",
  programada: "reconciled",
  paga: "received",
  cancelada: "cancelled",
  ajustada: "neutral",
};
