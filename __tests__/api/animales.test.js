import { mapAnimalPedigree, mapMerito, meritosPorTemporada } from '../../src/api/animales';

describe('mapAnimalPedigree', () => {
  test('mapea el animal raíz al shape de pantalla', () => {
    const payload = {
      animal: {
        id: 'pdre:1000',
        nombre: 'FERMIN REMOLON',
        sba: 6598,
        rp: '3',
        sexo: 'M',
        fecha_nacimiento: '1985-09-12',
        pelaje: 'Gateado',
        propietario: { numero: '376', nombre: 'HERMANAS BUSQUET' },
        criador: { numero: '1963', nombre: 'LOS POTRERITOS' },
      },
      pedigree: { padre: null, madre: null },
    };
    const h = mapAnimalPedigree(payload);
    expect(h.id).toBe('pdre:1000');
    expect(h.name).toBe('FERMIN REMOLON');
    expect(h.sex).toBe('Macho');
    expect(h.born).toBe('1985-09-12');
    expect(h.pelaje).toBe('Gateado');
    expect(h.rp).toBe('3');
    expect(h.sba).toBe('6598');
    expect(h.propietario).toBe('HERMANAS BUSQUET');
    expect(h.propietarioNum).toBe('376');
    expect(h.criador).toBe('LOS POTRERITOS');
    expect(h.criadorNum).toBe('1963');
    expect(h.sire).toBe(null);
    expect(h.dam).toBe(null);
  });

  test('mapea hembras y castrados', () => {
    const f = mapAnimalPedigree({ animal: { sexo: 'H' }, pedigree: {} });
    expect(f.sex).toBe('Hembra');
    const c = mapAnimalPedigree({ animal: { sexo: 'C' }, pedigree: {} });
    expect(c.sex).toBe('Castrado');
    const x = mapAnimalPedigree({ animal: { sexo: 'X' }, pedigree: {} });
    expect(x.sex).toBe('');
  });

  test('árbol recursivo: padre/madre y sus padres se mapean a sire/dam', () => {
    const payload = {
      animal: { id: 'pdre:1', nombre: 'A' },
      pedigree: {
        padre: {
          id: 'pdre:2',
          nombre: 'PADRE',
          sexo: 'M',
          padre: { id: 'pdre:3', nombre: 'ABUELO', sexo: 'M' },
          madre: { id: 'exis:4', nombre: 'ABUELA', sexo: 'H' },
        },
        madre: { id: 'exis:5', nombre: 'MADRE', sexo: 'H' },
      },
    };
    const h = mapAnimalPedigree(payload);
    expect(h.sire.name).toBe('PADRE');
    expect(h.sire.sex).toBe('M');
    expect(h.sire.sire.name).toBe('ABUELO');
    expect(h.sire.dam.name).toBe('ABUELA');
    expect(h.dam.name).toBe('MADRE');
    expect(h.dam.sire).toBe(null);
    expect(h.dam.dam).toBe(null);
  });

  test('propietario / criador null no rompen', () => {
    const h = mapAnimalPedigree({ animal: { id: 'pdre:1', nombre: 'X' }, pedigree: {} });
    expect(h.propietario).toBe('');
    expect(h.propietarioNum).toBe('');
    expect(h.criador).toBe('');
    expect(h.criadorNum).toBe('');
  });

  test('rp/sba ausentes quedan como string vacío', () => {
    const h = mapAnimalPedigree({ animal: {}, pedigree: {} });
    expect(h.rp).toBe('');
    expect(h.sba).toBe('');
  });

  test('fecha_nacimiento / pelaje null quedan como string vacío (celdas ocultas)', () => {
    const h = mapAnimalPedigree({ animal: { fecha_nacimiento: null, pelaje: null }, pedigree: {} });
    expect(h.born).toBe('');
    expect(h.pelaje).toBe('');
  });
});

describe('mapMerito', () => {
  const crudo = {
    premio: { id: 2, nombre: '2025 - 2026' },
    evento: 'EXPO MERCEDES 12/09/2025', fecha: '2025-09-12',
    prueba: 'Morfologia', categoria: 'BPas', logro: 'Reservado Gran Campeón', puntos: 20,
  };

  test('los puntos enteros se muestran sin decimales', () => {
    expect(mapMerito(crudo).puntosLabel).toBe('20');
  });

  test('los puntos con decimales se muestran con ellos', () => {
    expect(mapMerito({ ...crudo, puntos: 19.5 }).puntosLabel).toBe('19.5');
    expect(mapMerito({ ...crudo, puntos: 19.456 }).puntosLabel).toBe('19.46');
  });

  test('la temporada sale del nombre del premio, crudo', () => {
    expect(mapMerito(crudo).temporada).toBe('2025 - 2026');
  });

  test('un mérito sin fecha ni puntos no rompe', () => {
    const m = mapMerito({ premio: null, evento: 'X', fecha: null, puntos: null });
    expect(m.fecha).toBeNull();
    expect(m.puntos).toBeNull();
    expect(m.puntosLabel).toBe('');
    expect(m.temporada).toBe('');
  });
});

describe('meritosPorTemporada', () => {
  const m = (temporada, logro) => ({ temporada, logro });

  test('sin méritos no hay grupos', () => {
    expect(meritosPorTemporada([])).toEqual([]);
    expect(meritosPorTemporada(null)).toEqual([]);
  });

  test('agrupa los consecutivos y conserva el orden que mandó la API', () => {
    const grupos = meritosPorTemporada([
      m('2026 - 2027', 'Tercer Premio'),
      m('2025 - 2026', 'Reservado'),
      m('2025 - 2026', 'Campeón'),
      m('2024 - 2025', 'Finalista'),
    ]);
    expect(grupos.map((g) => g.temporada)).toEqual(['2026 - 2027', '2025 - 2026', '2024 - 2025']);
    expect(grupos[1].meritos.map((x) => x.logro)).toEqual(['Reservado', 'Campeón']);
  });
});
