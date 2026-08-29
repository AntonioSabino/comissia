import { NextResponse } from "next/server";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { createSeller } from "@/modules/sellers/application/create-seller";
import { DuplicateSellerError } from "@/modules/sellers/application/errors";
import { SellerValidationError } from "@/modules/sellers/domain/seller-registration";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";

export const runtime = "nodejs";

function accessError(status: "unauthenticated" | "forbidden") {
  return NextResponse.json(
    {
      message:
        status === "unauthenticated"
          ? "Faça login para continuar"
          : "Acesso permitido apenas para administradores",
    },
    { status: status === "unauthenticated" ? 401 : 403 },
  );
}

export async function POST(request: Request) {
  const authorization = await authorizeCurrentUser("admin");

  if (authorization.status !== "authorized") {
    return accessError(authorization.status);
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

  try {
    const seller = await createSeller(
      body && typeof body === "object" ? body : {},
      { repository: sellerRepository },
    );

    return NextResponse.json(seller, { status: 201 });
  } catch (error) {
    if (error instanceof SellerValidationError) {
      return NextResponse.json(
        { message: error.message, fieldErrors: error.fieldErrors },
        { status: 400 },
      );
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

    throw error;
  }
}
