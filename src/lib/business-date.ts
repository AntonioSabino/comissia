const DEFAULT_BUSINESS_TIME_ZONE = "America/Sao_Paulo";

export function getBusinessDate(
  date = new Date(),
  timeZone = process.env.BUSINESS_TIME_ZONE || DEFAULT_BUSINESS_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (!year || !month || !day) {
    throw new Error("Não foi possível determinar a data operacional");
  }

  return `${year}-${month}-${day}`;
}
