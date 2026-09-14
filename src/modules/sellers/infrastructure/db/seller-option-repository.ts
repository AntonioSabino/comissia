import { asc } from "drizzle-orm";
import { db } from "@/db";
import type { SellerOptionRepository } from "../../application/seller-option-repository";
import { sellers } from "./schema";

export const sellerOptionRepository: SellerOptionRepository = {
  listOptions() {
    return db
      .select({ id: sellers.id, name: sellers.name })
      .from(sellers)
      .orderBy(asc(sellers.name));
  },
};
