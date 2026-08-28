import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logout } from "@/modules/auth/application/logout";
import { SESSION_COOKIE_NAME } from "@/modules/auth/domain/session";
import { authRepository } from "@/modules/auth/infrastructure/db/auth-repository";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  await logout(sessionToken, authRepository);

  const response = new NextResponse(null, { status: 204 });

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
