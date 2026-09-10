/**
 * A vigência válida em uma data é a de maior início que não ultrapassa essa
 * data. Datas no formato AAAA-MM-DD comparam corretamente como texto, e a
 * ordem da lista recebida não importa.
 */
export function findRateValidOn<Rate extends { effectiveFrom: string }>(
  rates: readonly Rate[],
  date: string,
): Rate | null {
  let selected: Rate | null = null;

  for (const rate of rates) {
    if (
      rate.effectiveFrom <= date &&
      (selected === null || rate.effectiveFrom > selected.effectiveFrom)
    ) {
      selected = rate;
    }
  }

  return selected;
}
