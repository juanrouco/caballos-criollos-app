import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('../../src/api', () => ({
  fetchDelegaciones: jest.fn(),
  mapDelegacion: jest.requireActual('../../src/api/delegaciones').mapDelegacion,
}));
const { fetchDelegaciones } = require('../../src/api');
const MapaScreen = require('../../src/screens/MapaScreen').default;
const { T } = require('../helpers');

const DELS = [
  { numero: 1, romano: 'I', titulo: 'Delegación I - NOA', delegado: 'María Lourdes Arias Figueroa', email: 'd1@accc.com' },
  { numero: 4, romano: 'IV', titulo: 'Delegación IV - CUYO', delegado: 'Gonzalo Perea' },
];

beforeEach(() => { fetchDelegaciones.mockReset(); fetchDelegaciones.mockResolvedValue({ data: DELS }); });

describe('MapaScreen', () => {
  test('carga las delegaciones y las lista', async () => {
    const { findByText, getByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    expect(await findByText('Delegación I - NOA')).toBeTruthy();
    expect(getByText('Gonzalo Perea')).toBeTruthy();
  });

  test('tocar un marcador del mapa muestra la delegación + delegado', async () => {
    const { findByText, getByLabelText, getAllByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    await findByText('Delegación I - NOA'); // lista cargada
    fireEvent.press(getByLabelText('Delegación I')); // marcador del mapa
    // El delegado aparece en la card de detalle (además de en la lista)
    await waitFor(() => expect(getAllByText('María Lourdes Arias Figueroa').length).toBeGreaterThan(1));
  });

  test('tocar una fila de la lista selecciona y ofrece el email por mailto', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { findByText, getByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    fireEvent.press(await findByText('Delegación I - NOA'));
    fireEvent.press(await findByText('d1@accc.com')); // enlace de email en la card
    expect(spy).toHaveBeenCalledWith('mailto:d1@accc.com');
    spy.mockRestore();
  });

  test('error de la API muestra el mensaje', async () => {
    fetchDelegaciones.mockRejectedValue(new Error('net'));
    const { findByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    expect(await findByText(/No se pudieron cargar/)).toBeTruthy();
  });
});
