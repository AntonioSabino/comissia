import type { StatusTone } from "@/app/_components/ui/status-badge";
import type { QuotaStatus } from "@/modules/sales";

export const QUOTA_STATUS_LABELS: Record<QuotaStatus, string> = {
  adimplente: "Adimplente",
  inadimplente: "Inadimplente",
  cancelado: "Cancelada",
  contemplado: "Contemplada",
};

export const QUOTA_STATUS_TONES: Record<QuotaStatus, StatusTone> = {
  adimplente: "received",
  inadimplente: "pending",
  cancelado: "cancelled",
  contemplado: "reconciled",
};
