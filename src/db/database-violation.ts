export type DatabaseViolation = {
  code?: unknown;
  constraint?: unknown;
};

/**
 * O Drizzle encapsula o erro do driver, então a violação real (código e
 * restrição do PostgreSQL) fica na cadeia de `cause`.
 */
export function findDatabaseViolation(
  error: unknown,
): DatabaseViolation | null {
  let current = error;

  while (current && typeof current === "object") {
    if ("code" in current) {
      return current as DatabaseViolation;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return null;
}
