import { describe, expect, it, vi } from "vitest";
import {
  createInitialAdmin,
  InitialAdminAlreadyExistsError,
  InitialAdminEmailInUseError,
  InvalidInitialAdminInputError,
} from "./create-initial-admin";
import type {
  InitialAdminCreationResult,
  InitialAdminRecord,
  InitialAdminRepository,
} from "./initial-admin-repository";

class InMemoryInitialAdminRepository implements InitialAdminRepository {
  admins: InitialAdminRecord[] = [];
  emails = new Set<string>();

  async createInitialAdmin(
    admin: InitialAdminRecord,
  ): Promise<InitialAdminCreationResult> {
    if (this.admins.length > 0) {
      return { status: "admin-already-exists" };
    }

    if (this.emails.has(admin.email)) {
      return { status: "email-in-use" };
    }

    this.admins.push(admin);
    this.emails.add(admin.email);

    return {
      status: "created",
      admin: { id: "admin-1", name: admin.name, email: admin.email },
    };
  }
}

const validInput = {
  name: "Administrador",
  email: "admin@comissia.local",
  password: "uma-senha-segura",
};

describe("createInitialAdmin", () => {
  it("creates a normalized administrator with a hashed password", async () => {
    const repository = new InMemoryInitialAdminRepository();
    const hashPassword = vi.fn().mockResolvedValue("password-hash");

    const result = await createInitialAdmin(
      {
        name: "  Administrador local  ",
        email: "  ADMIN@COMISSIA.LOCAL ",
        password: validInput.password,
      },
      { repository, hashPassword },
    );

    expect(hashPassword).toHaveBeenCalledWith(validInput.password);
    expect(repository.admins).toEqual([
      {
        name: "Administrador local",
        email: "admin@comissia.local",
        passwordHash: "password-hash",
        role: "admin",
        sellerId: null,
        active: true,
      },
    ]);
    expect(result).toEqual({
      id: "admin-1",
      name: "Administrador local",
      email: "admin@comissia.local",
    });
  });

  it("refuses to create a second administrator", async () => {
    const repository = new InMemoryInitialAdminRepository();
    repository.admins.push({
      name: "Administrador existente",
      email: "existing@comissia.local",
      passwordHash: "hash",
      role: "admin",
      sellerId: null,
      active: true,
    });
    const hashPassword = vi.fn().mockResolvedValue("password-hash");

    await expect(
      createInitialAdmin(validInput, { repository, hashPassword }),
    ).rejects.toBeInstanceOf(InitialAdminAlreadyExistsError);
  });

  it("refuses an e-mail already linked to another user", async () => {
    const repository = new InMemoryInitialAdminRepository();
    repository.emails.add(validInput.email);
    const hashPassword = vi.fn().mockResolvedValue("password-hash");

    await expect(
      createInitialAdmin(validInput, { repository, hashPassword }),
    ).rejects.toBeInstanceOf(InitialAdminEmailInUseError);
  });

  it.each([
    [{ ...validInput, name: " " }, "nome"],
    [{ ...validInput, email: "email-invalido" }, "e-mail"],
    [{ ...validInput, password: "curta" }, "senha"],
  ])("rejects invalid bootstrap input", async (input, expectedMessage) => {
    const repository = new InMemoryInitialAdminRepository();
    const hashPassword = vi.fn();

    await expect(
      createInitialAdmin(input, { repository, hashPassword }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof InvalidInitialAdminInputError &&
        error.message.includes(expectedMessage),
    );
    expect(hashPassword).not.toHaveBeenCalled();
  });
});
