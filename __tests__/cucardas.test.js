import { cucardaDePremio, cucardaDeLogro, cucardaFuncional, CUCARDAS } from '../src/cucardas';

describe('cucardaDePremio (resultados de jura)', () => {
  // Los ids son los del catálogo de premios del sistema, relevados contra la
  // API de producción: 1-4 gran campeonato, 5-8 campeonato, 9-12 premios,
  // 13-14 menciones, 17 sin premio.
  test('resuelve por id del catálogo de premios', () => {
    expect(cucardaDePremio({ id: 1, nombre: 'Gran Campeón' }).slug).toBe('gran-campeon');
    expect(cucardaDePremio({ id: 5, nombre: 'Campeón' }).slug).toBe('campeon');
    expect(cucardaDePremio({ id: 9, nombre: 'Primer Premio' }).slug).toBe('premio-1');
    expect(cucardaDePremio({ id: 13, nombre: 'Primer Mención' }).slug).toBe('mencion-1');
  });

  test('«Tercer Mejor» es distinto en campeonato y en gran campeonato: lo dice el id', () => {
    expect(cucardaDePremio({ id: 3, nombre: 'Tercer Mejor' }).slug).toBe('gran-tercer-mejor');
    expect(cucardaDePremio({ id: 7, nombre: 'Tercer Mejor' }).slug).toBe('tercer-mejor');
  });

  test('«Sin Premio» no lleva cucarda', () => {
    expect(cucardaDePremio({ id: 17, nombre: 'Sin Premio' })).toBeNull();
    expect(cucardaDePremio(null)).toBeNull();
    expect(cucardaDePremio({})).toBeNull();
  });

  test('sin id conocido cae al nombre, con el typo del catálogo incluido', () => {
    expect(cucardaDePremio({ nombre: 'Resevado Campeón' }).slug).toBe('reservado');
    expect(cucardaDePremio({ nombre: 'segundo premio' }).slug).toBe('premio-2');
    expect(cucardaDePremio({ id: 999, nombre: 'Cuarto Premio' }).slug).toBe('premio-4');
    expect(cucardaDePremio({ nombre: 'Premio inventado' })).toBeNull();
  });

  test('cada cucarda trae imagen y rótulo', () => {
    Object.entries(CUCARDAS).forEach(([slug, c]) => {
      expect(c.src).toBeTruthy();
      expect(typeof c.label).toBe('string');
      expect(c.label.length).toBeGreaterThan(0);
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    });
  });
});

describe('cucardaDeLogro (méritos y detalle Solanet)', () => {
  // Ahí no hay id: sólo el texto del logro y el de la prueba.
  test('la prueba decide el juego: «Campeón» no es lo mismo en jura que en funcionales', () => {
    expect(cucardaDeLogro('Campeón', 'Morfologia').slug).toBe('campeon');
    expect(cucardaDeLogro('Campeon', 'Rodeos').slug).toBe('func-campeon');
    expect(cucardaDeLogro('Campeón', 'R.J. Dowdall').slug).toBe('func-campeon');
  });

  test('logros de la jura', () => {
    expect(cucardaDeLogro('Gran Campeón', 'Morfologia').slug).toBe('gran-campeon');
    expect(cucardaDeLogro('Reservado Gran Campeón', 'Morfologia').slug).toBe('gran-reservado');
    expect(cucardaDeLogro('Resevado Campeón', 'Morfologia').slug).toBe('reservado');
    expect(cucardaDeLogro('Primer Mención', 'Tipo y Aptitud').slug).toBe('mencion-1');
  });

  test('logros de las funcionales', () => {
    expect(cucardaDeLogro('Subcampeon', 'F.Z.B.').slug).toBe('func-subcampeon');
    expect(cucardaDeLogro('Tercero', 'Corral de aparte').slug).toBe('func-tercero');
  });

  test('la cucarda de cuarto funcional es sólo del Freno de Oro', () => {
    expect(cucardaDeLogro('Cuarto', 'Freno de Oro').slug).toBe('func-cuarto');
    expect(cucardaDeLogro('Cuarto', 'Rodeos')).toBeNull();
  });

  test('finalista y semifinalista no son cucarda', () => {
    expect(cucardaDeLogro('Finalista', 'Rodeos')).toBeNull();
    expect(cucardaDeLogro('Semifinalista', 'Freno de Oro')).toBeNull();
    expect(cucardaDeLogro('Fin.B', 'Marcha')).toBeNull();
    expect(cucardaDeLogro('', 'Morfologia')).toBeNull();
    expect(cucardaDeLogro(null, null)).toBeNull();
  });
});

describe('cucardaFuncional (resultados de una prueba funcional)', () => {
  test('sólo en la final: ni clasificatoria ni tercio final llevan', () => {
    expect(cucardaFuncional({ puesto: 1, clasificacion: 'Final', pruebaKey: 'rodeos' }).slug).toBe('func-campeon');
    expect(cucardaFuncional({ puesto: 1, clasificacion: 'Clasificatoria', pruebaKey: 'rodeos' })).toBeNull();
    expect(cucardaFuncional({ puesto: 1, clasificacion: 'TercioFinal', pruebaKey: 'rodeos' })).toBeNull();
    expect(cucardaFuncional({ puesto: 1, clasificacion: 'CopaEspecial', pruebaKey: 'rodeos' })).toBeNull();
    expect(cucardaFuncional({ puesto: 1 })).toBeNull();
  });

  test('del primero al tercero en cualquier funcional; el cuarto sólo en Freno de Oro', () => {
    const f = (puesto, pruebaKey) => cucardaFuncional({ puesto, clasificacion: 'Final', pruebaKey });
    expect(f(2, 'aparte_campero').slug).toBe('func-subcampeon');
    expect(f(3, 'fzb').slug).toBe('func-tercero');
    expect(f(4, 'freno_oro').slug).toBe('func-cuarto');
    expect(f(4, 'fzb')).toBeNull();
    expect(f(5, 'freno_oro')).toBeNull();
  });

  test('sin puesto no hay cucarda (el índice de la lista no es un podio)', () => {
    expect(cucardaFuncional({ puesto: null, clasificacion: 'Final', pruebaKey: 'rodeos' })).toBeNull();
    expect(cucardaFuncional({ puesto: undefined, clasificacion: 'Final', pruebaKey: 'rodeos' })).toBeNull();
  });
});
