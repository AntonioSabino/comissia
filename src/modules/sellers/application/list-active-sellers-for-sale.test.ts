import { describe, expect, it, vi } from "vitest";
import { listActiveSellersForSale } from "./list-active-sellers-for-sale";
import type { SellerRepository } from "./seller-repository";

describe("listActiveSellersForSale", () => {
  it("solicita exclusivamente vendedores ativos", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue([]),
    } as unknown as SellerRepository;

    await expect(listActiveSellersForSale({ repository })).resolves.toEqual([]);
    expect(repository.list).toHaveBeenCalledWith({ active: true });
  });
});
