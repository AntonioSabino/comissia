import { hashSessionToken } from "../domain/session";
import type { AuthRepository } from "./auth-repository";

export async function logout(
  sessionToken: string | undefined,
  repository: AuthRepository,
): Promise<void> {
  if (!sessionToken) {
    return;
  }

  await repository.deleteSessionByTokenHash(hashSessionToken(sessionToken));
}
