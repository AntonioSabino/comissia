import {
  isCommissionInstallmentStatus,
  type CommissionInstallmentStatus,
} from "@/modules/commissions";
import { isUuid } from "@/shared/uuid";
import type { AdminCommissionListFilters } from "./admin-commission-repository";
import { isCompetence } from "./monthly-commission-forecast";

export type CommissionInstallmentStatusFilter =
  CommissionInstallmentStatus | "all";

export type CommissionInstallmentListSearchParams = {
  from?: string | string[];
  to?: string | string[];
  seller?: string | string[];
  status?: string | string[];
};

export type ParsedCommissionInstallmentListFilters =
  AdminCommissionListFilters & {
    from: string;
    to: string;
    seller: string;
    status: CommissionInstallmentStatusFilter;
  };

function readSingleValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function readCompetence(value: string | string[] | undefined): string {
  const competence = readSingleValue(value).trim();

  return isCompetence(competence) ? competence : "";
}

function readIdentifier(value: string | string[] | undefined): string {
  const identifier = readSingleValue(value).trim();

  return isUuid(identifier) ? identifier : "";
}

/**
 * Lê o recorte administrativo sem devolver à consulta valores editados à mão
 * que não sejam competências, identificadores ou situações válidas.
 */
export function parseCommissionInstallmentListFilters(
  input: CommissionInstallmentListSearchParams,
): ParsedCommissionInstallmentListFilters {
  const firstCompetence = readCompetence(input.from);
  const secondCompetence = readCompetence(input.to);
  const isInverted =
    firstCompetence.length > 0 &&
    secondCompetence.length > 0 &&
    firstCompetence > secondCompetence;
  const from = isInverted ? secondCompetence : firstCompetence;
  const to = isInverted ? firstCompetence : secondCompetence;
  const seller = readIdentifier(input.seller);
  const requestedStatus = readSingleValue(input.status);
  const status: CommissionInstallmentStatusFilter =
    isCommissionInstallmentStatus(requestedStatus) ? requestedStatus : "all";

  return {
    from,
    to,
    seller,
    status,
    ...(from ? { competenceFrom: from } : {}),
    ...(to ? { competenceTo: to } : {}),
    ...(seller ? { sellerId: seller } : {}),
    ...(status === "all" ? {} : { installmentStatus: status }),
  };
}

export function hasCommissionInstallmentListFilters(
  filters: ParsedCommissionInstallmentListFilters,
): boolean {
  return Boolean(
    filters.from || filters.to || filters.seller || filters.status !== "all",
  );
}
