CREATE TYPE "public"."commission_installment_status" AS ENUM('prevista', 'programada', 'paga', 'cancelada', 'ajustada');--> statement-breakpoint
CREATE TABLE "commission_installment_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installment_id" uuid NOT NULL,
	"previous_status" "commission_installment_status",
	"status" "commission_installment_status" NOT NULL,
	"changed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_installment_status_events_installment_changed_unique" UNIQUE("installment_id","changed_at"),
	CONSTRAINT "commission_installment_status_events_transition_check" CHECK ("commission_installment_status_events"."previous_status" IS NULL OR "commission_installment_status_events"."previous_status" <> "commission_installment_status_events"."status")
);
--> statement-breakpoint
CREATE TABLE "commission_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"competence" varchar(7) NOT NULL,
	"due_on" date NOT NULL,
	"rule_rate_basis_points" integer NOT NULL,
	"amount_in_cents" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_installments_sale_number_unique" UNIQUE("sale_id","number"),
	CONSTRAINT "commission_installments_number_check" CHECK ("commission_installments"."number" > 0 AND "commission_installments"."number" <= 120),
	CONSTRAINT "commission_installments_competence_check" CHECK ("commission_installments"."competence" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "commission_installments_rule_rate_basis_points_check" CHECK ("commission_installments"."rule_rate_basis_points" > 0 AND "commission_installments"."rule_rate_basis_points" <= 10000),
	CONSTRAINT "commission_installments_amount_in_cents_check" CHECK ("commission_installments"."amount_in_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "administrator_installment_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "installment_rates_basis_points" integer[];--> statement-breakpoint
ALTER TABLE "commission_installment_status_events" ADD CONSTRAINT "commission_installment_status_events_installment_id_commission_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."commission_installments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_installments" ADD CONSTRAINT "commission_installments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commission_installments_competence_index" ON "commission_installments" USING btree ("competence");--> statement-breakpoint
ALTER TABLE "administrator_installment_rules" ADD CONSTRAINT "administrator_installment_rules_id_administrator_rates_unique" UNIQUE("id","administrator_id","installment_rates_basis_points");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_installment_rule_snapshot_fk" FOREIGN KEY ("administrator_installment_rule_id","administrator_id","installment_rates_basis_points") REFERENCES "public"."administrator_installment_rules"("id","administrator_id","installment_rates_basis_points") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_installment_rule_snapshot_check" CHECK (num_nulls("sales"."administrator_installment_rule_id", "sales"."installment_rates_basis_points") IN (0, 2));--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_commission_installments_snapshot_check" CHECK ("sales"."installment_rates_basis_points" IS NULL OR "sales"."commission_installments" = coalesce(array_length("sales"."installment_rates_basis_points", 1), 0));