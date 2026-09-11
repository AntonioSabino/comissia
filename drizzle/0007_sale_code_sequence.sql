CREATE SEQUENCE "public"."sale_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
SELECT setval(
  'public.sale_code_seq',
  COALESCE(MAX(existing.number), 1),
  MAX(existing.number) IS NOT NULL
)
FROM (
  SELECT substring("code" FROM '^V-([0-9]+)$')::bigint AS number
  FROM "sales"
  WHERE "code" ~ '^V-[0-9]{1,19}$'
    AND substring("code" FROM '^V-([0-9]+)
) AS existing;--> statement-breakpoint
CREATE FUNCTION "next_sale_code"() RETURNS varchar
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'V-' || lpad(n::text, greatest(6, length(n::text)), '0')
  FROM nextval('public.sale_code_seq') AS n
$$;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "code" SET DEFAULT next_sale_code();
)::numeric BETWEEN 1 AND 9223372036854775807
) AS existing;--> statement-breakpoint
CREATE FUNCTION "next_sale_code"() RETURNS varchar
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'V-' || lpad(n::text, greatest(6, length(n::text)), '0')
  FROM nextval('public.sale_code_seq') AS n
$$;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "code" SET DEFAULT next_sale_code();
