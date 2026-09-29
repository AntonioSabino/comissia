import type { StatusTone } from "@/app/_components/ui/status-badge";
import type { PayoutStage } from "@/modules/commissions";

export const PAYOUT_STAGE_LABELS: Record<PayoutStage, string> = {
  "em-conferencia": "Em conferência",
  programado: "Programado",
  pago: "Pago",
  vazio: "Sem repasse",
};

/** Verde só para o que foi pago: no Design System, verde é dinheiro recebido. */
export const PAYOUT_STAGE_TONES: Record<PayoutStage, StatusTone> = {
  "em-conferencia": "pending",
  programado: "reconciled",
  pago: "received",
  vazio: "neutral",
};
