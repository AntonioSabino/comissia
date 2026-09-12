import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sales } from "../../../sales";
import { COMMISSION_INSTALLMENT_STATUSES } from "../../domain/commission-installment-status";

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
 * A tabela é apenas de inclusão (migração `0011`).
 */
export const commissionInstallmentStatusEvents = pgTable(
  "commission_installment_status_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    installmentId: uuid("installment_id")
      .notNull()
      .references(() => commissionInstallments.id, { onDelete: "restrict" }),
    previousStatus: commissionInstallmentStatusEnum("previous_status"),
    status: commissionInstallmentStatusEnum("status").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique(
      "commission_installment_status_events_installment_changed_unique",
    ).on(table.installmentId, table.changedAt),
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
