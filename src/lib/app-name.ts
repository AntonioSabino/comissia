export const DEFAULT_APP_NAME = "Comissia";

export function getAppName(value = process.env.NEXT_PUBLIC_APP_NAME) {
  const normalized = value?.trim();

  return normalized || DEFAULT_APP_NAME;
}
