import { describe, expect, it, vi } from "vitest";
import { listSellerOptions } from "./list-seller-options";
import type { SellerOptionRepository } from "./seller-option-repository";

describe("listSellerOptions", () => {
  it("delega uma leitura específica de identificador e nome", async () => {
    const options = [
      { id: "fe61522d-5091-4907-8b0c-498cdf956ef4", name: "Ana Lima" },
      { id: "c474244c-b861-47c7-ae82-e0082d636aa6", name: "Bruno Alves" },
    ];
    const repository: SellerOptionRepository = {
      listOptions: vi.fn().mockResolvedValue(options),
    };

    await expect(listSellerOptions({ repository })).resolves.toEqual(options);
    expect(repository.listOptions).toHaveBeenCalledOnce();
  });
});
