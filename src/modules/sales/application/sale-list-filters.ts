import { isValidDateOnly } from "@/shared/date-only";
import { isUuid } from "@/shared/uuid";
import { isQuotaStatus, type QuotaStatus } from "../domain/quota-status";
import type { SaleListFilters } from "./sale-repository";
import type { SellerSaleListFilters } from "./seller-commission-repository";

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

/**
 * Os mesmos filtros na área do vendedor, sem o campo de vendedor: lá ele vem
 * da sessão e não é oferecido nem aceito pela URL.
 */
export type ParsedSellerSaleListFilters = SellerSaleListFilters & {
  search: string;
  administrator: string;
  status: QuotaStatusFilter;
  from: string;
  to: string;
};

export type SellerSaleListSearchParams = {
  search?: string | string[];
  administrator?: string | string[];
  status?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

export type SaleListSearchParams = SellerSaleListSearchParams & {
  seller?: string | string[];
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

type SharedFields = {
  search: string;
  administrator: string;
  status: QuotaStatusFilter;
  from: string;
  to: string;
};

/** Os campos que as duas áreas têm em comum, já limpos. */
function readSharedFields(input: SellerSaleListSearchParams): SharedFields {
  const search = readSingleValue(input.search).trim().slice(0, 160);
  const administrator = readIdentifier(input.administrator);
  const requestedStatus = readSingleValue(input.status);
  const status: QuotaStatusFilter = isQuotaStatus(requestedStatus)
    ? requestedStatus
    : "all";
  const firstDate = readDate(input.from);
  const secondDate = readDate(input.to);
  const isInverted =
    firstDate.length > 0 && secondDate.length > 0 && firstDate > secondDate;

  return {
    search,
    administrator,
    status,
    from: isInverted ? secondDate : firstDate,
    to: isInverted ? firstDate : secondDate,
  };
}

/** Os filtros efetivos que nascem dos campos comuns, sem os campos vazios. */
function toSharedFilters(fields: SharedFields): SellerSaleListFilters {
  return {
    ...(fields.administrator.length > 0
      ? { administratorId: fields.administrator }
      : {}),
    ...(fields.status === "all" ? {} : { quotaStatus: fields.status }),
    ...(fields.from.length > 0 ? { soldFrom: fields.from } : {}),
    ...(fields.to.length > 0 ? { soldTo: fields.to } : {}),
  };
}

function hasSharedFilters(fields: SharedFields): boolean {
  return (
    fields.search.length > 0 ||
    fields.administrator.length > 0 ||
    fields.status !== "all" ||
    fields.from.length > 0 ||
    fields.to.length > 0
  );
}

/**
 * Lê os filtros da URL descartando valores que não fazem sentido, para que uma
 * query string editada à mão não derrube a página nem filtre por engano. Um
 * período invertido é ordenado, em vez de devolver uma lista vazia.
 */
export function parseSaleListFilters(
  input: SaleListSearchParams,
): ParsedSaleListFilters {
  const shared = readSharedFields(input);
  const seller = readIdentifier(input.seller);

  return {
    ...shared,
    seller,
    ...toSharedFilters(shared),
    ...(seller.length > 0 ? { sellerId: seller } : {}),
  };
}

/**
 * A mesma leitura na área do vendedor. Um `seller` na query string é ignorado
 * por não existir aqui: o vendedor das consultas vem da sessão.
 */
export function parseSellerSaleListFilters(
  input: SellerSaleListSearchParams,
): ParsedSellerSaleListFilters {
  const shared = readSharedFields(input);

  return { ...shared, ...toSharedFilters(shared) };
}

/**
 * Query string dos filtros do vendedor, com os campos preenchidos apenas. Ela
 * nasce dos valores já limpos pelo parser, então o que volta para o navegador
 * nunca é o texto cru que veio na URL.
 */
export function buildSellerSaleListQuery(
  filters: ParsedSellerSaleListFilters,
): string {
  const query = new URLSearchParams();

  if (filters.search.length > 0) {
    query.set("search", filters.search);
  }

  if (filters.administrator.length > 0) {
    query.set("administrator", filters.administrator);
  }

  if (filters.status !== "all") {
    query.set("status", filters.status);
  }

  if (filters.from.length > 0) {
    query.set("from", filters.from);
  }

  if (filters.to.length > 0) {
    query.set("to", filters.to);
  }

  return query.toString();
}

/** Indica se a listagem está restrita, para oferecer a limpeza dos filtros. */
export function hasSaleListFilters(filters: ParsedSaleListFilters): boolean {
  return hasSharedFilters(filters) || filters.seller.length > 0;
}

/** O mesmo na área do vendedor, onde não há filtro por vendedor. */
export function hasSellerSaleListFilters(
  filters: ParsedSellerSaleListFilters,
): boolean {
  return hasSharedFilters(filters);
}
