import { describe, expect, it } from "vitest";
import { isSellerId } from "./seller-id";

describe("isSellerId", () => {
  it("accepts a valid UUID", () => {
    expect(isSellerId("963e2030-77ac-4c37-9e20-cee81efc3747")).toBe(true);
  });

  it.each([
    ["an invalid UUID", "not-a-uuid"],
    ["a non-string value", 42],
    ["an absent value", undefined],
  ])("rejects %s", (_description, value) => {
    expect(isSellerId(value)).toBe(false);
  });
});
