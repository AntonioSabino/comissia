import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import {
  createSellerAccess,
  SellerAccessAlreadyExistsError,
  SellerAccessEmailInUseError,
  SellerAccessSellerNotFoundError,
  SellerAccessValidationError,
} from "@/modules/auth/application/seller-access";
import { sellerAccessRepository } from "@/modules/auth/infrastructure/db/seller-access-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sellerId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const authorization = await authorizeCurrentUser("admin");

  if (authorization.status !== "authorized") {
    return adminAccessError(authorization.status);
  }

  const { sellerId } = await context.params;

  try {
    const { access, temporaryPassword } = await createSellerAccess(
      { sellerId },
      { repository: sellerAccessRepository },
    );

    // A senha aparece nesta resposta e em nenhum outro lugar: o banco guarda
    // apenas o hash e nada disso é registrado em log.
    return NextResponse.json(
      { email: access.email, active: access.active, temporaryPassword },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SellerAccessValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof SellerAccessSellerNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (
      error instanceof SellerAccessAlreadyExistsError ||
      error instanceof SellerAccessEmailInUseError
    ) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    throw error;
  }
}
