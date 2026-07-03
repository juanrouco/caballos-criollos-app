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
  fetchAnimales.mockReset(); fetchAnimales.mockResolvedValue({ data: [{ id: 'exis:119553', nombre: 'CHAKE VIROLA E PLATA', sba: '98015', rp: '5047' }] });
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
    await waitFor(() => expect(fetchAnimales).toHaveBeenCalledWith({ sba: '98015', rp: '5047' }));
    // Usa el id resuelto (exis:119553), NO el animalId errado del detalle (pdre:132388)
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'exis:119553' });
  });

  test('si SBA+RP no resuelve, cae al animalId del detalle', async () => {
    fetchAnimales.mockResolvedValue({ data: [] });
    const nav = navStub();
    const { findByText } = renderDet(nav);
    fireEvent.press(await findByText('CHAKE VIROLA E PLATA'));
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'pdre:132388' }));
  });

  test('sin méritos muestra empty state', async () => {
    fetchSolanetDetalle.mockResolvedValue({ columnas: [], filas: [] });
    const { findByText } = renderDet();
    expect(await findByText(/Sin méritos/)).toBeTruthy();
  });
});
