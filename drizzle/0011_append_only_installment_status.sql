CREATE FUNCTION "prevent_commission_installment_status_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'commission_installment_status_events is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "commission_installment_status_events_append_only"
BEFORE UPDATE OR DELETE ON "commission_installment_status_events"
FOR EACH ROW
EXECUTE FUNCTION "prevent_commission_installment_status_mutation"();
