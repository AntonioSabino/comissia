import { Ruler } from "lucide-react";
import type { Metadata } from "next";
import { Alert } from "@/app/_components/ui/alert";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable } from "@/app/_components/ui/data-table";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState } from "@/app/_components/ui/state-block";
import {
  StatusBadge,
  type StatusTone,
} from "@/app/_components/ui/status-badge";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { selectActiveAdministrators } from "@/modules/sales/application/active-administrators";
import { describeInstallmentRules } from "@/modules/sales/application/current-installment-rules";
import { administratorInstallmentRuleRepository } from "@/modules/sales/infrastructure/db/administrator-installment-rule-repository";
import { administratorRepository } from "@/modules/sales/infrastructure/db/administrator-repository";
import { InstallmentRuleForm } from "./installment-rule-form";
import styles from "./installment-rules.module.css";

export const metadata: Metadata = {
  title: "Réguas de parcelas | Comissia",
};

const VISIBLE_INSTALLMENTS = 8;

function formatRate(basisPoints: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(basisPoints / 10_000);
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

function formatRuleCount(count: number): string {
  return count === 1 ? "1 vigência" : `${count} vigências`;
}

/** Réguas longas mostram o começo da distribuição e quantas parcelas faltam. */
function formatDistribution(installmentRatesBasisPoints: number[]): string {
  const rates = installmentRatesBasisPoints.map(formatRate);

  if (rates.length <= VISIBLE_INSTALLMENTS + 1) {
    return rates.join(" · ");
  }

  const visible = rates.slice(0, VISIBLE_INSTALLMENTS).join(" · ");

  return `${visible} · +${rates.length - VISIBLE_INSTALLMENTS} parcelas`;
}

function describeVersion(
  rule: { current: boolean; effectiveFrom: string },
  today: string,
): { label: string; tone: StatusTone } {
  if (rule.current) {
    return { label: "Vigente", tone: "received" };
  }

  if (rule.effectiveFrom > today) {
    return { label: "Futura", tone: "pending" };
  }

  return { label: "Encerrada", tone: "neutral" };
}

export default async function InstallmentRulesPage() {
  await requirePageRole("admin");
  const today = getBusinessDate();
  // Uma leitura por entidade: o formulário usa o subconjunto ativo e a lista
  // mostra as réguas de todas as administradoras, inclusive as inativas.
  const [administratorList, ruleList] = await Promise.all([
    administratorRepository.list(),
    administratorInstallmentRuleRepository.list(),
  ]);
  const activeAdministratorList = selectActiveAdministrators(administratorList);
  const rules = describeInstallmentRules(ruleList, today);

  return (
    <>
      <PageHeader
        eyebrow="Cadastros"
        title="Réguas de parcelas"
        subtitle="Defina como cada administradora distribui a comissão entre as parcelas."
      />

      <PageBody>
        <Card aria-labelledby="new-rule-title">
          <CardHeading
            titleId="new-rule-title"
            kicker="Nova vigência"
            title="Nova régua de parcelas"
            description="A régua vale por produto ou plano a partir da data informada. Uma régua não é editada nem excluída: para corrigir, cadastre a vigência seguinte."
          />

          {activeAdministratorList.length === 0 ? (
            <Alert tone="attention">
              Cadastre uma administradora ativa antes de criar a régua de
              parcelas.
            </Alert>
          ) : (
            <InstallmentRuleForm
              administrators={activeAdministratorList.map(({ id, name }) => ({
                id,
                name,
              }))}
              defaultEffectiveFrom={today}
            />
          )}
        </Card>

        <Card flush aria-labelledby="installment-rules-title">
          <CardHeading
            titleId="installment-rules-title"
            kicker={formatRuleCount(rules.length)}
            title="Réguas cadastradas"
            description="Por administradora e produto, da vigência mais recente para a mais antiga."
          />

          {rules.length === 0 ? (
            <EmptyState
              icon={Ruler}
              title="Nenhuma régua cadastrada"
              description="Use o formulário acima para cadastrar a primeira vigência."
            />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Administradora</th>
                  <th>Produto ou plano</th>
                  <th>Início da vigência</th>
                  <th>Parcelas</th>
                  <th>Total</th>
                  <th>Distribuição</th>
                  <th>Condição</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const condition = describeVersion(rule, today);

                  return (
                    <tr key={rule.id}>
                      <td>{rule.administratorName}</td>
                      <td className={styles.product}>{rule.product}</td>
                      <td className="num">{formatDate(rule.effectiveFrom)}</td>
                      <td className="num">
                        {rule.installmentRatesBasisPoints.length}
                      </td>
                      <td className="num">
                        {formatRate(rule.totalBasisPoints)}
                      </td>
                      <td className={`num ${styles.distribution}`}>
                        {formatDistribution(rule.installmentRatesBasisPoints)}
                      </td>
                      <td>
                        <StatusBadge tone={condition.tone}>
                          {condition.label}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
        </Card>
      </PageBody>
    </>
  );
}
