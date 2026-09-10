export type DuplicateSellerField = "document" | "email";

export class DuplicateSellerError extends Error {
  constructor(public readonly field: DuplicateSellerField) {
    super(field === "document" ? "CPF já cadastrado" : "E-mail já cadastrado");
    this.name = "DuplicateSellerError";
  }
}

export class SellerNotFoundError extends Error {
  constructor() {
    super("Vendedor não encontrado");
    this.name = "SellerNotFoundError";
  }
}

export class SellerStatusValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SellerStatusValidationError";
  }
}

export class InvalidSellerIdError extends Error {
  constructor() {
    super("Identificador do vendedor inválido");
    this.name = "InvalidSellerIdError";
  }
}

export class DuplicateSellerCommissionRateError extends Error {
  constructor() {
    super("Já existe um percentual com esta data de vigência");
    this.name = "DuplicateSellerCommissionRateError";
  }
}

export class MissingCommissionRateError extends Error {
  constructor() {
    super("O vendedor não tem percentual vigente na data da venda");
    this.name = "MissingCommissionRateError";
  }
}
