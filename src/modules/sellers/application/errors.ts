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
