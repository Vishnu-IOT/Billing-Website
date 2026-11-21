export const CASH_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];

export function createEmptyDenominationCounts() {
  return Object.fromEntries(
    CASH_DENOMINATIONS.map((denomination) => [String(denomination), "0"]),
  );
}

export function areDenominationCountsValid(counts) {
  return CASH_DENOMINATIONS.every((denomination) => {
    const count = counts?.[String(denomination)];
    const numericCount = Number(count);
    return (
      count !== "" &&
      count !== null &&
      count !== undefined &&
      (typeof count === "number" ||
        (typeof count === "string" && /^\d+$/.test(count))) &&
      Number.isSafeInteger(numericCount) &&
      numericCount >= 0
    );
  });
}

export function getDenominationTotal(counts) {
  if (!areDenominationCountsValid(counts)) return Number.NaN;
  const total = CASH_DENOMINATIONS.reduce(
    (sum, denomination) =>
      sum + denomination * Number(counts[String(denomination)]),
    0,
  );
  return Math.round(total * 100) / 100;
}

export function normalizeDenominationCounts(counts) {
  if (!areDenominationCountsValid(counts)) return null;
  return Object.fromEntries(
    CASH_DENOMINATIONS.map((denomination) => [
      String(denomination),
      Number(counts[String(denomination)]),
    ]),
  );
}

export function getExpectedClosingCash(shift = {}) {
  return (
    Number(shift?.openingFloat || 0) +
    Number(shift?.cashSalesTotal || 0) +
    Number(shift?.cashInTotal || 0) -
    Number(shift?.cashOutTotal || 0) -
    Number(shift?.cashRefundsTotal || 0)
  );
}
