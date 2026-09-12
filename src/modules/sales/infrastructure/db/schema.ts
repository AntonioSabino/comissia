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
import {
  INITIAL_QUOTA_STATUS,
  QUOTA_STATUSES,
} from "../../domain/quota-status";

export const quotaStatusEnum = pgEnum("quota_status", QUOTA_STATUSES);

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
      .default(INITIAL_QUOTA_STATUS),
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

/**
 * Régua de parcelas definida pela administradora para um produto ou plano.
 * Cada linha é uma versão vigente a partir de `effective_from`, com a
 * distribuição em pontos-base na ordem da primeira à última parcela. A tabela
 * é apenas de inclusão (migração `0009`): uma nova vigência não altera as
 * versões históricas.
 */
export const administratorInstallmentRules = pgTable(
  "administrator_installment_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    administratorId: uuid("administrator_id")
      .notNull()
      .references(() => administrators.id, { onDelete: "restrict" }),
    product: varchar("product", { length: 120 }).notNull(),
    effectiveFrom: date("effective_from").notNull(),
    installmentRatesBasisPoints: integer("installment_rates_basis_points")
      .array()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Uma vigência por administradora e produto, sem diferenciar maiúsculas de minúsculas.
    uniqueIndex("administrator_installment_rules_effective_from_unique").on(
      table.administratorId,
      sql`lower(${table.product})`,
      table.effectiveFrom,
    ),
    check(
      "administrator_installment_rules_installments_check",
      sql`array_ndims(${table.installmentRatesBasisPoints}) = 1 AND coalesce(array_length(${table.installmentRatesBasisPoints}, 1), 0) BETWEEN 1 AND 120`,
    ),
    // Percentuais inteiros e positivos, sem nenhum elemento ausente.
    check(
      "administrator_installment_rules_rates_check",
      sql`array_position(${table.installmentRatesBasisPoints}, NULL) IS NULL AND 1 <= ALL (${table.installmentRatesBasisPoints}) AND 10000 >= ALL (${table.installmentRatesBasisPoints})`,
    ),
  ],
);

export type Administrator = typeof administrators.$inferSelect;
export type NewAdministrator = typeof administrators.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type AdministratorInstallmentRule =
  typeof administratorInstallmentRules.$inferSelect;
export type NewAdministratorInstallmentRule =
  typeof administratorInstallmentRules.$inferInsert;
