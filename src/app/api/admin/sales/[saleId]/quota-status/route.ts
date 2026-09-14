import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { changeQuotaStatus } from "@/modules/sales/application/change-quota-status";
import {
  QuotaStatusUnchangedError,
  QuotaStatusValidationError,
  SaleNotFoundError,
} from "@/modules/sales/application/errors";
import { quotaStatusRepository } from "@/modules/sales/infrastructure/db/quota-status-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ saleId: string }>;
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
      { message: "Informe a nova situação da cota" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Informe a nova situação da cota" },
      { status: 400 },
    );
  }

  const { saleId } = await context.params;
  const { status } = body as { status?: unknown };

  try {
    const change = await changeQuotaStatus(
      { saleId, status },
      { repository: quotaStatusRepository },
    );

    return NextResponse.json(change);
  } catch (error) {
    if (
      error instanceof QuotaStatusValidationError ||
      error instanceof QuotaStatusUnchangedError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof SaleNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    throw error;
  }
}
