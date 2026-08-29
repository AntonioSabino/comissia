export type AuthenticationUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "seller";
  sellerId: string | null;
  active: boolean;
};

export type AuthenticatedUser = Omit<
  AuthenticationUser,
  "passwordHash" | "active"
>;

export type SessionRecord = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthenticationUser | null>;
  findActiveUserBySessionTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<AuthenticatedUser | null>;
  createSession(session: SessionRecord): Promise<void>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
}
