import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { changeAdministratorStatus } from "@/modules/sales/application/change-administrator-status";
import {
  AdministratorNotFoundError,
  AdministratorStatusValidationError,
} from "@/modules/sales/application/errors";
import { administratorRepository } from "@/modules/sales/infrastructure/db/administrator-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ administratorId: string }>;
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
      { message: "Informe a nova situação da administradora" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Informe a nova situação da administradora" },
      { status: 400 },
    );
  }

  const { administratorId } = await context.params;
  const { active } = body as { active?: unknown };

  try {
    const administrator = await changeAdministratorStatus(
      { administratorId, active },
      { repository: administratorRepository },
    );

    return NextResponse.json(administrator);
  } catch (error) {
    if (error instanceof AdministratorStatusValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof AdministratorNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    throw error;
  }
}
