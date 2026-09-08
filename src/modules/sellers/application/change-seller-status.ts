import { SellerNotFoundError, SellerStatusValidationError } from "./errors";
import type { SellerRepository } from "./seller-repository";
import { isSellerId } from "../domain/seller-id";

type ChangeSellerStatusDependencies = {
  repository: SellerRepository;
};

export async function changeSellerStatus(
  input: { sellerId: unknown; active: unknown },
  dependencies: ChangeSellerStatusDependencies,
): Promise<{ id: string; active: boolean }> {
  if (!isSellerId(input.sellerId)) {
    throw new SellerStatusValidationError("Identificador do vendedor inválido");
  }

  if (typeof input.active !== "boolean") {
    throw new SellerStatusValidationError(
      "Informe se o vendedor deve ficar ativo ou inativo",
    );
  }

  const updated = await dependencies.repository.setActive(
    input.sellerId,
    input.active,
  );

  if (!updated) {
    throw new SellerNotFoundError();
  }

  return {
    id: input.sellerId,
    active: input.active,
  };
}
