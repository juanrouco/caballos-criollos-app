import { todayISO } from '../../src/api/utils';

describe('todayISO', () => {
  test('devuelve YYYY-MM-DD con padding de mes y día', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 3, 12, 0, 0)); // 3-ene-2026
    try {
      expect(todayISO()).toBe('2026-01-03');
    } finally {
      jest.useRealTimers();
    }
  });

  test('mes y día de dos dígitos no se padean de más', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 25, 12, 0, 0)); // 25-nov-2026
    try {
      expect(todayISO()).toBe('2026-11-25');
    } finally {
      jest.useRealTimers();
    }
  });
});
