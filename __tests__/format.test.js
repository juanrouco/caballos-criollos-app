import { formatDate } from '../src/format';

describe('formatDate', () => {
  test('YYYY-MM-DD → DD/MM/YYYY', () => {
    expect(formatDate('2018-08-10')).toBe('10/08/2018');
    expect(formatDate('2026-01-05')).toBe('05/01/2026');
  });

  test('si la entrada no matchea ISO la devuelve como está', () => {
    expect(formatDate('12/10/2019')).toBe('12/10/2019');
    expect(formatDate('Abril 12, 2026')).toBe('Abril 12, 2026');
    expect(formatDate('2018-8-10')).toBe('2018-8-10'); // sin padding, no la tocamos
  });

  test('null / undefined / "" → ""', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });
});
