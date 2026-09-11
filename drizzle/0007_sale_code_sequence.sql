CREATE SEQUENCE "public"."sale_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE FUNCTION "next_sale_code"() RETURNS varchar
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'V-' || lpad(n::text, greatest(6, length(n::text)), '0')
  FROM nextval('sale_code_seq') AS n
$$;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "code" SET DEFAULT next_sale_code();