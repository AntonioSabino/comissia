import { isUuid } from "@/shared/uuid";
import { normalizeEmail } from "../domain/email";
import { hashPassword as hashStoredPassword } from "../domain/password";
import { generateTemporaryPassword as drawTemporaryPassword } from "../domain/temporary-password";
import type {
  SellerAccess,
  SellerAccessRepository,
} from "./seller-access-repository";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class SellerAccessValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SellerAccessValidationError";
  }
}

export class SellerAccessAlreadyExistsError extends Error {
  constructor() {
    super("Este vendedor já tem acesso criado");
    this.name = "SellerAccessAlreadyExistsError";
  }
}

export class SellerAccessEmailInUseError extends Error {
  constructor() {
    super("O e-mail do vendedor já está em uso por outro usuário");
    this.name = "SellerAccessEmailInUseError";
  }
}

export class SellerAccessNotFoundError extends Error {
  constructor() {
    super("Este vendedor não tem acesso criado");
    this.name = "SellerAccessNotFoundError";
  }
}

type SellerAccessDependencies = {
  repository: SellerAccessRepository;
};

type CreateSellerAccessInput = {
  sellerId: string;
  name: string;
  email: string;
};

type CreateSellerAccessDependencies = SellerAccessDependencies & {
  hashPassword?: typeof hashStoredPassword;
  generateTemporaryPassword?: typeof drawTemporaryPassword;
};

export type CreatedSellerAccess = {
  access: SellerAccess;
  /** Devolvida uma única vez, para o administrador repassar ao vendedor. */
  temporaryPassword: string;
};

function validateSellerId(sellerId: unknown): string {
  if (!isUuid(sellerId)) {
    throw new SellerAccessValidationError("Informe um vendedor válido");
  }

  return sellerId;
}

/**
 * Cria o login do vendedor a partir do cadastro que ele já tem: o e-mail do
 * cadastro vira o e-mail de acesso, e a senha do primeiro acesso é sorteada
 * aqui. Nenhum administrador escolhe a senha de outra pessoa.
 */
export async function createSellerAccess(
  input: CreateSellerAccessInput,
  {
    repository,
    hashPassword = hashStoredPassword,
    generateTemporaryPassword = drawTemporaryPassword,
  }: CreateSellerAccessDependencies,
): Promise<CreatedSellerAccess> {
  const sellerId = validateSellerId(input.sellerId);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = normalizeEmail(
    typeof input.email === "string" ? input.email : "",
  );

  if (name.length === 0 || name.length > 160) {
    throw new SellerAccessValidationError(
      "O nome do vendedor deve possuir entre 1 e 160 caracteres",
    );
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new SellerAccessValidationError(
      "O vendedor precisa de um e-mail válido no cadastro",
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const result = await repository.createSellerAccess({
    sellerId,
    name,
    email,
    passwordHash,
  });

  if (result.status === "access-already-exists") {
    throw new SellerAccessAlreadyExistsError();
  }

  if (result.status === "email-in-use") {
    throw new SellerAccessEmailInUseError();
  }

  if (result.status === "seller-not-found") {
    throw new SellerAccessValidationError("Informe um vendedor válido");
  }

  return { access: result.access, temporaryPassword };
}

/**
 * Libera ou bloqueia o acesso do vendedor. Bloquear não remove nada: o usuário
 * continua vinculado ao cadastro, e vendas e histórico seguem intactos.
 */
export async function changeSellerAccess(
  input: { sellerId: string; active: unknown },
  { repository }: SellerAccessDependencies,
): Promise<SellerAccess> {
  const sellerId = validateSellerId(input.sellerId);

  if (typeof input.active !== "boolean") {
    throw new SellerAccessValidationError(
      "Informe se o acesso deve ficar liberado ou bloqueado",
    );
  }

  const access = await repository.setSellerAccessActive(sellerId, input.active);

  if (!access) {
    throw new SellerAccessNotFoundError();
  }

  return access;
}
