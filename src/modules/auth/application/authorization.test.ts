import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "./auth-repository";
import { getRoleHome, hasRequiredRole } from "./authorization";

const admin: AuthenticatedUser = {
  id: "admin-1",
  name: "Administrador",
  email: "admin@comissia.local",
  role: "admin",
  sellerId: null,
};

const seller: AuthenticatedUser = {
  id: "seller-user-1",
  name: "Vendedor",
  email: "seller@comissia.local",
  role: "seller",
  sellerId: "seller-1",
};

describe("authorization", () => {
  it("allows only the required profile", () => {
    expect(hasRequiredRole(admin, "admin")).toBe(true);
    expect(hasRequiredRole(admin, "seller")).toBe(false);
    expect(hasRequiredRole(seller, "seller")).toBe(true);
    expect(hasRequiredRole(null, "admin")).toBe(false);
  });

  it("maps each profile to its own initial area", () => {
    expect(getRoleHome("admin")).toBe("/admin");
    expect(getRoleHome("seller")).toBe("/seller");
  });
});
