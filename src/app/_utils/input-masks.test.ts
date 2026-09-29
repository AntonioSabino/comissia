import { describe, expect, it } from "vitest";
import { parseBrlToCents } from "@/shared/money";
import {
  maskCpf,
  maskMoney,
  maskPercent,
  maskPhone,
  reformat,
  reformatAfterEdit,
} from "./input-masks";

describe("maskCpf", () => {
  it("forma o CPF enquanto se digita", () => {
    expect(maskCpf("123")).toBe("123");
    expect(maskCpf("1234")).toBe("123.4");
    expect(maskCpf("1234567")).toBe("123.456.7");
    expect(maskCpf("1234567890")).toBe("123.456.789-0");
    expect(maskCpf("12345678900")).toBe("123.456.789-00");
  });

  it("ignora o que não é dígito e corta no 11º", () => {
    expect(maskCpf("123.456.789-00")).toBe("123.456.789-00");
    expect(maskCpf(" 123a456b789c00999 ")).toBe("123.456.789-00");
    expect(maskCpf("")).toBe("");
  });
});

describe("maskPhone", () => {
  it("coloca o DDD entre parênteses", () => {
    expect(maskPhone("1")).toBe("(1");
    expect(maskPhone("11")).toBe("(11");
    expect(maskPhone("119")).toBe("(11) 9");
  });

  it("separa fixo com 8 dígitos e celular com 9", () => {
    expect(maskPhone("1133334444")).toBe("(11) 3333-4444");
    expect(maskPhone("11999998888")).toBe("(11) 99999-8888");
  });

  it("aceita o valor já formatado e corta no 11º dígito", () => {
    expect(maskPhone("(11) 99999-8888")).toBe("(11) 99999-8888");
    expect(maskPhone("+55 11 99999-8888")).toBe("(55) 11999-9988");
    expect(maskPhone("")).toBe("");
  });
});

describe("maskPercent", () => {
  it("usa vírgula e até duas casas", () => {
    expect(maskPercent("2")).toBe("2");
    expect(maskPercent("2,")).toBe("2,");
    expect(maskPercent("2,5")).toBe("2,5");
    expect(maskPercent("2,567")).toBe("2,56");
  });

  it("lê o ponto como vírgula decimal", () => {
    expect(maskPercent("2.5")).toBe("2,5");
  });

  it("começa com zero quando a vírgula vem primeiro e tira zeros à esquerda", () => {
    expect(maskPercent(",5")).toBe("0,5");
    expect(maskPercent("002,50")).toBe("2,50");
  });

  it("limita a parte inteira a três dígitos", () => {
    expect(maskPercent("1000")).toBe("100");
  });
});

describe("maskMoney", () => {
  it("agrupa o milhar com ponto enquanto se digita", () => {
    expect(maskMoney("1")).toBe("1");
    expect(maskMoney("1234")).toBe("1.234");
    expect(maskMoney("200000")).toBe("200.000");
    expect(maskMoney("1234567")).toBe("1.234.567");
  });

  it("abre os centavos na vírgula, com até duas casas", () => {
    expect(maskMoney("200000,")).toBe("200.000,");
    expect(maskMoney("200000,5")).toBe("200.000,5");
    expect(maskMoney("200000,567")).toBe("200.000,56");
    expect(maskMoney(",5")).toBe("0,5");
  });

  it("aceita o valor já formatado ou com R$", () => {
    expect(maskMoney("200.000,00")).toBe("200.000,00");
    expect(maskMoney("R$ 1.234,5")).toBe("1.234,5");
  });

  it("produz o que o servidor lê como centavos", () => {
    for (const typed of ["200000", "200000,5", "1234567,89", "R$ 50"]) {
      expect(parseBrlToCents(maskMoney(typed))).toBe(
        parseBrlToCents(typed.replace(/^R\$\s*/, "")),
      );
    }
  });
});

describe("reformat", () => {
  it("mantém o cursor depois do mesmo dígito", () => {
    // O usuário digita o 4º dígito com o cursor no fim.
    expect(reformat("cpf", "1234", 4)).toEqual({ value: "123.4", caret: 5 });
  });

  it("não joga o cursor para o fim ao editar no meio", () => {
    // "123.456.789-00" com um 9 inserido depois do "12".
    const edited = "129" + "3.456.789-00";
    const result = reformat("cpf", edited, 3);

    expect(result.value).toBe("129.345.678-90");
    expect(result.caret).toBe(3);
  });

  it("conta a vírgula como parte do que foi digitado", () => {
    expect(reformat("money", "1234,5", 6)).toEqual({
      value: "1.234,5",
      caret: 7,
    });
  });

  it("põe o cursor no início quando nada foi digitado antes dele", () => {
    expect(reformat("phone", "11999998888", 0)).toEqual({
      value: "(11) 99999-8888",
      caret: 0,
    });
  });
});

describe("reformatAfterEdit", () => {
  it("apaga o dígito antes do separador que o Backspace removeu", () => {
    // "123.4" com o cursor depois do ponto: o Backspace tira o ponto.
    expect(reformatAfterEdit("cpf", "123.4", "1234", 3)).toEqual({
      value: "124",
      caret: 2,
    });
  });

  it("apaga o traço do telefone levando o dígito anterior", () => {
    expect(
      reformatAfterEdit("phone", "(11) 99999-8888", "(11) 999998888", 10),
    ).toEqual({ value: "(11) 9999-8888", caret: 9 });
  });

  it("não interfere quando um dígito foi apagado", () => {
    expect(reformatAfterEdit("cpf", "123.4", "123.", 4)).toEqual({
      value: "123",
      caret: 3,
    });
  });

  it("reformata normalmente ao digitar", () => {
    expect(reformatAfterEdit("cpf", "123", "1234", 4)).toEqual({
      value: "123.4",
      caret: 5,
    });
  });
});
