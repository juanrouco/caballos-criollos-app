import { mapAnimalPedigree } from '../../src/api/animales';

describe('mapAnimalPedigree', () => {
  test('mapea el animal raíz al shape de pantalla', () => {
    const payload = {
      animal: {
        id: 'pdre:1000',
        nombre: 'FERMIN REMOLON',
        sba: 6598,
        rp: '3',
        sexo: 'M',
        propietario: { numero: '376', nombre: 'HERMANAS BUSQUET' },
        criador: { numero: '1963', nombre: 'LOS POTRERITOS' },
      },
      pedigree: { padre: null, madre: null },
    };
    const h = mapAnimalPedigree(payload);
    expect(h.id).toBe('pdre:1000');
    expect(h.name).toBe('FERMIN REMOLON');
    expect(h.sex).toBe('Macho');
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
});
