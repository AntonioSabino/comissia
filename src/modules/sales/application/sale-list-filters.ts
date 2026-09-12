import { isValidDateOnly } from "@/shared/date-only";
import { isUuid } from "@/shared/uuid";
import { isQuotaStatus, type QuotaStatus } from "../domain/quota-status";
import type { SaleListFilters } from "./sale-repository";

export type QuotaStatusFilter = QuotaStatus | "all";

/**
 * Filtros da listagem de vendas: os campos do formulário, sempre preenchidos
 * para repopular a tela, e os filtros efetivos enviados ao repositório.
 */
export type ParsedSaleListFilters = SaleListFilters & {
  search: string;
  seller: string;
  administrator: string;
  status: QuotaStatusFilter;
  from: string;
  to: string;
};

export type SaleListSearchParams = {
  search?: string | string[];
  seller?: string | string[];
  administrator?: string | string[];
  status?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

function readSingleValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function readIdentifier(value: string | string[] | undefined): string {
  const identifier = readSingleValue(value).trim();

  return isUuid(identifier) ? identifier : "";
}

function readDate(value: string | string[] | undefined): string {
  const date = readSingleValue(value).trim();

  return isValidDateOnly(date) ? date : "";
}

/**
 * Lê os filtros da URL descartando valores que não fazem sentido, para que uma
 * query string editada à mão não derrube a página nem filtre por engano. Um
 * período invertido é ordenado, em vez de devolver uma lista vazia.
 */
export function parseSaleListFilters(
  input: SaleListSearchParams,
): ParsedSaleListFilters {
  const search = readSingleValue(input.search).trim().slice(0, 160);
  const seller = readIdentifier(input.seller);
  const administrator = readIdentifier(input.administrator);
  const requestedStatus = readSingleValue(input.status);
  const status: QuotaStatusFilter = isQuotaStatus(requestedStatus)
    ? requestedStatus
    : "all";
  const firstDate = readDate(input.from);
  const secondDate = readDate(input.to);
  const isInverted =
    firstDate.length > 0 && secondDate.length > 0 && firstDate > secondDate;
  const from = isInverted ? secondDate : firstDate;
  const to = isInverted ? firstDate : secondDate;

  return {
    search,
    seller,
    administrator,
    status,
    from,
    to,
    ...(seller.length > 0 ? { sellerId: seller } : {}),
    ...(administrator.length > 0 ? { administratorId: administrator } : {}),
    ...(status === "all" ? {} : { quotaStatus: status }),
    ...(from.length > 0 ? { soldFrom: from } : {}),
    ...(to.length > 0 ? { soldTo: to } : {}),
  };
}

/** Indica se a listagem está restrita, para oferecer a limpeza dos filtros. */
export function hasSaleListFilters(filters: ParsedSaleListFilters): boolean {
  return (
    filters.search.length > 0 ||
    filters.seller.length > 0 ||
    filters.administrator.length > 0 ||
    filters.status !== "all" ||
    filters.from.length > 0 ||
    filters.to.length > 0
  );
}
