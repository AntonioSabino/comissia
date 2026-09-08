import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { addSellerCommissionRate } from "@/modules/sellers/application/add-seller-commission-rate";
import {
  DuplicateSellerCommissionRateError,
  InvalidSellerIdError,
  SellerNotFoundError,
} from "@/modules/sellers/application/errors";
import type { SellerCommissionRateInput } from "@/modules/sellers/domain/seller-commission-rate";
import { SellerValidationError } from "@/modules/sellers/domain/seller-validation";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sellerId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const authorization = await authorizeCurrentUser("admin");

  if (authorization.status !== "authorized") {
    return adminAccessError(authorization.status);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Informe a nova vigência de percentual" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Informe a nova vigência de percentual" },
      { status: 400 },
    );
  }

  const { sellerId } = await context.params;
  const { ratePercentage, effectiveFrom } = body as SellerCommissionRateInput;

  try {
    const rate = await addSellerCommissionRate(
      { sellerId, ratePercentage, effectiveFrom },
      { repository: sellerRepository },
    );

    return NextResponse.json(rate, { status: 201 });
  } catch (error) {
    if (error instanceof SellerValidationError) {
      return NextResponse.json(
        { message: error.message, fieldErrors: error.fieldErrors },
        { status: 400 },
      );
    }

    if (error instanceof InvalidSellerIdError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof DuplicateSellerCommissionRateError) {
      return NextResponse.json(
        {
          message: error.message,
          fieldErrors: { effectiveFrom: error.message },
        },
        { status: 409 },
      );
    }

    if (error instanceof SellerNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    throw error;
  }
}
