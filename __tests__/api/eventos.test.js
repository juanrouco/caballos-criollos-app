import { mapEvent, isEmptyCatalog, isEmptyResults } from '../../src/api/eventos';

describe('mapEvent', () => {
  test('formatea fecha corta + larga + día de la semana', () => {
    const ev = {
      id: 2057,
      titulo: 'Expo Nacional',
      fecha: '2026-04-10', // viernes
      fecha_hasta: '2026-04-15',
      suspendido: false,
      provincia: { id: 5, nombre: 'Buenos Aires' },
      localidad: 'Palermo',
      categorias: [{ id: 7, nombre: 'Exposición Nacional' }, { id: 10, nombre: 'Expo FICCC' }],
    };
    const m = mapEvent(ev);
    expect(m.id).toBe(2057);
    expect(m.name).toBe('Expo Nacional');
    expect(m.date).toBe('10 Abr');
    expect(m.dateFull).toBe('10 de Abril, 2026');
    expect(m.dayShort).toBe('VIE');
    expect(m.location).toBe('Palermo · Buenos Aires');
    expect(m.disciplines).toEqual(['Exposición Nacional', 'Expo FICCC']);
    expect(m.type).toBe('Exposición Nacional');
    expect(m.suspendido).toBe(false);
    expect(m.raw).toBe(ev);
  });

  test('si falta provincia / localidad, location queda armable sin separadores sobrantes', () => {
    const m = mapEvent({ id: 1, titulo: 'X', fecha: '2026-03-05', localidad: 'Solo', provincia: null, categorias: [] });
    expect(m.location).toBe('Solo');
  });

  test('si no hay categorías, type cae a "Evento"', () => {
    const m = mapEvent({ id: 1, titulo: 'X', fecha: '2026-03-05', categorias: [] });
    expect(m.type).toBe('Evento');
    expect(m.disciplines).toEqual([]);
  });

  test('flag suspendido se pasa al mapeo', () => {
    const m = mapEvent({ id: 1, titulo: 'X', fecha: '2026-03-05', suspendido: true });
    expect(m.suspendido).toBe(true);
  });

  test('fecha inválida deja date / dateFull / dayShort vacíos', () => {
    const m = mapEvent({ id: 1, titulo: 'X', fecha: '' });
    expect(m.date).toBe('');
    expect(m.dateFull).toBe('');
    expect(m.dayShort).toBe('');
  });
});

describe('isEmptyCatalog', () => {
  test('null / undefined cuentan como vacío', () => {
    expect(isEmptyCatalog(null)).toBe(true);
    expect(isEmptyCatalog(undefined)).toBe(true);
  });

  test('estructura sin animales en ninguna prueba ni morfológica es vacío', () => {
    expect(isEmptyCatalog({ pruebas_funcionales: [], morfologicas: [] })).toBe(true);
    expect(isEmptyCatalog({
      pruebas_funcionales: [{ categorias: [{ animales: [] }] }],
      morfologicas: [{ animales: [] }],
    })).toBe(true);
  });

  test('un animal en una prueba funcional alcanza para no estar vacío', () => {
    expect(isEmptyCatalog({
      pruebas_funcionales: [{ categorias: [{ animales: [{ id: 'pdre:1' }] }] }],
      morfologicas: [],
    })).toBe(false);
  });

  test('un animal en morfológicas también', () => {
    expect(isEmptyCatalog({
      pruebas_funcionales: [],
      morfologicas: [{ animales: [{ id: 'exis:1' }] }],
    })).toBe(false);
  });
});

describe('isEmptyResults', () => {
  test('null o sin grupos cuenta como vacío', () => {
    expect(isEmptyResults(null)).toBe(true);
    expect(isEmptyResults({})).toBe(true);
  });

  test('grupos con arrays vacíos en gran_campeonato / campeonato / categorias es vacío', () => {
    expect(isEmptyResults({
      morfologia: {
        gran_campeonato: [{ resultados: [] }],
        campeonato: [{ resultados: [] }],
        categorias: [{ premios: [] }],
      },
      tipo_aptitud: null,
    })).toBe(true);
  });

  test('un puesto en gran_campeonato alcanza para no estar vacío', () => {
    expect(isEmptyResults({
      morfologia: { gran_campeonato: [{ resultados: [{ animal: { id: 'x' } }] }] },
    })).toBe(false);
  });

  test('un premio en categorias también', () => {
    expect(isEmptyResults({
      tipo_aptitud: { categorias: [{ premios: [{ animal: { id: 'x' } }] }] },
    })).toBe(false);
  });

  test('rodeos sin pruebas o con pruebas sin yuntas cuenta como vacío', () => {
    expect(isEmptyResults({ rodeos: { pruebas: [] } })).toBe(true);
    expect(isEmptyResults({ rodeos: { pruebas: [{ yuntas: [] }] } })).toBe(true);
  });

  test('una yunta en cualquier prueba de rodeo alcanza para no estar vacío', () => {
    expect(isEmptyResults({
      rodeos: { pruebas: [{ clasificacion: 'Final', yuntas: [{ puesto: { general: 1 }, animales: [] }] }] },
    })).toBe(false);
  });
});
