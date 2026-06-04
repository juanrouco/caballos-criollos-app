import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchAnimalPedigree: jest.fn(),
  mapAnimalPedigree: jest.requireActual('../../src/api/animales').mapAnimalPedigree,
}));
const { fetchAnimalPedigree } = require('../../src/api');
const HorseDetailScreen = require('../../src/screens/HorseDetailScreen').default;
const { T, navStub, routeStub, flushPromises } = require('../helpers');

beforeEach(() => { fetchAnimalPedigree.mockReset(); });

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
        propietario: { numero: '301', nombre: 'SOLANET, CARLOS A.' },
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
    expect(getByText('SOLANET, CARLOS A.')).toBeTruthy();
    expect(getByText(/N° 301/)).toBeTruthy();
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
