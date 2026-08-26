import { describe, expect, it } from "vitest";
import { getAppName } from "./app-name";

describe("getAppName", () => {
  it("uses Comissia when the environment value is empty", () => {
    expect(getAppName("   ")).toBe("Comissia");
  });

  it("normalizes a configured application name", () => {
    expect(getAppName("  Comissia Homologação  ")).toBe("Comissia Homologação");
  });
});
