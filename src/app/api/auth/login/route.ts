import { NextResponse } from "next/server";
import { InvalidCredentialsError } from "@/modules/auth/application/errors";
import { login } from "@/modules/auth/application/login";
import { normalizeEmail } from "@/modules/auth/domain/email";
import { SESSION_COOKIE_NAME } from "@/modules/auth/domain/session";
import { authRepository } from "@/modules/auth/infrastructure/db/auth-repository";
import {
  loginEmailRateLimiter,
  loginIpRateLimiter,
} from "@/modules/auth/infrastructure/rate-limit/login-rate-limiters";

export const runtime = "nodejs";

type Credentials = {
  email: string;
  password: string;
};

function parseCredentials(value: unknown): Credentials | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const { email, password } = value as Record<string, unknown>;

  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);

  if (
    normalizedEmail.length === 0 ||
    normalizedEmail.length > 254 ||
    password.length === 0 ||
    password.length > 1_024
  ) {
    return null;
  }

  return { email: normalizedEmail, password };
}

function getClientAddress(request: Request): string {
  const forwardedAddress = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  return (
    forwardedAddress ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown-client"
  );
}

function tooManyAttempts(retryAfterSeconds: number) {
  return NextResponse.json(
    { message: "Muitas tentativas de login. Aguarde e tente novamente" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Informe e-mail e senha válidos" },
      { status: 400 },
    );
  }

  const credentials = parseCredentials(body);

  if (!credentials) {
    return NextResponse.json(
      { message: "Informe e-mail e senha válidos" },
      { status: 400 },
    );
  }

  const clientAddress = getClientAddress(request);
  const ipDecision = loginIpRateLimiter.consume(clientAddress);

  if (!ipDecision.allowed) {
    return tooManyAttempts(ipDecision.retryAfterSeconds);
  }

  const emailDecision = loginEmailRateLimiter.consume(credentials.email);

  if (!emailDecision.allowed) {
    return tooManyAttempts(emailDecision.retryAfterSeconds);
  }

  try {
    const result = await login(credentials, { repository: authRepository });
    loginEmailRateLimiter.reset(credentials.email);

    const response = NextResponse.json({ user: result.user });

    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: result.expiresAt,
    });

    return response;
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json(
        { message: "E-mail ou senha inválidos" },
        { status: 401 },
      );
    }

    throw error;
  }
}
