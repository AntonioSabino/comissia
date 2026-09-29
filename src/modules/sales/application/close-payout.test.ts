import { describe, expect, it, vi } from "vitest";
import { PAYOUT_PAYMENT, PAYOUT_REVIEW } from "@/modules/commissions";
import { paySellerPayout, reviewPayoutClosing } from "./close-payout";
import {
  NothingToPayError,
  NothingToReviewError,
  PayoutValidationError,
} from "./errors";
import type {
  PayoutRepository,
  PayoutTransitionResult,
} from "./payout-repository";

const SELLER_ID = "8fd84c56-bf64-4355-8cb2-24f389b25e18";
const NOW = new Date("2026-08-03T12:00:00.000Z");

function createRepository(
  result: PayoutTransitionResult = {
    installments: 3,
    totalInCents: BigInt(88_333),
  },
): PayoutRepository {
  return { advance: vi.fn().mockResolvedValue(result) };
}

describe("reviewPayoutClosing", () => {
  it("programa as parcelas previstas da competência inteira", async () => {
    const repository = createRepository();

    await expect(
      reviewPayoutClosing(
        { competence: "2026-08" },
        { repository, now: () => NOW },
      ),
    ).resolves.toEqual({ installments: 3, totalInCents: BigInt(88_333) });
    expect(repository.advance).toHaveBeenCalledWith({
      competence: "2026-08",
      transition: PAYOUT_REVIEW,
      changedAt: NOW,
    });
  });

  it.each(["2026-13", "08/2026", "", null])(
    "recusa a competência %s",
    async (competence) => {
      const repository = createRepository();

      await expect(
        reviewPayoutClosing({ competence }, { repository }),
      ).rejects.toThrow(PayoutValidationError);
      expect(repository.advance).not.toHaveBeenCalled();
    },
  );

  it("avisa quando não há nada previsto para conferir", async () => {
    const repository = createRepository({
      installments: 0,
      totalInCents: BigInt(0),
    });

    await expect(
      reviewPayoutClosing({ competence: "2026-08" }, { repository }),
    ).rejects.toThrow(NothingToReviewError);
  });
});

describe("paySellerPayout", () => {
  it("paga somente as parcelas programadas do vendedor", async () => {
    const repository = createRepository();

    await paySellerPayout(
      { competence: "2026-08", sellerId: SELLER_ID },
      { repository, now: () => NOW },
    );

    expect(repository.advance).toHaveBeenCalledWith({
      competence: "2026-08",
      sellerId: SELLER_ID,
      transition: PAYOUT_PAYMENT,
      changedAt: NOW,
    });
  });

  it("recusa um vendedor inválido", async () => {
    const repository = createRepository();

    await expect(
      paySellerPayout(
        { competence: "2026-08", sellerId: "vendedor" },
        { repository },
      ),
    ).rejects.toThrow(PayoutValidationError);
    expect(repository.advance).not.toHaveBeenCalled();
  });

  it("avisa quando o vendedor não tem nada programado", async () => {
    const repository = createRepository({
      installments: 0,
      totalInCents: BigInt(0),
    });

    await expect(
      paySellerPayout(
        { competence: "2026-08", sellerId: SELLER_ID },
        { repository },
      ),
    ).rejects.toThrow(NothingToPayError);
  });
});
