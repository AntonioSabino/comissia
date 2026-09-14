CREATE TABLE "sale_quota_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"previous_status" "quota_status",
	"status" "quota_status" NOT NULL,
	"changed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_quota_status_events_sale_sequence_unique" UNIQUE("sale_id","sequence"),
	CONSTRAINT "sale_quota_status_events_history_check" CHECK (("sale_quota_status_events"."sequence" = 1 AND "sale_quota_status_events"."previous_status" IS NULL) OR ("sale_quota_status_events"."sequence" > 1 AND "sale_quota_status_events"."previous_status" IS NOT NULL AND "sale_quota_status_events"."previous_status" <> "sale_quota_status_events"."status"))
);
--> statement-breakpoint
ALTER TABLE "sale_quota_status_events" ADD CONSTRAINT "sale_quota_status_events_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_quota_status_events_sale_changed_at_index" ON "sale_quota_status_events" USING btree ("sale_id","changed_at");--> statement-breakpoint

-- Antes desta história não existia um caminho de alteração na aplicação. O
-- estado encontrado é, portanto, a situação inicial conhecida de cada venda.
INSERT INTO "sale_quota_status_events" (
	"sale_id",
	"sequence",
	"previous_status",
	"status",
	"changed_at"
)
SELECT
	"id",
	1,
	NULL,
	"quota_status",
	"created_at"
FROM "sales";--> statement-breakpoint

CREATE OR REPLACE FUNCTION "record_initial_sale_quota_status"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	INSERT INTO "sale_quota_status_events" (
		"sale_id",
		"sequence",
		"previous_status",
		"status",
		"changed_at"
	)
	VALUES (NEW."id", 1, NULL, NEW."quota_status", NEW."created_at");

	RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER "sales_initial_quota_status_event"
AFTER INSERT ON "sales"
FOR EACH ROW
EXECUTE FUNCTION "record_initial_sale_quota_status"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "record_sale_quota_status_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	next_sequence integer;
BEGIN
	SELECT coalesce(max("sequence"), 0) + 1
	INTO next_sequence
	FROM "sale_quota_status_events"
	WHERE "sale_id" = NEW."id";

	INSERT INTO "sale_quota_status_events" (
		"sale_id",
		"sequence",
		"previous_status",
		"status",
		"changed_at"
	)
	VALUES (
		NEW."id",
		next_sequence,
		OLD."quota_status",
		NEW."quota_status",
		CASE
			WHEN NEW."updated_at" IS DISTINCT FROM OLD."updated_at" THEN NEW."updated_at"
			ELSE CURRENT_TIMESTAMP
		END
	);

	RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER "sales_quota_status_changed_event"
AFTER UPDATE OF "quota_status" ON "sales"
FOR EACH ROW
WHEN (OLD."quota_status" IS DISTINCT FROM NEW."quota_status")
EXECUTE FUNCTION "record_sale_quota_status_change"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "reject_sale_quota_status_event_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'sale_quota_status_events is append-only';
END;
$$;--> statement-breakpoint

CREATE TRIGGER "sale_quota_status_events_append_only"
BEFORE UPDATE OR DELETE ON "sale_quota_status_events"
FOR EACH ROW
EXECUTE FUNCTION "reject_sale_quota_status_event_mutation"();
