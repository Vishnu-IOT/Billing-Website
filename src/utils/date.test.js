import { formatDateForInput, parseDateFromInput, todayISO } from './date';

describe('DD/MM/YYYY date inputs', () => {
  test('formats the local calendar day without shifting it to the previous UTC date', () => {
    const localDate = {
      getFullYear: () => 2026,
      getMonth: () => 10,
      getDate: () => 1,
      toISOString: () => '2026-10-31T18:30:00.000Z',
    };

    expect(todayISO(localDate)).toBe('2026-11-01');
  });

  test('formats API date values for display', () => {
    expect(formatDateForInput('2026-11-12')).toBe('12/11/2026');
    expect(formatDateForInput('2026-11-12T08:30:00.000Z')).toBe('12/11/2026');
  });

  test('parses valid DD/MM/YYYY values to ISO dates', () => {
    expect(parseDateFromInput('12/11/2026')).toBe('2026-11-12');
    expect(parseDateFromInput('1/2/2026')).toBe('2026-02-01');
    expect(parseDateFromInput('2026-11-12')).toBe('2026-11-12');
  });

  test('rejects invalid and ambiguous date values', () => {
    expect(parseDateFromInput('31/02/2026')).toBeNull();
    expect(parseDateFromInput('12/13/2026')).toBeNull();
    expect(parseDateFromInput('12/11/26')).toBeNull();
    expect(parseDateFromInput('')).toBe('');
  });
});
