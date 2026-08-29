CREATE TABLE "seller_commission_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"rate_basis_points" integer NOT NULL,
	"effective_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_commission_rates_seller_effective_from_unique" UNIQUE("seller_id","effective_from"),
	CONSTRAINT "seller_commission_rates_rate_basis_points_check" CHECK ("seller_commission_rates"."rate_basis_points" > 0 AND "seller_commission_rates"."rate_basis_points" <= 10000)
);
--> statement-breakpoint
ALTER TABLE "seller_commission_rates" ADD CONSTRAINT "seller_commission_rates_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE restrict ON UPDATE no action;
