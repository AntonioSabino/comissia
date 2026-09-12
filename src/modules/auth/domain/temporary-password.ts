import { randomBytes } from "node:crypto";

const ENTROPY_BYTES = 18;

/**
 * Senha sorteada para o primeiro acesso. São 18 bytes aleatórios em base64url,
 * o que satisfaz o mínimo de 12 caracteres com folga e não depende de nenhuma
 * lista de palavras. A senha existe apenas na resposta que a cria: o banco
 * guarda somente o hash.
 */
export function generateTemporaryPassword(): string {
  return randomBytes(ENTROPY_BYTES).toString("base64url");
}
