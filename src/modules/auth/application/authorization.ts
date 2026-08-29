import type { AuthenticatedUser } from "./auth-repository";

export type UserRole = AuthenticatedUser["role"];

export function hasRequiredRole(
  user: AuthenticatedUser | null,
  requiredRole: UserRole,
): boolean {
  return user?.role === requiredRole;
}

export function getRoleHome(role: UserRole): "/admin" | "/seller" {
  return role === "admin" ? "/admin" : "/seller";
}
