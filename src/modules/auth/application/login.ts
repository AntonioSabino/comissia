import { normalizeEmail } from "../domain/email";
import { verifyPassword as verifyStoredPassword } from "../domain/password";
import {
  calculateSessionExpiration,
  createSessionToken,
  hashSessionToken,
} from "../domain/session";
import type { AuthRepository } from "./auth-repository";
import { InvalidCredentialsError } from "./errors";

const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$AAECAwQFBgcICQoLDA0ODw$b_ByQnXsgaI5iLo__6bWCRHosu9IYY1pLBFM5V9IVZA1F0P65lp7S8ME4oTJLjQI3fl_L-YMALUMGdTPN19Nfw";

type LoginInput = {
  email: string;
  password: string;
};

type LoginDependencies = {
  repository: AuthRepository;
  verifyPassword?: typeof verifyStoredPassword;
  generateToken?: () => string;
  now?: () => Date;
};

export type LoginResult = {
  sessionToken: string;
  expiresAt: Date;
  user: {
    id: string;
    name: string;
    role: "admin" | "seller";
    sellerId: string | null;
  };
};

export async function login(
  input: LoginInput,
  {
    repository,
    verifyPassword = verifyStoredPassword,
    generateToken = createSessionToken,
    now = () => new Date(),
  }: LoginDependencies,
): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  const user = await repository.findUserByEmail(email);
  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !user.active || !passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const sessionToken = generateToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = calculateSessionExpiration(now());

  const sessionCreated = await repository.createSessionForActiveUser({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  if (!sessionCreated) {
    throw new InvalidCredentialsError();
  }

  return {
    sessionToken,
    expiresAt,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      sellerId: user.sellerId,
    },
  };
}
