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
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { COMMISSION_INSTALLMENT_STATUSES } from "../../../commissions";
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
    // Sustenta a chave estrangeira composta do snapshot gravado na venda.
    unique("administrator_installment_rules_id_administrator_rates_unique").on(
      table.id,
      table.administratorId,
      table.installmentRatesBasisPoints,
    ),
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
    /**
     * Régua aplicada. Nula somente nas vendas registradas antes da régua
     * existir; toda venda nova grava a versão e a distribuição juntas.
     */
    administratorInstallmentRuleId: uuid("administrator_installment_rule_id"),
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
    installmentRatesBasisPoints: integer(
      "installment_rates_basis_points",
    ).array(),
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
    foreignKey({
      name: "sales_installment_rule_snapshot_fk",
      columns: [
        table.administratorInstallmentRuleId,
        table.administratorId,
        table.installmentRatesBasisPoints,
      ],
      foreignColumns: [
        administratorInstallmentRules.id,
        administratorInstallmentRules.administratorId,
        administratorInstallmentRules.installmentRatesBasisPoints,
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
    // A versão da régua e a distribuição aplicada são um único fato.
    check(
      "sales_installment_rule_snapshot_check",
      sql`num_nulls(${table.administratorInstallmentRuleId}, ${table.installmentRatesBasisPoints}) IN (0, 2)`,
    ),
    // Com régua gravada, a quantidade de parcelas é a da própria distribuição.
    check(
      "sales_commission_installments_snapshot_check",
      sql`${table.installmentRatesBasisPoints} IS NULL OR ${table.commissionInstallments} = coalesce(array_length(${table.installmentRatesBasisPoints}, 1), 0)`,
    ),
  ],
);

export const commissionInstallmentStatusEnum = pgEnum(
  "commission_installment_status",
  COMMISSION_INSTALLMENT_STATUSES,
);

/**
 * Parcelas previstas de comissão do vendedor, geradas no cadastro da venda a
 * partir da régua da administradora. `rule_rate_basis_points` é o pedaço da
 * régua que originou a parcela e `amount_in_cents` é o valor do vendedor, em
 * centavos inteiros.
 */
export const commissionInstallments = pgTable(
  "commission_installments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    number: integer("number").notNull(),
    /** Competência no formato AAAA-MM. */
    competence: varchar("competence", { length: 7 }).notNull(),
    dueOn: date("due_on").notNull(),
    ruleRateBasisPoints: integer("rule_rate_basis_points").notNull(),
    amountInCents: bigint("amount_in_cents", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("commission_installments_sale_number_unique").on(
      table.saleId,
      table.number,
    ),
    index("commission_installments_competence_index").on(table.competence),
    check(
      "commission_installments_number_check",
      sql`${table.number} > 0 AND ${table.number} <= 120`,
    ),
    check(
      "commission_installments_competence_check",
      sql`${table.competence} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
    ),
    check(
      "commission_installments_rule_rate_basis_points_check",
      sql`${table.ruleRateBasisPoints} > 0 AND ${table.ruleRateBasisPoints} <= 10000`,
    ),
    // Uma parcela pode ser zero quando a comissão total é de poucos centavos.
    check(
      "commission_installments_amount_in_cents_check",
      sql`${table.amountInCents} >= 0`,
    ),
  ],
);

/**
 * Histórico de situação da parcela. A situação atual é a do último evento, como
 * definido no domínio: não existe campo de situação que possa divergir daqui.
 * A ordem é a de `sequence`, e não a do instante: o domínio aceita duas
 * mudanças no mesmo instante, então datar não serve para ordenar nem para
 * identificar. A tabela é apenas de inclusão: o gatilho criado na migração
 * `0011` recusa `UPDATE` e `DELETE`.
 */
export const commissionInstallmentStatusEvents = pgTable(
  "commission_installment_status_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    installmentId: uuid("installment_id")
      .notNull()
      .references(() => commissionInstallments.id, { onDelete: "restrict" }),
    /** Posição no histórico da parcela, a partir de 1. */
    sequence: integer("sequence").notNull(),
    previousStatus: commissionInstallmentStatusEnum("previous_status"),
    status: commissionInstallmentStatusEnum("status").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique(
      "commission_installment_status_events_installment_sequence_unique",
    ).on(table.installmentId, table.sequence),
    check(
      "commission_installment_status_events_sequence_check",
      sql`${table.sequence} > 0`,
    ),
    check(
      "commission_installment_status_events_transition_check",
      sql`${table.previousStatus} IS NULL OR ${table.previousStatus} <> ${table.status}`,
    ),
  ],
);

export type CommissionInstallment = typeof commissionInstallments.$inferSelect;
export type NewCommissionInstallment =
  typeof commissionInstallments.$inferInsert;
export type CommissionInstallmentStatusEvent =
  typeof commissionInstallmentStatusEvents.$inferSelect;
export type NewCommissionInstallmentStatusEvent =
  typeof commissionInstallmentStatusEvents.$inferInsert;

export type Administrator = typeof administrators.$inferSelect;
export type NewAdministrator = typeof administrators.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type AdministratorInstallmentRule =
  typeof administratorInstallmentRules.$inferSelect;
export type NewAdministratorInstallmentRule =
  typeof administratorInstallmentRules.$inferInsert;
