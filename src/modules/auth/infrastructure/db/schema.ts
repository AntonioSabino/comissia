import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sellers } from "../../../sellers";

export const userRoleEnum = pgEnum("user_role", ["admin", "seller"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 254 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull(),
    sellerId: uuid("seller_id").references(() => sellers.id, {
      onDelete: "restrict",
    }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("users_seller_id_unique").on(table.sellerId),
    check(
      "users_role_seller_link_check",
      sql`(${table.role} = 'seller' AND ${table.sellerId} IS NOT NULL)
          OR (${table.role} = 'admin' AND ${table.sellerId} IS NULL)`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
