import { scrypt } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

function createEncodedHash(
  password: string,
  parameters: { cost: number; blockSize: number; parallelization: number },
): Promise<string> {
  const salt = Buffer.from("00112233445566778899aabbccddeeff", "hex");

  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      {
        N: parameters.cost,
        r: parameters.blockSize,
        p: parameters.parallelization,
        maxmem: 128 * 1024 * 1024,
      },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(
          [
            "scrypt",
            parameters.cost,
            parameters.blockSize,
            parameters.parallelization,
            salt.toString("base64url"),
            key.toString("base64url"),
          ].join("$"),
        );
      },
    );
  });
}

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

  it("accepts a safe hash created with newer cost parameters", async () => {
    const hash = await createEncodedHash("senha-correta", {
      cost: 32_768,
      blockSize: 8,
      parallelization: 1,
    });

    await expect(verifyPassword("senha-correta", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("senha-correta");

    await expect(verifyPassword("senha-incorreta", hash)).resolves.toBe(false);
  });

  it("rejects malformed hashes", async () => {
    await expect(verifyPassword("senha", "hash-invalido")).resolves.toBe(false);
  });

  it("rejects encoded parameters above the safe resource limits", async () => {
    const hash = await hashPassword("senha-correta");
    const [, , blockSize, parallelization, salt, key] = hash.split("$");
    const excessiveHash = [
      "scrypt",
      "131072",
      blockSize,
      parallelization,
      salt,
      key,
    ].join("$");

    await expect(verifyPassword("senha-correta", excessiveHash)).resolves.toBe(
      false,
    );
  });
});
