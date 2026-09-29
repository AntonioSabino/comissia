import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { reviewPayoutClosing } from "@/modules/sales/application/close-payout";
import {
  NothingToReviewError,
  PayoutValidationError,
} from "@/modules/sales/application/errors";
import { payoutRepository } from "@/modules/sales/infrastructure/db/payout-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ competence: string }>;
};

/** Confere o fechamento: as parcelas previstas da competência são programadas. */
export async function POST(_request: Request, context: RouteContext) {
  const authorization = await authorizeCurrentUser("admin");

  if (authorization.status !== "authorized") {
    return adminAccessError(authorization.status);
  }

  const { competence } = await context.params;

  try {
    const result = await reviewPayoutClosing(
      { competence },
      { repository: payoutRepository },
    );

    return NextResponse.json({
      installments: result.installments,
      totalInCents: result.totalInCents.toString(),
    });
  } catch (error) {
    if (error instanceof PayoutValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof NothingToReviewError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    throw error;
  }
}
