import { describe, expect, it, vi } from "vitest";
import { hashSessionToken, SESSION_DURATION_MS } from "../domain/session";
import type {
  AuthenticationUser,
  AuthRepository,
  SessionRecord,
} from "./auth-repository";
import { InvalidCredentialsError } from "./errors";
import { login } from "./login";
import { logout } from "./logout";

class InMemoryAuthRepository implements AuthRepository {
  users: AuthenticationUser[] = [];
  sessions: SessionRecord[] = [];
  searchedEmail: string | null = null;

  async findUserByEmail(email: string): Promise<AuthenticationUser | null> {
    this.searchedEmail = email;
    return this.users.find((user) => user.email === email) ?? null;
  }

  async createSession(session: SessionRecord): Promise<void> {
    this.sessions.push(session);
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    this.sessions = this.sessions.filter(
      (session) => session.tokenHash !== tokenHash,
    );
  }
}

const activeUser: AuthenticationUser = {
  id: "user-1",
  name: "Administrador",
  email: "admin@comissia.local",
  passwordHash: "stored-hash",
  role: "admin",
  sellerId: null,
  active: true,
};

describe("authentication", () => {
  it("creates a hashed, expiring session for valid credentials", async () => {
    const repository = new InMemoryAuthRepository();
    repository.users.push(activeUser);
    const now = new Date("2026-08-28T12:00:00.000Z");
    const verifyPassword = vi.fn().mockResolvedValue(true);

    const result = await login(
      { email: "  ADMIN@COMISSIA.LOCAL ", password: "senha-correta" },
      {
        repository,
        verifyPassword,
        generateToken: () => "raw-session-token",
        now: () => now,
      },
    );

    expect(repository.searchedEmail).toBe("admin@comissia.local");
    expect(verifyPassword).toHaveBeenCalledWith(
      "senha-correta",
      "stored-hash",
    );
    expect(result.sessionToken).toBe("raw-session-token");
    expect(result.expiresAt).toEqual(
      new Date(now.getTime() + SESSION_DURATION_MS),
    );
    expect(repository.sessions).toEqual([
      {
        userId: activeUser.id,
        tokenHash: hashSessionToken("raw-session-token"),
        expiresAt: result.expiresAt,
      },
    ]);
  });

  it("rejects unknown users without creating a session", async () => {
    const repository = new InMemoryAuthRepository();
    const verifyPassword = vi.fn().mockResolvedValue(false);

    await expect(
      login(
        { email: "unknown@comissia.local", password: "senha" },
        { repository, verifyPassword },
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(verifyPassword).toHaveBeenCalledOnce();
    expect(repository.sessions).toHaveLength(0);
  });

  it("rejects incorrect passwords and inactive users", async () => {
    const repository = new InMemoryAuthRepository();
    repository.users.push(activeUser);

    await expect(
      login(
        { email: activeUser.email, password: "senha-incorreta" },
        { repository, verifyPassword: async () => false },
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    repository.users[0] = { ...activeUser, active: false };

    await expect(
      login(
        { email: activeUser.email, password: "senha-correta" },
        { repository, verifyPassword: async () => true },
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(repository.sessions).toHaveLength(0);
  });

  it("invalidates the persisted session on logout", async () => {
    const repository = new InMemoryAuthRepository();
    repository.sessions.push({
      userId: activeUser.id,
      tokenHash: hashSessionToken("session-token"),
      expiresAt: new Date("2026-09-04T12:00:00.000Z"),
    });

    await logout("session-token", repository);

    expect(repository.sessions).toHaveLength(0);
  });

  it("does nothing when logout has no session cookie", async () => {
    const repository = new InMemoryAuthRepository();
    const deleteSession = vi.spyOn(repository, "deleteSessionByTokenHash");

    await logout(undefined, repository);

    expect(deleteSession).not.toHaveBeenCalled();
  });
});
