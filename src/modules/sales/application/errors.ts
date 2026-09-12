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

export class DuplicateAdministratorInstallmentRuleError extends Error {
  constructor() {
    super("Já existe uma régua de parcelas com esta data de vigência");
    this.name = "DuplicateAdministratorInstallmentRuleError";
  }
}

export class MissingAdministratorInstallmentRuleError extends Error {
  constructor() {
    super("A administradora não tem régua de parcelas vigente nesta data");
    this.name = "MissingAdministratorInstallmentRuleError";
  }
}
