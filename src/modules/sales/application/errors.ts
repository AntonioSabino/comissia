export class DuplicateAdministratorError extends Error {
  constructor() {
    super("Administradora já cadastrada");
    this.name = "DuplicateAdministratorError";
  }
}

export class AdministratorNotFoundError extends Error {
  constructor() {
    super("Administradora não encontrada");
    this.name = "AdministratorNotFoundError";
  }
}

export class AdministratorStatusValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdministratorStatusValidationError";
  }
}
