ALTER TABLE "commission_installment_status_events" DROP CONSTRAINT "commission_installment_status_events_installment_changed_unique";--> statement-breakpoint
-- A coluna entra com valor padrão para não falhar se algum evento já existir,
-- e o padrão é removido em seguida: a posição é sempre informada.
ALTER TABLE "commission_installment_status_events" ADD COLUMN "sequence" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "commission_installment_status_events" ALTER COLUMN "sequence" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "commission_installment_status_events" ADD CONSTRAINT "commission_installment_status_events_installment_sequence_unique" UNIQUE("installment_id","sequence");--> statement-breakpoint
ALTER TABLE "commission_installment_status_events" ADD CONSTRAINT "commission_installment_status_events_sequence_check" CHECK ("commission_installment_status_events"."sequence" > 0);