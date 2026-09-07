import type { SellerListFilters } from "./seller-repository";

export type SellerStatusFilter = "all" | "active" | "inactive";

export type ParsedSellerListFilters = SellerListFilters & {
  search: string;
  status: SellerStatusFilter;
};

function readSingleValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export function parseSellerListFilters(input: {
  search?: string | string[];
  status?: string | string[];
}): ParsedSellerListFilters {
  const search = readSingleValue(input.search).trim().slice(0, 160);
  const requestedStatus = readSingleValue(input.status);
  const status: SellerStatusFilter =
    requestedStatus === "active" || requestedStatus === "inactive"
      ? requestedStatus
      : "all";

  return {
    search,
    status,
    ...(status === "active"
      ? { active: true }
      : status === "inactive"
        ? { active: false }
        : {}),
  };
}
