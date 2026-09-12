import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { createAdministratorInstallmentRule } from "@/modules/sales/application/create-administrator-installment-rule";
import {
  AdministratorNotFoundError,
  DuplicateAdministratorInstallmentRuleError,
} from "@/modules/sales/application/errors";
import { AdministratorInstallmentRuleValidationError } from "@/modules/sales/domain/administrator-installment-rule";
import { administratorInstallmentRuleRepository } from "@/modules/sales/infrastructure/db/administrator-installment-rule-repository";

export const runtime = "nodejs";

function invalidBody() {
  return NextResponse.json(
    { message: "Informe os dados da régua de parcelas" },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const authorization = await authorizeCurrentUser("admin");

  if (authorization.status !== "authorized") {
    return adminAccessError(authorization.status);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidBody();
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return invalidBody();
  }

  const { administratorId, product, effectiveFrom, installmentPercentages } =
    body as {
      administratorId?: unknown;
      product?: unknown;
      effectiveFrom?: unknown;
      installmentPercentages?: unknown;
    };

  try {
    const rule = await createAdministratorInstallmentRule(
      { administratorId, product, effectiveFrom, installmentPercentages },
      { repository: administratorInstallmentRuleRepository },
    );

    return NextResponse.json(
      {
        id: rule.id,
        product: rule.product,
        effectiveFrom: rule.effectiveFrom,
        installments: rule.installmentRatesBasisPoints.length,
        totalBasisPoints: rule.totalBasisPoints,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AdministratorInstallmentRuleValidationError) {
      return NextResponse.json(
        { message: error.message, fieldErrors: error.fieldErrors },
        { status: 400 },
      );
    }

    if (error instanceof AdministratorNotFoundError) {
      return NextResponse.json(
        {
          message: error.message,
          fieldErrors: { administratorId: error.message },
        },
        { status: 404 },
      );
    }

    if (error instanceof DuplicateAdministratorInstallmentRuleError) {
      return NextResponse.json(
        {
          message: error.message,
          fieldErrors: { effectiveFrom: error.message },
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
