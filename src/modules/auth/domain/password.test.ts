import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("stores a salted hash instead of the plain password", async () => {
    const password = "uma-senha-segura";
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).not.toContain(password);
    expect(firstHash).not.toBe(secondHash);
    expect(firstHash).toMatch(/^scrypt\$/);
  });

  it("accepts the correct password", async () => {
    const hash = await hashPassword("senha-correta");

    await expect(verifyPassword("senha-correta", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("senha-correta");

    await expect(verifyPassword("senha-incorreta", hash)).resolves.toBe(false);
  });

  it("rejects malformed hashes", async () => {
    await expect(verifyPassword("senha", "hash-invalido")).resolves.toBe(false);
  });
});
