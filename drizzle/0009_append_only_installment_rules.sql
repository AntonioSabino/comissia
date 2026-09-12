CREATE FUNCTION "prevent_administrator_installment_rule_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'administrator_installment_rules is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "administrator_installment_rules_append_only"
BEFORE UPDATE OR DELETE ON "administrator_installment_rules"
FOR EACH ROW
EXECUTE FUNCTION "prevent_administrator_installment_rule_mutation"();
