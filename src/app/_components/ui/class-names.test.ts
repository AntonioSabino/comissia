import { describe, expect, it } from "vitest";
import { classNames } from "./class-names";

describe("classNames", () => {
  it("junta apenas as classes informadas", () => {
    expect(classNames("button", false, undefined, "primary", null, "")).toBe(
      "button primary",
    );
  });

  it("retorna vazio quando nenhuma classe é informada", () => {
    expect(classNames(false, undefined)).toBe("");
  });
});
