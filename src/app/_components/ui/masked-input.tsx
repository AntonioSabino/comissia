"use client";

import { type ComponentProps, type InputEvent, useRef } from "react";
import {
  applyMask,
  type InputMask,
  reformatAfterEdit,
} from "@/app/_utils/input-masks";
import { Input } from "./field";

type MaskedInputProps = Omit<ComponentProps<typeof Input>, "defaultValue"> & {
  /** Nome da máscara: uma string, e não uma função, para atravessar do servidor. */
  mask: InputMask;
  defaultValue?: string;
};

/**
 * Campo que se formata enquanto se digita, sem virar controlado: o formulário
 * continua lendo o valor pelo `FormData`. O cursor fica depois do mesmo dígito
 * que estava antes da edição, e apagar um separador leva o dígito anterior.
 */
export function MaskedInput({
  mask,
  defaultValue,
  onInput,
  onFocus,
  ...rest
}: MaskedInputProps) {
  const initial = defaultValue ? applyMask(mask, defaultValue) : "";
  const previous = useRef(initial);

  function handleInput(event: InputEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const caret = input.selectionStart ?? input.value.length;
    const next = reformatAfterEdit(mask, previous.current, input.value, caret);

    input.value = next.value;
    input.setSelectionRange(next.caret, next.caret);
    previous.current = next.value;
    onInput?.(event);
  }

  return (
    <Input
      {...rest}
      defaultValue={initial}
      onInput={handleInput}
      onFocus={(event) => {
        // Depois de um `reset()` do formulário o valor muda sem passar por
        // `onInput`; o foco ressincroniza a referência.
        previous.current = event.currentTarget.value;
        onFocus?.(event);
      }}
    />
  );
}
