import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticateSession } from "../../application/authenticate-session";
import type { AuthenticatedUser } from "../../application/auth-repository";
import {
  authorizeRole,
  getRoleHome,
  type AuthorizationResult,
  type UserRole,
} from "../../application/authorization";
import { SESSION_COOKIE_NAME } from "../../domain/session";
import { authRepository } from "../db/auth-repository";

export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    return authenticateSession(sessionToken, { repository: authRepository });
  },
);

export async function authorizeCurrentUser(
  requiredRole: UserRole,
): Promise<AuthorizationResult> {
  const user = await getCurrentUser();

  return authorizeRole(user, requiredRole);
}

export async function requirePageRole(
  requiredRole: UserRole,
): Promise<AuthenticatedUser> {
  const authorization = await authorizeCurrentUser(requiredRole);

  if (authorization.status === "unauthenticated") {
    redirect("/login");
  }

  if (authorization.status === "forbidden") {
    redirect(getRoleHome(authorization.user.role));
  }

  return authorization.user;
}
