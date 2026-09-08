import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import {
  DuplicateSellerError,
  InvalidSellerIdError,
  SellerNotFoundError,
} from "@/modules/sellers/application/errors";
import { updateSeller } from "@/modules/sellers/application/update-seller";
import type { SellerProfileInput } from "@/modules/sellers/domain/seller-profile";
import { SellerValidationError } from "@/modules/sellers/domain/seller-validation";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sellerId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizeCurrentUser("admin");

  if (authorization.status !== "authorized") {
    return adminAccessError(authorization.status);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Informe os dados do vendedor" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Informe os dados do vendedor" },
      { status: 400 },
    );
  }

  const { sellerId } = await context.params;
  const { name, document, email, phone } = body as SellerProfileInput;

  try {
    const seller = await updateSeller(
      { sellerId, name, document, email, phone },
      { repository: sellerRepository },
    );

    return NextResponse.json(seller);
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

    if (error instanceof DuplicateSellerError) {
      return NextResponse.json(
        {
          message: error.message,
          fieldErrors: { [error.field]: error.message },
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
