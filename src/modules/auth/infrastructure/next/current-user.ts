import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticateSession } from "../../application/authenticate-session";
import type { AuthenticatedUser } from "../../application/auth-repository";
import {
  getRoleHome,
  hasRequiredRole,
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
): Promise<AuthenticatedUser | null> {
  const user = await getCurrentUser();

  return hasRequiredRole(user, requiredRole) ? user : null;
}

export async function requirePageRole(
  requiredRole: UserRole,
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!hasRequiredRole(user, requiredRole)) {
    redirect(getRoleHome(user.role));
  }

  return user;
}
