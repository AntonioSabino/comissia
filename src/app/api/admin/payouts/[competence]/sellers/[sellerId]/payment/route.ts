import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { paySellerPayout } from "@/modules/sales/application/close-payout";
import {
  NothingToPayError,
  PayoutValidationError,
} from "@/modules/sales/application/errors";
import { payoutRepository } from "@/modules/sales/infrastructure/db/payout-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ competence: string; sellerId: string }>;
};

/** Registra o pagamento: as parcelas programadas do vendedor passam a pagas. */
export async function POST(_request: Request, context: RouteContext) {
  const authorization = await authorizeCurrentUser("admin");

  if (authorization.status !== "authorized") {
    return adminAccessError(authorization.status);
  }

  const { competence, sellerId } = await context.params;

  try {
    const result = await paySellerPayout(
      { competence, sellerId },
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

    if (error instanceof NothingToPayError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    throw error;
  }
}
