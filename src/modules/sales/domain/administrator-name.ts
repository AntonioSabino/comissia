export class AdministratorValidationError extends Error {
  constructor(public readonly fieldErrors: { name?: string }) {
    super("Revise os campos informados");
    this.name = "AdministratorValidationError";
  }
}

export function validateAdministratorName(value: unknown): string {
  const name =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

  if (name.length < 2 || name.length > 160) {
    throw new AdministratorValidationError({
      name: "Informe um nome entre 2 e 160 caracteres",
    });
  }

  return name;
}
