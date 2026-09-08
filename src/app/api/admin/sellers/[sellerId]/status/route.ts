import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { changeSellerStatus } from "@/modules/sellers/application/change-seller-status";
import {
  SellerNotFoundError,
  SellerStatusValidationError,
} from "@/modules/sellers/application/errors";
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
      { message: "Informe a nova situação do vendedor" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Informe a nova situação do vendedor" },
      { status: 400 },
    );
  }

  const { sellerId } = await context.params;
  const { active } = body as { active?: unknown };

  try {
    const seller = await changeSellerStatus(
      { sellerId, active },
      { repository: sellerRepository },
    );

    return NextResponse.json(seller);
  } catch (error) {
    if (error instanceof SellerStatusValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof SellerNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    throw error;
  }
}
