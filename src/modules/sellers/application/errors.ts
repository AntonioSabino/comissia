export type DuplicateSellerField = "document" | "email";

export class DuplicateSellerError extends Error {
  constructor(public readonly field: DuplicateSellerField) {
    super(field === "document" ? "CPF já cadastrado" : "E-mail já cadastrado");
    this.name = "DuplicateSellerError";
  }
}
