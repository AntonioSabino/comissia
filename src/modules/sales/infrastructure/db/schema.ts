import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sellerCommissionRates, sellers } from "../../../sellers";

export const quotaStatusEnum = pgEnum("quota_status", [
  "adimplente",
  "inadimplente",
  "cancelado",
  "contemplado",
]);

export const administrators = pgTable(
  "administrators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Único sem diferenciar maiúsculas de minúsculas, inclusive em cadastros simultâneos.
    uniqueIndex("administrators_name_lower_unique").on(
      sql`lower(${table.name})`,
    ),
  ],
);

/**
 * Numeração das vendas. A função `next_sale_code()`, criada na migração
 * `0007`, formata o próximo número como `V-000001` sem truncar acima de seis
 * dígitos.
 */
export const saleCodeSequence = pgSequence("sale_code_seq");

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 40 })
      .notNull()
      .unique()
      .default(sql`next_sale_code()`),
    administratorId: uuid("administrator_id")
      .notNull()
      .references(() => administrators.id, { onDelete: "restrict" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "restrict" }),
    sellerCommissionRateId: uuid("seller_commission_rate_id").notNull(),
    customerName: varchar("customer_name", { length: 160 }).notNull(),
    product: varchar("product", { length: 120 }).notNull(),
    groupCode: varchar("group_code", { length: 20 }).notNull(),
    quotaCode: varchar("quota_code", { length: 20 }).notNull(),
    soldOn: date("sold_on").notNull(),
    creditAmountInCents: bigint("credit_amount_in_cents", {
      mode: "bigint",
    }).notNull(),
    sellerRateBasisPoints: integer("seller_rate_basis_points").notNull(),
    commissionInstallments: integer("commission_installments").notNull(),
    firstInstallmentDueOn: date("first_installment_due_on").notNull(),
    quotaStatus: quotaStatusEnum("quota_status")
      .notNull()
      .default("adimplente"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "sales_seller_commission_snapshot_fk",
      columns: [
        table.sellerCommissionRateId,
        table.sellerId,
        table.sellerRateBasisPoints,
      ],
      foreignColumns: [
        sellerCommissionRates.id,
        sellerCommissionRates.sellerId,
        sellerCommissionRates.rateBasisPoints,
      ],
    }).onDelete("restrict"),
    index("sales_seller_id_index").on(table.sellerId),
    index("sales_quota_index").on(
      table.administratorId,
      table.groupCode,
      table.quotaCode,
    ),
    check(
      "sales_credit_amount_in_cents_check",
      sql`${table.creditAmountInCents} > 0`,
    ),
    check(
      "sales_seller_rate_basis_points_check",
      sql`${table.sellerRateBasisPoints} > 0 AND ${table.sellerRateBasisPoints} <= 10000`,
    ),
    check(
      "sales_commission_installments_check",
      sql`${table.commissionInstallments} > 0 AND ${table.commissionInstallments} <= 120`,
    ),
    check(
      "sales_first_installment_due_on_check",
      sql`${table.firstInstallmentDueOn} >= ${table.soldOn}`,
    ),
  ],
);

export type Administrator = typeof administrators.$inferSelect;
export type NewAdministrator = typeof administrators.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type QuotaStatus = (typeof quotaStatusEnum.enumValues)[number];
