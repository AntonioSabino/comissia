import { describe, expect, it } from "vitest";
import { generateTemporaryPassword } from "./temporary-password";

describe("generateTemporaryPassword", () => {
  it("gera uma senha compatível com o mínimo exigido", () => {
    expect(generateTemporaryPassword().length).toBeGreaterThanOrEqual(12);
  });

  it("usa apenas caracteres seguros para copiar e digitar", () => {
    expect(generateTemporaryPassword()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("não repete a senha entre chamadas", () => {
    const passwords = new Set(
      Array.from({ length: 50 }, () => generateTemporaryPassword()),
    );

    expect(passwords.size).toBe(50);
  });
});
