import {
  areDenominationCountsValid,
  createEmptyDenominationCounts,
  getDenominationTotal,
  getExpectedClosingCash,
  normalizeDenominationCounts,
} from './posShift';

describe('getExpectedClosingCash', () => {
  test('matches the shift cash reconciliation formula', () => {
    expect(
      getExpectedClosingCash({
        openingFloat: 1000,
        cashSalesTotal: 5000,
        cashInTotal: 200,
        cashOutTotal: 100,
        cashRefundsTotal: 50,
      }),
    ).toBe(6050);
  });

  test('defaults missing shift amounts to zero', () => {
    expect(getExpectedClosingCash()).toBe(0);
    expect(getExpectedClosingCash(null)).toBe(0);
  });
});

describe('cash denomination counts', () => {
  test('calculates and normalizes opening or closing cash counts', () => {
    const counts = {
      ...createEmptyDenominationCounts(),
      500: '2',
      100: '3',
      0.5: '1',
    };

    expect(getDenominationTotal(counts)).toBe(1300.5);
    expect(normalizeDenominationCounts(counts)['500']).toBe(2);
  });

  test('rejects empty, fractional, negative, and unsafe counts', () => {
    expect(areDenominationCountsValid({ ...createEmptyDenominationCounts(), 10: '' })).toBe(false);
    expect(areDenominationCountsValid({ ...createEmptyDenominationCounts(), 10: '1.5' })).toBe(false);
    expect(areDenominationCountsValid({ ...createEmptyDenominationCounts(), 10: '-1' })).toBe(false);
    expect(areDenominationCountsValid({ ...createEmptyDenominationCounts(), 10: '1e2' })).toBe(false);
    expect(areDenominationCountsValid({ ...createEmptyDenominationCounts(), 10: '9007199254740992' })).toBe(false);
    expect(getDenominationTotal({ ...createEmptyDenominationCounts(), 10: '' })).toBeNaN();
  });
});
