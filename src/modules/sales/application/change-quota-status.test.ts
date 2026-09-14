import { describe, expect, it, vi } from "vitest";
import { QUOTA_STATUSES } from "../domain/quota-status";
import { changeQuotaStatus } from "./change-quota-status";
import {
  QuotaStatusUnchangedError,
  QuotaStatusValidationError,
  SaleNotFoundError,
} from "./errors";
import type { QuotaStatusRepository } from "./quota-status-repository";

const SALE_ID = "8fd84c56-bf64-4355-8cb2-24f389b25e18";
const CHANGED_AT = "2026-09-14T15:30:00.000Z";

function createRepository(
  result: Awaited<ReturnType<QuotaStatusRepository["changeStatus"]>> = {
    kind: "updated",
    previousStatus: "adimplente",
    status: "inadimplente",
    changedAt: CHANGED_AT,
  },
): QuotaStatusRepository {
  return {
    changeStatus: vi.fn().mockResolvedValue(result),
    listHistory: vi.fn().mockResolvedValue([]),
  };
}

describe("changeQuotaStatus", () => {
  it.each(QUOTA_STATUSES)("aceita a situação %s", async (status) => {
    const repository = createRepository({
      kind: "updated",
      previousStatus: "adimplente",
      status,
      changedAt: CHANGED_AT,
    });

    await expect(
      changeQuotaStatus({ saleId: SALE_ID, status }, { repository }),
    ).resolves.toEqual({
      id: SALE_ID,
      previousStatus: "adimplente",
      status,
      changedAt: CHANGED_AT,
    });
    expect(repository.changeStatus).toHaveBeenCalledWith(SALE_ID, status);
  });

  it("recusa identificador inválido antes de consultar o repositório", async () => {
    const repository = createRepository();

    await expect(
      changeQuotaStatus(
        { saleId: "venda-1", status: "inadimplente" },
        { repository },
      ),
    ).rejects.toBeInstanceOf(QuotaStatusValidationError);
    expect(repository.changeStatus).not.toHaveBeenCalled();
  });

  it("recusa situação desconhecida antes de consultar o repositório", async () => {
    const repository = createRepository();

    await expect(
      changeQuotaStatus({ saleId: SALE_ID, status: "quitado" }, { repository }),
    ).rejects.toBeInstanceOf(QuotaStatusValidationError);
    expect(repository.changeStatus).not.toHaveBeenCalled();
  });

  it("informa quando a venda não existe", async () => {
    const repository = createRepository({ kind: "not-found" });

    await expect(
      changeQuotaStatus(
        { saleId: SALE_ID, status: "cancelado" },
        { repository },
      ),
    ).rejects.toBeInstanceOf(SaleNotFoundError);
  });

  it("recusa registrar novamente a situação atual", async () => {
    const repository = createRepository({ kind: "unchanged" });

    await expect(
      changeQuotaStatus(
        { saleId: SALE_ID, status: "adimplente" },
        { repository },
      ),
    ).rejects.toBeInstanceOf(QuotaStatusUnchangedError);
  });
});
