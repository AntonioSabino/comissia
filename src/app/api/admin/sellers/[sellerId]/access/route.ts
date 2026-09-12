import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import {
  createSellerAccess,
  SellerAccessAlreadyExistsError,
  SellerAccessEmailInUseError,
  SellerAccessValidationError,
} from "@/modules/auth/application/seller-access";
import { sellerAccessRepository } from "@/modules/auth/infrastructure/db/seller-access-repository";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";

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
  const seller = await sellerRepository.findById(sellerId);

  if (!seller) {
    return NextResponse.json(
      { message: "Vendedor não encontrado" },
      { status: 404 },
    );
  }

  try {
    const { access, temporaryPassword } = await createSellerAccess(
      { sellerId, name: seller.name, email: seller.email },
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

    if (
      error instanceof SellerAccessAlreadyExistsError ||
      error instanceof SellerAccessEmailInUseError
    ) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    throw error;
  }
}
