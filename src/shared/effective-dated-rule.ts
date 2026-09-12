/**
 * A vigência válida em uma data é a de maior início que não ultrapassa essa
 * data. Datas no formato AAAA-MM-DD comparam corretamente como texto, e a
 * ordem da lista recebida não importa.
 */
export function findRuleValidOn<Rule extends { effectiveFrom: string }>(
  rules: readonly Rule[],
  date: string,
): Rule | null {
  let selected: Rule | null = null;

  for (const rule of rules) {
    if (
      rule.effectiveFrom <= date &&
      (selected === null || rule.effectiveFrom > selected.effectiveFrom)
    ) {
      selected = rule;
    }
  }

  return selected;
}
