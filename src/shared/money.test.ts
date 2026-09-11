import { describe, expect, it } from "vitest";
import { centsToDecimalString, parseBrlToCents } from "./money";

describe("parseBrlToCents", () => {
  it.each([
    ["200000", "20000000"],
    ["200.000", "20000000"],
    ["200.000,50", "20000050"],
    ["R$ 1.234,5", "123450"],
    ["  0,01 ", "1"],
    ["1.000.000,00", "100000000"],
  ])("converte %s para centavos", (value, cents) => {
    expect(parseBrlToCents(value)).toBe(BigInt(cents));
  });

  it("preserva valores acima de 2^53 centavos", () => {
    expect(parseBrlToCents("90.071.992.547.409,93")).toBe(
      BigInt("9007199254740993"),
    );
  });

  it.each(["", "abc", "1.23", "12.34.567", "200,000", "-10", "1,2,3"])(
    "recusa %j",
    (value) => {
      expect(parseBrlToCents(value)).toBeNull();
    },
  );
});

describe("centsToDecimalString", () => {
  it("formata centavos como decimal com duas casas", () => {
    expect(centsToDecimalString(BigInt("20000050"))).toBe("200000.50");
    expect(centsToDecimalString(BigInt(5))).toBe("0.05");
    expect(centsToDecimalString(BigInt(0))).toBe("0.00");
  });

  it("mantém o sinal de valores negativos", () => {
    expect(centsToDecimalString(BigInt(-1250))).toBe("-12.50");
  });

  it("não perde precisão acima de 2^53", () => {
    expect(centsToDecimalString(BigInt("9007199254740993"))).toBe(
      "90071992547409.93",
    );
  });
});
