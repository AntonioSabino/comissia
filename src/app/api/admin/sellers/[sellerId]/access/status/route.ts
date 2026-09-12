import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import {
  changeSellerAccess,
  SellerAccessNotFoundError,
  SellerAccessValidationError,
} from "@/modules/auth/application/seller-access";
import { sellerAccessRepository } from "@/modules/auth/infrastructure/db/seller-access-repository";

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
      { message: "Informe a nova situação do acesso" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Informe a nova situação do acesso" },
      { status: 400 },
    );
  }

  const { sellerId } = await context.params;
  const { active } = body as { active?: unknown };

  try {
    const access = await changeSellerAccess(
      { sellerId, active },
      { repository: sellerAccessRepository },
    );

    return NextResponse.json({
      email: access.email,
      active: access.active,
    });
  } catch (error) {
    if (error instanceof SellerAccessValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof SellerAccessNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    throw error;
  }
}
