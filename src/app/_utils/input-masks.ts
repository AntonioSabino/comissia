/**
 * Máscaras dos formulários. São só de interface: o servidor continua aceitando
 * e validando o valor com ou sem formatação (`seller-profile`,
 * `seller-commission-rate` e `parseBrlToCents`).
 */
export type InputMask = "cpf" | "phone" | "percent" | "money";

function digitsOf(value: string, limit: number): string {
  return value.replace(/\D/g, "").slice(0, limit);
}

/** 12345678900 → 123.456.789-00, formando enquanto se digita. */
export function maskCpf(value: string): string {
  const digits = digitsOf(value, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

/** DDD entre parênteses; 8 dígitos viram 9999-9999 e 9 viram 99999-9999. */
export function maskPhone(value: string): string {
  const digits = digitsOf(value, 11);

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

/**
 * Separa a parte inteira e a decimal pela primeira vírgula; um ponto digitado
 * é lido como vírgula quando o campo ainda não tem uma.
 */
function splitDecimal(value: string): {
  integer: string;
  decimal: string | null;
} {
  const normalized = value.includes(",") ? value : value.replace(".", ",");
  const commaAt = normalized.indexOf(",");

  if (commaAt < 0) {
    return { integer: normalized.replace(/\D/g, ""), decimal: null };
  }

  return {
    integer: normalized.slice(0, commaAt).replace(/\D/g, ""),
    decimal: normalized
      .slice(commaAt + 1)
      .replace(/\D/g, "")
      .slice(0, 2),
  };
}

function withoutLeadingZeros(integer: string): string {
  return integer.replace(/^0+(?=\d)/, "");
}

/** Percentual com vírgula e até duas casas: 2,5 → 2,5; 250 → 250 (até 3 dígitos). */
export function maskPercent(value: string): string {
  const { integer, decimal } = splitDecimal(value);
  const integerPart = withoutLeadingZeros(integer).slice(0, 3);

  if (decimal === null) {
    return integerPart;
  }

  return `${integerPart || "0"},${decimal}`;
}

/** Reais com ponto de milhar e vírgula decimal: 200000,5 → 200.000,5. */
export function maskMoney(value: string): string {
  const withoutPrefix = value.replace(/^\s*R\$\s*/i, "");
  // No valor em reais o ponto é de milhar: só a vírgula abre os centavos.
  const commaAt = withoutPrefix.indexOf(",");
  const integer = (
    commaAt < 0 ? withoutPrefix : withoutPrefix.slice(0, commaAt)
  ).replace(/\D/g, "");
  const grouped = withoutLeadingZeros(integer)
    .slice(0, 13)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (commaAt < 0) {
    return grouped;
  }

  const decimal = withoutPrefix
    .slice(commaAt + 1)
    .replace(/\D/g, "")
    .slice(0, 2);

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

/**
 * Reformata o valor e devolve onde o cursor deve ficar: depois do mesmo número
 * de dígitos (e vírgulas) que havia antes dele. Assim editar no meio do campo
 * não joga o cursor para o fim.
 */
export function reformat(
  mask: InputMask,
  value: string,
  caret: number,
): { value: string; caret: number } {
  const formatted = applyMask(mask, value);
  const significantBefore = [...value.slice(0, caret)].filter(
    isSignificant,
  ).length;

  if (significantBefore === 0) {
    return { value: formatted, caret: 0 };
  }

  let seen = 0;

  for (let index = 0; index < formatted.length; index += 1) {
    if (isSignificant(formatted[index])) {
      seen += 1;
    }

    if (seen === significantBefore) {
      return { value: formatted, caret: index + 1 };
    }
  }

  return { value: formatted, caret: formatted.length };
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
