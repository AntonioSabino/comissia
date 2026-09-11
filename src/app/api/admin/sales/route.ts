import { NextResponse } from "next/server";
import { adminAccessError } from "@/app/api/admin/_utils/access-error";
import { getBusinessDate } from "@/lib/business-date";
import { authorizeCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { createSale } from "@/modules/sales/application/create-sale";
import {
  SaleValidationError,
  type SaleRegistrationInput,
} from "@/modules/sales/domain/sale-registration";
import { saleRepository } from "@/modules/sales/infrastructure/db/sale-repository";
import { centsToDecimalString } from "@/shared/money";

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
      { message: "Informe os dados da venda" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Informe os dados da venda" },
      { status: 400 },
    );
  }

  const {
    administratorId,
    sellerId,
    customerName,
    product,
    groupCode,
    quotaCode,
    soldOn,
    creditAmount,
    commissionInstallments,
    firstInstallmentDueOn,
  } = body as SaleRegistrationInput;

  try {
    const sale = await createSale(
      {
        administratorId,
        sellerId,
        customerName,
        product,
        groupCode,
        quotaCode,
        soldOn,
        creditAmount,
        commissionInstallments,
        firstInstallmentDueOn,
      },
      {
        repository: saleRepository,
        today: getBusinessDate(),
      },
    );

    return NextResponse.json(
      {
        id: sale.id,
        code: sale.code,
        creditAmount: centsToDecimalString(sale.creditAmountInCents),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return NextResponse.json(
        { message: error.message, fieldErrors: error.fieldErrors },
        { status: 400 },
      );
    }

    throw error;
  }
}
