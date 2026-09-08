CREATE TYPE "public"."quota_status" AS ENUM('adimplente', 'inadimplente', 'cancelado', 'contemplado');--> statement-breakpoint
CREATE TABLE "administrators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "administrators_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"administrator_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"seller_commission_rate_id" uuid NOT NULL,
	"customer_name" varchar(160) NOT NULL,
	"product" varchar(120) NOT NULL,
	"group_code" varchar(20) NOT NULL,
	"quota_code" varchar(20) NOT NULL,
	"sold_on" date NOT NULL,
	"credit_amount_in_cents" bigint NOT NULL,
	"seller_rate_basis_points" integer NOT NULL,
	"commission_installments" integer NOT NULL,
	"first_installment_due_on" date NOT NULL,
	"quota_status" "quota_status" DEFAULT 'adimplente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_code_unique" UNIQUE("code"),
	CONSTRAINT "sales_credit_amount_in_cents_check" CHECK ("sales"."credit_amount_in_cents" > 0),
	CONSTRAINT "sales_seller_rate_basis_points_check" CHECK ("sales"."seller_rate_basis_points" > 0 AND "sales"."seller_rate_basis_points" <= 10000),
	CONSTRAINT "sales_commission_installments_check" CHECK ("sales"."commission_installments" > 0 AND "sales"."commission_installments" <= 120),
	CONSTRAINT "sales_first_installment_due_on_check" CHECK ("sales"."first_installment_due_on" >= "sales"."sold_on")
);
--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_administrator_id_administrators_id_fk" FOREIGN KEY ("administrator_id") REFERENCES "public"."administrators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_commission_rate_id_seller_commission_rates_id_fk" FOREIGN KEY ("seller_commission_rate_id") REFERENCES "public"."seller_commission_rates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_seller_id_index" ON "sales" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "sales_quota_index" ON "sales" USING btree ("administrator_id","group_code","quota_code");