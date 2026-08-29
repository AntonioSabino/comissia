import { normalizeEmail } from "../domain/email";
import { hashPassword as hashStoredPassword } from "../domain/password";
import type {
  CreatedInitialAdmin,
  InitialAdminRepository,
} from "./initial-admin-repository";

const MINIMUM_PASSWORD_LENGTH = 12;
const MAXIMUM_PASSWORD_LENGTH = 1_024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class InvalidInitialAdminInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInitialAdminInputError";
  }
}

export class InitialAdminAlreadyExistsError extends Error {
  constructor() {
    super("Já existe um usuário administrador");
    this.name = "InitialAdminAlreadyExistsError";
  }
}

export class InitialAdminEmailInUseError extends Error {
  constructor() {
    super("O e-mail informado já está em uso");
    this.name = "InitialAdminEmailInUseError";
  }
}

type CreateInitialAdminInput = {
  name: string;
  email: string;
  password: string;
};

type CreateInitialAdminDependencies = {
  repository: InitialAdminRepository;
  hashPassword?: typeof hashStoredPassword;
};

function validateInput(input: CreateInitialAdminInput) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);

  if (name.length === 0 || name.length > 160) {
    throw new InvalidInitialAdminInputError(
      "O nome deve possuir entre 1 e 160 caracteres",
    );
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new InvalidInitialAdminInputError("Informe um e-mail válido");
  }

  if (
    input.password.length < MINIMUM_PASSWORD_LENGTH ||
    input.password.length > MAXIMUM_PASSWORD_LENGTH
  ) {
    throw new InvalidInitialAdminInputError(
      "A senha deve possuir entre 12 e 1024 caracteres",
    );
  }

  return { name, email, password: input.password };
}

export async function createInitialAdmin(
  input: CreateInitialAdminInput,
  {
    repository,
    hashPassword = hashStoredPassword,
  }: CreateInitialAdminDependencies,
): Promise<CreatedInitialAdmin> {
  const normalizedInput = validateInput(input);

  if (await repository.adminExists()) {
    throw new InitialAdminAlreadyExistsError();
  }

  if (await repository.userEmailExists(normalizedInput.email)) {
    throw new InitialAdminEmailInUseError();
  }

  const passwordHash = await hashPassword(normalizedInput.password);

  return repository.createAdmin({
    name: normalizedInput.name,
    email: normalizedInput.email,
    passwordHash,
    role: "admin",
    sellerId: null,
    active: true,
  });
}
