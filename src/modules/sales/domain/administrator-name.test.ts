import { describe, expect, it } from "vitest";
import {
  AdministratorValidationError,
  validateAdministratorName,
} from "./administrator-name";

describe("validateAdministratorName", () => {
  it("normaliza espaços do nome", () => {
    expect(validateAdministratorName("  Porto   Consórcio ")).toBe(
      "Porto Consórcio",
    );
  });

  it.each(["", " A ", "x".repeat(161), undefined, 10])(
    "recusa o nome %j",
    (value) => {
      let thrown: unknown;

      try {
        validateAdministratorName(value);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(AdministratorValidationError);
      expect((thrown as AdministratorValidationError).fieldErrors).toEqual({
        name: "Informe um nome entre 2 e 160 caracteres",
      });
    },
  );
});
