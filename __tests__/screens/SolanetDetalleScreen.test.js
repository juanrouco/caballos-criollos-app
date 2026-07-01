import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchSolanetDetalle: jest.fn(),
  decodeEntities: jest.requireActual('../../src/api/rankings').decodeEntities,
}));
const { fetchSolanetDetalle } = require('../../src/api');
const SolanetDetalleScreen = require('../../src/screens/SolanetDetalleScreen').default;
const { T, navStub, routeStub } = require('../helpers');

const RESP = {
  propietario: { numero: '221', nombre: 'MATHO GARAT, RICARDO D.' },
  columnas: [{ key: 'animal', label: 'Animal' }, { key: 'sba', label: 'SBA' }, { key: 'points', label: 'Puntos' }],
  filas: [{ animal: 'CHAKE VIROLA E PLATA', sba: '98015', animalId: 'pdre:132388', points: '19.00' }],
};

beforeEach(() => { fetchSolanetDetalle.mockReset(); fetchSolanetDetalle.mockResolvedValue(RESP); });

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

  test('tocar un mérito con animalId abre el pedigree (HorseDetail)', async () => {
    const nav = navStub();
    const { findByText } = renderDet(nav);
    fireEvent.press(await findByText('CHAKE VIROLA E PLATA'));
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'pdre:132388' });
  });

  test('sin méritos muestra empty state', async () => {
    fetchSolanetDetalle.mockResolvedValue({ columnas: [], filas: [] });
    const { findByText } = renderDet();
    expect(await findByText(/Sin méritos/)).toBeTruthy();
  });
});
