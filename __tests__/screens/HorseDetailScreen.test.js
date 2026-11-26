import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchAnimalPedigree: jest.fn(),
  mapAnimalPedigree: jest.requireActual('../../src/api/animales').mapAnimalPedigree,
  fetchMeritosAnimal: jest.fn(),
  mapMerito: jest.requireActual('../../src/api/animales').mapMerito,
  meritosPorTemporada: jest.requireActual('../../src/api/animales').meritosPorTemporada,
}));
const { fetchAnimalPedigree, fetchMeritosAnimal } = require('../../src/api');
const HorseDetailScreen = require('../../src/screens/HorseDetailScreen').default;
const { T, navStub, routeStub, flushPromises } = require('../helpers');

beforeEach(() => {
  fetchAnimalPedigree.mockReset();
  // Por defecto, un animal sin méritos: la sección no se dibuja.
  fetchMeritosAnimal.mockReset();
  fetchMeritosAnimal.mockResolvedValue({ data: [] });
});

describe('HorseDetailScreen', () => {
  test('sin id → muestra mensaje y botón Volver', async () => {
    const nav = navStub();
    const { findByText } = render(<HorseDetailScreen t={T} navigation={nav} route={routeStub({})} />);
    expect(await findByText(/Falta el id del animal/)).toBeTruthy();
  });

  test('loading inicial muestra ActivityIndicator', () => {
    fetchAnimalPedigree.mockReturnValue(new Promise(() => {})); // never resolves
    const { UNSAFE_getByType } = render(
      <HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 'pdre:cache-1' })} />,
    );
    expect(UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
  });

  test('render completo: nombre + RP/SBA + propietario + nodos del árbol', async () => {
    fetchAnimalPedigree.mockResolvedValueOnce({
      animal: {
        id: 'pdre:cache-1', nombre: 'MALACARA REGENTE', sexo: 'M', rp: '847291', sba: 108837,
        fecha_nacimiento: '1985-09-12', pelaje: 'Gateado',
        propietario: { numero: '301', nombre: 'SOLANET, CARLOS A.' },
        criador: { numero: '1963', nombre: 'LOS POTRERITOS' },
      },
      pedigree: {
        padre: { id: 'pdre:2', nombre: 'MALACARA SOBERANO', sexo: 'M' },
        madre: { id: 'exis:3', nombre: 'CARDAL AURORA', sexo: 'H' },
      },
    });
    const { findByText, getByText } = render(
      <HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 'pdre:cache-1' })} />,
    );
    expect(await findByText('MALACARA REGENTE')).toBeTruthy();
    expect(getByText(/R\.P\. 847291 · S\.B\.A\. 108837/)).toBeTruthy();
    // Fecha de nacimiento: celda "Nacimiento" con la fecha en formato DD/MM/YYYY.
    expect(getByText('Nacimiento')).toBeTruthy();
    expect(getByText('12/09/1985')).toBeTruthy();
    expect(getByText('Pelaje')).toBeTruthy();
    expect(getByText('Gateado')).toBeTruthy();
    expect(getByText('SOLANET, CARLOS A.')).toBeTruthy();
    expect(getByText(/N° 301/)).toBeTruthy();
    expect(getByText('Criador')).toBeTruthy();
    expect(getByText('LOS POTRERITOS')).toBeTruthy();
    expect(getByText(/N° 1963/)).toBeTruthy();
    expect(getByText('MALACARA SOBERANO')).toBeTruthy();
    expect(getByText('CARDAL AURORA')).toBeTruthy();
  });

  test('error muestra mensaje + Volver', async () => {
    fetchAnimalPedigree.mockRejectedValueOnce(new Error('Animal no encontrado'));
    const { findByText, getAllByText } = render(
      <HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 'pdre:999' })} />,
    );
    expect(await findByText(/Animal no encontrado/)).toBeTruthy();
    expect(getAllByText('Volver').length).toBeGreaterThan(0);
  });

  test('cache: dos renders del mismo id no doblan fetch', async () => {
    // Id único — el animalCache vive a nivel módulo y persiste entre tests.
    const id = 'pdre:cache-only-1';
    fetchAnimalPedigree.mockResolvedValue({
      animal: { id, nombre: 'CACHEADO' }, pedigree: {},
    });
    const first = render(
      <HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id })} />,
    );
    await first.findByText('CACHEADO');
    expect(fetchAnimalPedigree).toHaveBeenCalledTimes(1);
    first.unmount();
    // re-montar el mismo id: el cache evita el segundo fetch
    render(<HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id })} />);
    await act(async () => { await flushPromises(); });
    expect(fetchAnimalPedigree).toHaveBeenCalledTimes(1);
  });
});

