import { describe, expect, it } from "vitest";
import { parseBrlToCents } from "@/shared/money";
import {
  type InputMask,
  maskCpf,
  maskMoney,
  maskPercent,
  maskPhone,
  reformat,
  reformatAfterEdit,
} from "./input-masks";

const BACKSPACE = "⌫";

/**
 * Digita tecla a tecla como o navegador faz, aplicando a mesma lógica do
 * `MaskedInput` a cada evento. `⌫` é o Backspace.
 */
function typeKeys(
  mask: InputMask,
  keys: string,
  start = { value: "", caret: 0 },
): { value: string; caret: number } {
  let { value, caret } = start;

  for (const key of keys) {
    const previous = value;
    const edited =
      key === BACKSPACE
        ? {
            raw: value.slice(0, Math.max(caret - 1, 0)) + value.slice(caret),
            caret: Math.max(caret - 1, 0),
          }
        : {
            raw: value.slice(0, caret) + key + value.slice(caret),
            caret: caret + 1,
          };

    ({ value, caret } = reformatAfterEdit(
      mask,
      previous,
      edited.raw,
      edited.caret,
    ));
  }

  return { value, caret };
}

describe("maskCpf", () => {
  it("forma o CPF enquanto se digita", () => {
    expect(maskCpf("123")).toBe("123");
    expect(maskCpf("1234")).toBe("123.4");
    expect(maskCpf("1234567")).toBe("123.456.7");
    expect(maskCpf("1234567890")).toBe("123.456.789-0");
    expect(maskCpf("12345678900")).toBe("123.456.789-00");
  });

  it("ignora o que não é dígito", () => {
    expect(maskCpf("123.456.789-00")).toBe("123.456.789-00");
    expect(maskCpf(" 123a456b789c00 ")).toBe("123.456.789-00");
    expect(maskCpf("")).toBe("");
  });

  it("não corta um valor com dígitos a mais: deixa sem formato para o servidor recusar", () => {
    expect(maskCpf("123456789001")).toBe("123456789001");
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

  it("mantém o DDD 55 de quem o digita", () => {
    expect(maskPhone("55999998888")).toBe("(55) 99999-8888");
  });

  it("tira o código do país colado junto, em vez de confundi-lo com o DDD", () => {
    expect(maskPhone("+55 11 99999-8888")).toBe("(11) 99999-8888");
    expect(maskPhone("5511999998888")).toBe("(11) 99999-8888");
    expect(maskPhone("551133334444")).toBe("(11) 3333-4444");
  });

  it("não corta um número longo demais: deixa sem formato para o servidor recusar", () => {
    expect(maskPhone("+44 20 7946 0958")).toBe("442079460958");
  });

  it("aceita o valor já formatado", () => {
    expect(maskPhone("(11) 99999-8888")).toBe("(11) 99999-8888");
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

  it("não corta a parte inteira: o servidor recusa o que passar de 100", () => {
    expect(maskPercent("1000")).toBe("1000");
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

  it("formata até o maior crédito que o servidor aceita, sem cortar", () => {
    expect(maskMoney("12345678901234")).toBe("12.345.678.901.234");
    expect(maskMoney("92233720368547758,07")).toBe("92.233.720.368.547.758,07");
  });

  it("não corta um valor maior que isso: deixa sem formato para o servidor recusar", () => {
    expect(maskMoney("123456789012345678")).toBe("123456789012345678");
  });

  it("produz o que o servidor lê como centavos", () => {
    for (const typed of [
      "200000",
      "200000,5",
      "1234567,89",
      "R$ 50",
      "92233720368547758,07",
    ]) {
      expect(parseBrlToCents(maskMoney(typed))).toBe(
        parseBrlToCents(typed.replace(/^R\$\s*/, "")),
      );
    }
  });
});

describe("digitação tecla a tecla", () => {
  it("forma o CPF e deixa o cursor no fim", () => {
    expect(typeKeys("cpf", "12345678900")).toEqual({
      value: "123.456.789-00",
      caret: 14,
    });
  });

  it("forma o celular e o fixo", () => {
    expect(typeKeys("phone", "11999998888").value).toBe("(11) 99999-8888");
    expect(typeKeys("phone", "1133334444").value).toBe("(11) 3333-4444");
  });

  it("aceita o ponto como vírgula no percentual sem trocar a ordem dos dígitos", () => {
    expect(typeKeys("percent", "2.5")).toEqual({ value: "2,5", caret: 3 });
    expect(typeKeys("percent", "2.555").value).toBe("2,55");
  });

  it("começa pela vírgula no percentual e no crédito", () => {
    expect(typeKeys("percent", ",5")).toEqual({ value: "0,5", caret: 3 });
    expect(typeKeys("money", ",5")).toEqual({ value: "0,5", caret: 3 });
  });

  it("agrupa o crédito enquanto se digita", () => {
    expect(typeKeys("money", "1250000,5")).toEqual({
      value: "1.250.000,5",
      caret: 11,
    });
  });

  it("apaga com Backspace passando pelos separadores", () => {
    const typed = typeKeys("cpf", "12345678900");

    expect(typeKeys("cpf", BACKSPACE.repeat(3), typed).value).toBe(
      "123.456.78",
    );
    expect(typeKeys("cpf", BACKSPACE.repeat(11), typed)).toEqual({
      value: "",
      caret: 0,
    });
  });

  it("ignora a tecla que passaria do tamanho do campo", () => {
    expect(typeKeys("phone", "119999988887777")).toEqual({
      value: "(11) 99999-8888",
      caret: 15,
    });
    expect(typeKeys("cpf", "123456789001234").value).toBe("123.456.789-00");
    expect(typeKeys("percent", "1000").value).toBe("100");
    expect(typeKeys("money", "123456789012345678").value).toBe(
      "12.345.678.901.234.567",
    );
  });

  it("ignora a tecla a mais também com o cursor no meio", () => {
    // Campo cheio, cursor depois do DDD: o 9 digitado não entra.
    expect(
      typeKeys("phone", "9", { value: "(11) 99999-8888", caret: 4 }),
    ).toEqual({ value: "(11) 99999-8888", caret: 4 });
  });

  it("aceita o código do país ao digitar, porque ele sai na formatação", () => {
    expect(typeKeys("phone", "5511999998888").value).toBe("(11) 99999-8888");
  });

  it("insere no meio do telefone sem jogar o cursor para o fim", () => {
    // "(11) 9|999-8888": o cursor está depois do primeiro 9.
    expect(
      typeKeys("phone", "9", { value: "(11) 9999-8888", caret: 6 }),
    ).toEqual({ value: "(11) 99999-8888", caret: 7 });
  });

  it("insere no meio do crédito mantendo o cursor junto do dígito", () => {
    // "1|.000": inserir 2 vira "12.000", com o cursor depois do 2.
    expect(typeKeys("money", "2", { value: "1.000", caret: 1 })).toEqual({
      value: "12.000",
      caret: 2,
    });
  });
});

describe("reformat", () => {
  it("põe o cursor antes do mesmo número de dígitos que havia depois dele", () => {
    // "129|3.456.78" vira "129.345.678": 6 dígitos continuam depois do cursor.
    expect(reformat("cpf", "1293.456.78", 3)).toEqual({
      value: "129.345.678",
      caret: 3,
    });
  });

  it("põe o cursor no início quando todos os dígitos estão depois dele", () => {
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
});
