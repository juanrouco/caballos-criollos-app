import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchSolanetDetalle: jest.fn(),
  fetchAnimales: jest.fn(),
  decodeEntities: jest.requireActual('../../src/api/rankings').decodeEntities,
}));
const { fetchSolanetDetalle, fetchAnimales } = require('../../src/api');
const SolanetDetalleScreen = require('../../src/screens/SolanetDetalleScreen').default;
const { T, navStub, routeStub } = require('../helpers');

const RESP = {
  propietario: { numero: '221', nombre: 'MATHO GARAT, RICARDO D.' },
  columnas: [{ key: 'animal', label: 'Animal' }, { key: 'sba', label: 'SBA' }, { key: 'points', label: 'Puntos' }],
  // El animalId del detalle está errado (SBA repetido entre tablas); se resuelve por SBA+RP.
  filas: [{ animal: 'CHAKE VIROLA E PLATA', sba: '98015', rp: '5047', animalId: 'pdre:132388', points: '19.00' }],
};

beforeEach(() => {
  fetchSolanetDetalle.mockReset(); fetchSolanetDetalle.mockResolvedValue(RESP);
  // /animales?sba= devuelve TODOS los animales con esa SBA (la SBA se repite
  // entre tablas); la pantalla elige por RP.
  fetchAnimales.mockReset();
  fetchAnimales.mockResolvedValue({ data: [
    { id: 'pdre:132388', nombre: 'DON ROMEO JURADO', sba: '98015', rp: '77' },
    { id: 'exis:119553', nombre: 'CHAKE VIROLA E PLATA', sba: '98015', rp: '5047' },
  ] });
});

const renderDet = (nav = navStub()) =>
  render(<SolanetDetalleScreen t={T} navigation={nav} route={routeStub({ premio: 2, propietario: '221', nombre: 'MATHO GARAT, RICARDO D.', points: '109.50' })} />);

describe('SolanetDetalleScreen', () => {
  test('pide el detalle con premio+propietario y lista los méritos', async () => {
    const { findByText, getByText } = renderDet();
    expect(await findByText('CHAKE VIROLA E PLATA')).toBeTruthy();
    expect(getByText('MATHO GARAT, RICARDO D.')).toBeTruthy(); // header propietario
    expect(getByText('109.50')).toBeTruthy();  // total de puntos del propietario
    expect(getByText(/SBA 98015/)).toBeTruthy();
    expect(fetchSolanetDetalle).toHaveBeenCalledWith({ premio: 2, propietario: '221' });
  });

  test('tocar un mérito resuelve por SBA+RP y abre el pedigree correcto', async () => {
    const nav = navStub();
    const { findByText } = renderDet(nav);
    fireEvent.press(await findByText('CHAKE VIROLA E PLATA'));
    await waitFor(() => expect(fetchAnimales).toHaveBeenCalledWith({ sba: '98015' }));
    // Elige el candidato del RP de la fila (exis:119553), NO el animalId que
    // trae la API resolviendo la SBA sola (pdre:132388, que es otro animal).
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'exis:119553' });
  });

  test('RP con otro formato: si la SBA tiene un único candidato, lo usa igual', async () => {
    fetchAnimales.mockResolvedValue({ data: [{ id: 'exis:119553', nombre: 'CHAKE VIROLA E PLATA', sba: '98015', rp: '05047 ' }] });
    const nav = navStub();
    const { findByText } = renderDet(nav);
    fireEvent.press(await findByText('CHAKE VIROLA E PLATA'));
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'exis:119553' }));
  });

  test('SBA ambigua y sin match por RP: no navega (no usa el animalId de la API)', async () => {
    fetchAnimales.mockResolvedValue({ data: [
      { id: 'pdre:132388', nombre: 'DON ROMEO JURADO', sba: '98015', rp: '77' },
      { id: 'exis:119553', nombre: 'CHAKE VIROLA E PLATA', sba: '98015', rp: '9999' },
    ] });
    const nav = navStub();
    const { findByText } = renderDet(nav);
    fireEvent.press(await findByText('CHAKE VIROLA E PLATA'));
    await waitFor(() => expect(fetchAnimales).toHaveBeenCalled());
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  test('fila sin SBA: usa el animalId del detalle, sin resolver', async () => {
    fetchSolanetDetalle.mockResolvedValue({
      ...RESP,
      filas: [{ animal: 'ANIMAL SIN SBA', sba: null, rp: null, animalId: 'pdre:999', points: '5.00' }],
    });
    const nav = navStub();
    const { findByText } = renderDet(nav);
    fireEvent.press(await findByText('ANIMAL SIN SBA'));
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'pdre:999' });
    expect(fetchAnimales).not.toHaveBeenCalled();
  });

  test('sin méritos muestra empty state', async () => {
    fetchSolanetDetalle.mockResolvedValue({ columnas: [], filas: [] });
    const { findByText } = renderDet();
    expect(await findByText(/Sin méritos/)).toBeTruthy();
  });
});
