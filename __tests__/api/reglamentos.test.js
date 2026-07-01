import { mapReglamento } from '../../src/api/reglamentos';

describe('mapReglamento', () => {
  test('mapea id / titulo / prueba / fecha', () => {
    const m = mapReglamento({
      id: 1072,
      titulo: 'Freno de Oro - Reglamento',
      fecha: '2026-03-01',
      prueba: { id: 4, nombre: 'Freno de Oro' },
    });
    expect(m).toEqual({
      id: 1072,
      title: 'Freno de Oro - Reglamento',
      pruebaId: 4,
      prueba: 'Freno de Oro',
      date: '1 Mar 2026',
    });
  });

  test('prueba null → pruebaId null y prueba vacío', () => {
    const m = mapReglamento({ id: 1, titulo: 'X', fecha: '2026-01-05', prueba: null });
    expect(m.pruebaId).toBeNull();
    expect(m.prueba).toBe('');
    expect(m.date).toBe('5 Ene 2026');
  });

  test('fecha inválida → date vacío', () => {
    expect(mapReglamento({ id: 1, titulo: 'X', fecha: '' }).date).toBe('');
  });
});
