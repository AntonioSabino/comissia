import { SellerNotFoundError, SellerStatusValidationError } from "./errors";
import type { SellerRepository } from "./seller-repository";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ChangeSellerStatusDependencies = {
  repository: SellerRepository;
};

export async function changeSellerStatus(
  input: { sellerId: unknown; active: unknown },
  dependencies: ChangeSellerStatusDependencies,
): Promise<{ id: string; active: boolean }> {
  if (
    typeof input.sellerId !== "string" ||
    !UUID_PATTERN.test(input.sellerId)
  ) {
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
