CREATE TABLE "sellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"document" varchar(14) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(20),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sellers_document_unique" UNIQUE("document"),
	CONSTRAINT "sellers_email_unique" UNIQUE("email")
);
