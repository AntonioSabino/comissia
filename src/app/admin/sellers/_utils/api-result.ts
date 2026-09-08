export type ApiResult = {
  message?: unknown;
  fieldErrors?: unknown;
};

export async function readApiResult(response: Response): Promise<ApiResult> {
  try {
    const result: unknown = await response.json();

    return result !== null &&
      typeof result === "object" &&
      !Array.isArray(result)
      ? (result as ApiResult)
      : {};
  } catch {
    return {};
  }
}

export function readMessage(result: ApiResult, fallback: string): string {
  return typeof result.message === "string" ? result.message : fallback;
}

export function readFieldErrors<Field extends string>(
  result: ApiResult,
  fields: readonly Field[],
): Partial<Record<Field, string>> {
  const fieldErrors: Partial<Record<Field, string>> = {};

  if (!result.fieldErrors || typeof result.fieldErrors !== "object") {
    return fieldErrors;
  }

  for (const [field, message] of Object.entries(result.fieldErrors)) {
    if (typeof message === "string" && fields.includes(field as Field)) {
      fieldErrors[field as Field] = message;
    }
  }

  return fieldErrors;
}
