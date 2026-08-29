import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const sellers = pgTable("sellers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  document: varchar("document", { length: 14 }).notNull().unique(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sellerCommissionRates = pgTable(
  "seller_commission_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "restrict" }),
    rateBasisPoints: integer("rate_basis_points").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("seller_commission_rates_seller_effective_from_unique").on(
      table.sellerId,
      table.effectiveFrom,
    ),
    check(
      "seller_commission_rates_rate_basis_points_check",
      sql`${table.rateBasisPoints} > 0 AND ${table.rateBasisPoints} <= 10000`,
    ),
  ],
);

export type Seller = typeof sellers.$inferSelect;
export type NewSeller = typeof sellers.$inferInsert;
export type SellerCommissionRate = typeof sellerCommissionRates.$inferSelect;
export type NewSellerCommissionRate = typeof sellerCommissionRates.$inferInsert;
