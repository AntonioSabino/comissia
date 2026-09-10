import { describe, expect, it } from "vitest";
import { isUuid } from "./uuid";

describe("isUuid", () => {
  it("aceita identificadores gerados pelo banco", () => {
    expect(isUuid("2f81455e-01cd-4b4f-8614-30fda79fd987")).toBe(true);
    expect(isUuid("2F81455E-01CD-4B4F-8614-30FDA79FD987")).toBe(true);
  });

  it.each([
    "",
    "porto",
    "2f81455e-01cd-4b4f-8614",
    "2f81455e-01cd-4b4f-c614-30fda79fd987",
    123,
    null,
  ])("recusa %j", (value) => {
    expect(isUuid(value)).toBe(false);
  });
});
