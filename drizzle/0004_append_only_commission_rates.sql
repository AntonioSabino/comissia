CREATE FUNCTION "prevent_seller_commission_rate_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'seller_commission_rates is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "seller_commission_rates_append_only"
BEFORE UPDATE OR DELETE ON "seller_commission_rates"
FOR EACH ROW
EXECUTE FUNCTION "prevent_seller_commission_rate_mutation"();
