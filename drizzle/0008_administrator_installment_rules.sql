CREATE TABLE "administrator_installment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"administrator_id" uuid NOT NULL,
	"product" varchar(120) NOT NULL,
	"effective_from" date NOT NULL,
	"installment_rates_basis_points" integer[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "administrator_installment_rules_installments_check" CHECK (array_ndims("administrator_installment_rules"."installment_rates_basis_points") = 1 AND coalesce(array_length("administrator_installment_rules"."installment_rates_basis_points", 1), 0) BETWEEN 1 AND 120),
	CONSTRAINT "administrator_installment_rules_rates_check" CHECK (array_position("administrator_installment_rules"."installment_rates_basis_points", NULL) IS NULL AND 1 <= ALL ("administrator_installment_rules"."installment_rates_basis_points") AND 10000 >= ALL ("administrator_installment_rules"."installment_rates_basis_points"))
);
--> statement-breakpoint
ALTER TABLE "administrator_installment_rules" ADD CONSTRAINT "administrator_installment_rules_administrator_id_administrators_id_fk" FOREIGN KEY ("administrator_id") REFERENCES "public"."administrators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "administrator_installment_rules_effective_from_unique" ON "administrator_installment_rules" USING btree ("administrator_id",lower("product"),"effective_from");