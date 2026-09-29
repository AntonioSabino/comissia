/**
 * Máscaras dos formulários. São só de interface: o servidor continua aceitando
 * e validando o valor com ou sem formatação (`seller-profile`,
 * `seller-commission-rate` e `parseBrlToCents`).
 *
 * Regra das máscaras: nunca trocar o valor digitado por outro. Um valor que
 * passa do tamanho aceito não é cortado; ele fica sem formatação para que o
 * servidor o recuse, em vez de gravar um número diferente do que foi digitado.
 */
export type InputMask = "cpf" | "phone" | "percent" | "money";

const CPF_DIGITS = 11;
const PHONE_DIGITS = 11;
const BRAZIL_COUNTRY_CODE = "55";
/** O servidor aceita créditos de até 17 dígitos inteiros (limite do `bigint`). */
const MONEY_INTEGER_DIGITS = 17;

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** 12345678900 → 123.456.789-00, formando enquanto se digita. */
export function maskCpf(value: string): string {
  const digits = onlyDigits(value);

  if (digits.length > CPF_DIGITS) {
    return digits;
  }

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

/**
 * DDD entre parênteses; 8 dígitos viram 9999-9999 e 9 viram 99999-9999. O
 * código do país (+55) colado junto é removido, e não confundido com o DDD.
 */
export function maskPhone(value: string): string {
  let digits = onlyDigits(value);

  if (digits.length > PHONE_DIGITS && digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    digits = digits.slice(BRAZIL_COUNTRY_CODE.length);
  }

  if (digits.length > PHONE_DIGITS) {
    return digits;
  }

  if (digits.length === 0) {
    return "";
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  const splitAt = number.length > 8 ? 5 : 4;

  if (number.length <= splitAt) {
    return `(${areaCode}) ${number}`;
  }

  return `(${areaCode}) ${number.slice(0, splitAt)}-${number.slice(splitAt)}`;
}

function withoutLeadingZeros(integer: string): string {
  return integer.replace(/^0+(?=\d)/, "");
}

/**
 * Percentual com vírgula e até duas casas: 2,5 → 2,5. Um ponto digitado vira
 * vírgula quando o campo ainda não tem uma. A parte inteira não é cortada: o
 * servidor recusa o que passar de 100.
 */
export function maskPercent(value: string): string {
  const normalized = value.includes(",") ? value : value.replace(".", ",");
  const commaAt = normalized.indexOf(",");
  const integer = withoutLeadingZeros(
    onlyDigits(commaAt < 0 ? normalized : normalized.slice(0, commaAt)),
  );

  if (commaAt < 0) {
    return integer;
  }

  const decimal = onlyDigits(normalized.slice(commaAt + 1)).slice(0, 2);

  return `${integer || "0"},${decimal}`;
}

/** Reais com ponto de milhar e vírgula decimal: 200000,5 → 200.000,5. */
export function maskMoney(value: string): string {
  const withoutPrefix = value.replace(/^\s*R\$\s*/i, "");
  // No valor em reais o ponto é de milhar: só a vírgula abre os centavos.
  const commaAt = withoutPrefix.indexOf(",");
  const integer = withoutLeadingZeros(
    onlyDigits(commaAt < 0 ? withoutPrefix : withoutPrefix.slice(0, commaAt)),
  );

  if (integer.length > MONEY_INTEGER_DIGITS) {
    return onlyDigits(withoutPrefix);
  }

  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (commaAt < 0) {
    return grouped;
  }

  const decimal = onlyDigits(withoutPrefix.slice(commaAt + 1)).slice(0, 2);

  return `${grouped || "0"},${decimal}`;
}

const MASKS: Record<InputMask, (value: string) => string> = {
  cpf: maskCpf,
  phone: maskPhone,
  percent: maskPercent,
  money: maskMoney,
};

export function applyMask(mask: InputMask, value: string): string {
  return MASKS[mask](value);
}

/** Caracteres que o usuário digitou de fato: dígitos e a vírgula decimal. */
function isSignificant(character: string): boolean {
  return /[\d,]/.test(character);
}

function countSignificant(value: string): number {
  return [...value].filter(isSignificant).length;
}

/**
 * Reformata o valor e devolve onde o cursor deve ficar. A conta é feita a
 * partir do fim: o cursor fica antes do mesmo número de dígitos que havia
 * depois dele. Assim o que a máscara muda antes do cursor (o ponto que vira
 * vírgula, o zero acrescentado em ",5", o parêntese do DDD) não o desloca, e
 * editar no meio do campo não o joga para o fim.
 */
export function reformat(
  mask: InputMask,
  value: string,
  caret: number,
): { value: string; caret: number } {
  const formatted = applyMask(mask, value);
  const significantAfter = countSignificant(value.slice(caret));

  if (significantAfter === 0) {
    return { value: formatted, caret: formatted.length };
  }

  let seen = 0;

  for (let index = formatted.length - 1; index >= 0; index -= 1) {
    if (isSignificant(formatted[index])) {
      seen += 1;
    }

    if (seen === significantAfter) {
      // Encosta o cursor no dígito anterior, em vez de deixá-lo depois de um
      // separador: "12|.000", e não "12.|000".
      let caret = index;

      while (caret > 0 && !isSignificant(formatted[caret - 1])) {
        caret -= 1;
      }

      return { value: formatted, caret };
    }
  }

  return { value: formatted, caret: 0 };
}

/**
 * Reformata depois de uma edição. Quando a edição só apagou um separador que a
 * máscara recolocaria (o ponto do CPF, o traço do telefone), apaga também o
 * dígito antes dele, para que o Backspace não pareça travado.
 */
export function reformatAfterEdit(
  mask: InputMask,
  previous: string,
  value: string,
  caret: number,
): { value: string; caret: number } {
  const removedOnlySeparator =
    value.length === previous.length - 1 &&
    caret > 0 &&
    applyMask(mask, value) === previous &&
    !isSignificant(previous[caret] ?? "");

  if (removedOnlySeparator) {
    let digitAt = caret - 1;

    while (digitAt >= 0 && !isSignificant(value[digitAt])) {
      digitAt -= 1;
    }

    if (digitAt >= 0) {
      return reformat(
        mask,
        value.slice(0, digitAt) + value.slice(digitAt + 1),
        digitAt,
      );
    }
  }

  return reformat(mask, value, caret);
}
