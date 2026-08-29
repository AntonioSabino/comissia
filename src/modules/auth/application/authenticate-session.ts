import { hashSessionToken } from "../domain/session";
import type { AuthenticatedUser, AuthRepository } from "./auth-repository";

type AuthenticateSessionDependencies = {
  repository: AuthRepository;
  now?: () => Date;
};

export async function authenticateSession(
  sessionToken: string | undefined,
  { repository, now = () => new Date() }: AuthenticateSessionDependencies,
): Promise<AuthenticatedUser | null> {
  if (!sessionToken) {
    return null;
  }

  return repository.findActiveUserBySessionTokenHash(
    hashSessionToken(sessionToken),
    now(),
  );
}
