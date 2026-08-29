import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./email";

describe("email normalization", () => {
  it("trims surrounding whitespace and lowercases the address", () => {
    expect(normalizeEmail("  Admin@Comissia.Local ")).toBe(
      "admin@comissia.local",
    );
  });
});