// ── Ancestros navegables ─────────────────────────────────────────
// Cada nodo del pedigree trae su propio id compuesto, así que tocarlo abre su
// ficha. Lo que se afirma acá: que el id que viaja es el del ancestro tocado,
// que los huecos del árbol no son tocables, y que el salto se apila (push) en
// vez de cambiarle los params a la pantalla actual — que es lo que rompería el
// back al encadenar saltos.
describe('HorseDetailScreen · ancestros navegables', () => {
  const arbol = (id) => ({
    animal: { id, nombre: 'RAIZ', sexo: 'M' },
    pedigree: {
      padre: {
        id: 'pdre:2', nombre: 'EL PADRE', sexo: 'M',
        padre: { id: 'pdre:4', nombre: 'ABUELO PATERNO', sexo: 'M', padre: { id: 'pdre:8', nombre: 'BISABUELO', sexo: 'M' } },
        madre: null,
      },
      madre: { id: 'exis:3', nombre: 'LA MADRE', sexo: 'H' },
    },
  });

  test('tocar el padre apila su ficha con su id', async () => {
    fetchAnimalPedigree.mockResolvedValueOnce(arbol('pdre:1'));
    const nav = navStub();
    const { findByText, getByText } = render(
      <HorseDetailScreen t={T} navigation={nav} route={routeStub({ id: 'pdre:nav-1' })} />,
    );
    await findByText('RAIZ');
    fireEvent.press(getByText('EL PADRE'));
    expect(nav.push).toHaveBeenCalledWith('HorseDetail', { id: 'pdre:2' });
    // `navigate` a la misma pantalla sólo le cambiaría los params: no se usa.
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  test('tocar la madre, un abuelo y un bisabuelo lleva el id de cada uno', async () => {
    fetchAnimalPedigree.mockResolvedValueOnce(arbol('pdre:nav-2'));
    const nav = navStub();
    const { findByText, getByText } = render(
      <HorseDetailScreen t={T} navigation={nav} route={routeStub({ id: 'pdre:nav-2' })} />,
    );
    await findByText('RAIZ');
    fireEvent.press(getByText('LA MADRE'));
    fireEvent.press(getByText('ABUELO PATERNO'));
    fireEvent.press(getByText('BISABUELO'));
    expect(nav.push.mock.calls.map(([, p]) => p.id)).toEqual(['exis:3', 'pdre:4', 'pdre:8']);
  });

  test('los ancestros con datos quedan como botón accesible; los huecos no', async () => {
    fetchAnimalPedigree.mockResolvedValueOnce(arbol('pdre:nav-3'));
    const { findByText, getByLabelText, queryAllByRole } = render(
      <HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 'pdre:nav-3' })} />,
    );
    await findByText('RAIZ');
    expect(getByLabelText('Ver el pedigree de EL PADRE')).toBeTruthy();
    // 4 ancestros con datos en este árbol — los 10 huecos restantes del árbol
    // de 4 generaciones no suman botones (el back de la pantalla sí es uno).
    const botones = queryAllByRole('button').filter((b) =>
      /^Ver el pedigree de /.test(b.props.accessibilityLabel || ''));
    expect(botones).toHaveLength(4);
  });

  test('un nodo con nombre pero sin id no es tocable', async () => {
    fetchAnimalPedigree.mockResolvedValueOnce({
      animal: { id: 'pdre:nav-4', nombre: 'RAIZ SIN IDS' },
      pedigree: { padre: { nombre: 'SIN ID' }, madre: null },
    });
    const nav = navStub();
    const { findByText, getByText, queryByLabelText } = render(
      <HorseDetailScreen t={T} navigation={nav} route={routeStub({ id: 'pdre:nav-4' })} />,
    );
    await findByText('RAIZ SIN IDS');
    expect(getByText('SIN ID')).toBeTruthy();
    expect(queryByLabelText('Ver el pedigree de SIN ID')).toBeNull();
    fireEvent.press(getByText('SIN ID'));
    expect(nav.push).not.toHaveBeenCalled();
  });

  test('la ayuda de «tocá un ancestro» sólo va si hay alguno con ficha', async () => {
    fetchAnimalPedigree.mockResolvedValueOnce(arbol('pdre:nav-5'));
    const conAncestros = render(
      <HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 'pdre:nav-5' })} />,
    );
    expect(await conAncestros.findByText(/Tocá un ancestro/)).toBeTruthy();

    fetchAnimalPedigree.mockResolvedValueOnce({
      animal: { id: 'pdre:nav-6', nombre: 'HUERFANO' }, pedigree: { padre: null, madre: null },
    });
    const sinAncestros = render(
      <HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 'pdre:nav-6' })} />,
    );
    await sinAncestros.findByText('HUERFANO');
    expect(sinAncestros.queryByText(/Tocá un ancestro/)).toBeNull();
  });
});

