import type { StatusTone } from "@/app/_components/ui/status-badge";
import type { PayoutStage } from "@/modules/commissions";
import type { SellerMonthStatus } from "@/modules/sales/application/seller-payment-history";

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

/** A situação do mês na leitura do vendedor (Pagamentos e Resumo). */
export const SELLER_MONTH_STATUS_LABELS: Record<SellerMonthStatus, string> = {
  pago: "Pago",
  programado: "Programado",
  "em-fechamento": "Em fechamento",
  "aguardando-fechamento": "Aguardando fechamento",
  previsto: "Previsto",
  "sem-valor": "Sem valor",
};

export const SELLER_MONTH_STATUS_TONES: Record<SellerMonthStatus, StatusTone> =
  {
    pago: "received",
    programado: "reconciled",
    "em-fechamento": "pending",
    "aguardando-fechamento": "pending",
    previsto: "neutral",
    "sem-valor": "neutral",
  };
