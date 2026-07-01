import { formatDate, formatDateLong } from '../src/format';

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

describe('formatDateLong', () => {
  test('YYYY-MM-DD → "D de mes YYYY" (mes en minúscula, sin coma)', () => {
    expect(formatDateLong('2026-07-16')).toBe('16 de julio 2026');
    expect(formatDateLong('2026-04-05')).toBe('5 de abril 2026');
    expect(formatDateLong('2026-01-01')).toBe('1 de enero 2026');
  });

  test('no ISO → tal cual; null/"" → ""', () => {
    expect(formatDateLong('16/07/2026')).toBe('16/07/2026');
    expect(formatDateLong(null)).toBe('');
    expect(formatDateLong('')).toBe('');
  });
});
