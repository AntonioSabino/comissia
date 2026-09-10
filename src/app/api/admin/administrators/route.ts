import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { createAdministrator } from "@/modules/sales/application/create-administrator";
import { DuplicateAdministratorError } from "@/modules/sales/application/errors";
import { AdministratorValidationError } from "@/modules/sales/domain/administrator-name";
import { administratorRepository } from "@/modules/sales/infrastructure/db/administrator-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = await authorizeCurrentUser("admin");

  if (authorization.status !== "authorized") {
    return adminAccessError(authorization.status);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Informe os dados da administradora" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Informe os dados da administradora" },
      { status: 400 },
    );
  }

  const { name } = body as { name?: unknown };

  try {
    const administrator = await createAdministrator(
      { name },
      { repository: administratorRepository },
    );

    return NextResponse.json(administrator, { status: 201 });
  } catch (error) {
    if (error instanceof AdministratorValidationError) {
      return NextResponse.json(
        { message: error.message, fieldErrors: error.fieldErrors },
        { status: 400 },
      );
    }

    if (error instanceof DuplicateAdministratorError) {
      return NextResponse.json(
        { message: error.message, fieldErrors: { name: error.message } },
        { status: 409 },
      );
    }

    throw error;
  }
}
