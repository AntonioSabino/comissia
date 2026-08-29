import type { AuthenticatedUser } from "./auth-repository";

export type UserRole = AuthenticatedUser["role"];

export type AuthorizationResult =
  | { status: "authorized"; user: AuthenticatedUser }
  | { status: "unauthenticated" }
  | { status: "forbidden"; user: AuthenticatedUser };

export function hasRequiredRole(
  user: AuthenticatedUser | null,
  requiredRole: UserRole,
): boolean {
  return user?.role === requiredRole;
}

export function authorizeRole(
  user: AuthenticatedUser | null,
  requiredRole: UserRole,
): AuthorizationResult {
  if (!user) {
    return { status: "unauthenticated" };
  }

  if (!hasRequiredRole(user, requiredRole)) {
    return { status: "forbidden", user };
  }

  return { status: "authorized", user };
}

export function getRoleHome(role: UserRole): "/admin" | "/seller" {
  return role === "admin" ? "/admin" : "/seller";
}