describe('HorseDetailScreen · méritos', () => {
  const animal = (id) => ({
    animal: { id, nombre: 'CHAKE VIROLA', sexo: 'H', rp: '5047', sba: 98015 },
    ancestros: {},
  });
  const merito = (over = {}) => ({
    premio: { id: 2, nombre: '2025 - 2026' },
    evento: 'EXPO MERCEDES 12/09/2025', fecha: '2025-09-12',
    prueba: 'Morfologia', categoria: 'BPas', logro: 'Reservado Gran Campeón', puntos: 20,
    ...over,
  });

  test('los méritos salen agrupados por temporada, con sus puntos', async () => {
    fetchAnimalPedigree.mockResolvedValueOnce(animal('exis:meritos-1'));
    fetchMeritosAnimal.mockResolvedValueOnce({ data: [
      merito({ premio: { id: 3, nombre: '2026 - 2027' }, logro: 'Tercer Premio', puntos: 5 }),
      merito(),
      merito({ logro: 'Campeón', puntos: 23 }),
    ] });
    const { findByText, getByText, getAllByText } = render(
      <HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 'exis:meritos-1' })} />,
    );
    expect(await findByText('Méritos')).toBeTruthy();
    expect(getByText('2026 - 2027')).toBeTruthy();
    expect(getByText('2025 - 2026')).toBeTruthy();   // una sola vez: los dos de esa temporada van juntos
    expect(getByText('Reservado Gran Campeón')).toBeTruthy();
    expect(getByText('23')).toBeTruthy();
    // Misma unidad que el puntaje de morfología del evento, y una por mérito.
    expect(getAllByText('PES')).toHaveLength(3);
    // Los tres méritos son de la misma prueba, así que esa línea se repite.
    expect(getAllByText('Morfologia · BPas')).toHaveLength(3);
  });

  test('un animal sin méritos no muestra la sección', async () => {
    fetchAnimalPedigree.mockResolvedValueOnce(animal('exis:meritos-2'));
    fetchMeritosAnimal.mockResolvedValueOnce({ data: [] });
    const { findByText, queryByText } = render(
      <HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 'exis:meritos-2' })} />,
    );
    await findByText('CHAKE VIROLA');
    expect(queryByText('Méritos')).toBeNull();
  });

  test('si el endpoint no existe (API vieja, 404) la ficha no se rompe', async () => {
    fetchAnimalPedigree.mockResolvedValueOnce(animal('exis:meritos-3'));
    fetchMeritosAnimal.mockRejectedValueOnce(new Error('404'));
    const { findByText, queryByText } = render(
      <HorseDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 'exis:meritos-3' })} />,
    );
    await findByText('CHAKE VIROLA');
    expect(queryByText('Méritos')).toBeNull();
  });
});
