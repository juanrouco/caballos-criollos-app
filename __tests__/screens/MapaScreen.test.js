import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('../../src/api', () => ({
  fetchDelegados: jest.fn(),
  mapDelegado: jest.requireActual('../../src/api/delegados').mapDelegado,
}));
const { fetchDelegados } = require('../../src/api');
const MapaScreen = require('../../src/screens/MapaScreen').default;
const { T } = require('../helpers');

// Shape real de GET /delegados: { mapa, data: [{ delegacion, nombre, email }] }
const RESP = {
  mapa: 'https://caballoscriollos.com/web/assets/images/mapa_delegados.png',
  data: [
    { delegacion: 'DELEGACIÓN I - NOA', nombre: 'María Lourdes Arias Figueroa', email: 'lulyaf84@hotmail.com' },
    { delegacion: 'DELEGACIÓN V - a - CENTRO NORTE', nombre: 'Pablo Agüero', email: null },
    { delegacion: 'DELEGACIÓN V - b - CENTRO SUR', nombre: 'Emanuel Muñoz', email: null },
  ],
};

beforeEach(() => { fetchDelegados.mockReset(); fetchDelegados.mockResolvedValue(RESP); });

describe('MapaScreen', () => {
  test('carga los delegados y los lista', async () => {
    const { findByText, getByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    expect(await findByText('DELEGACIÓN I - NOA')).toBeTruthy();
    expect(getByText('Pablo Agüero')).toBeTruthy();
  });

  test('tocar un marcador del mapa muestra la delegación + delegado', async () => {
    const { findByText, getByLabelText, getAllByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    await findByText('DELEGACIÓN I - NOA'); // lista cargada
    fireEvent.press(getByLabelText('Delegación I')); // marcador del mapa
    // El delegado aparece en la card de detalle (además de en la lista)
    await waitFor(() => expect(getAllByText('María Lourdes Arias Figueroa').length).toBeGreaterThan(1));
  });

  test('el romano se deriva del texto: el marcador V agrupa V-a y V-b', async () => {
    const { findByText, getByLabelText, getAllByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    await findByText('DELEGACIÓN I - NOA');
    fireEvent.press(getByLabelText('Delegación V')); // un solo marcador para las dos sub-delegaciones
    await waitFor(() => expect(getAllByText('Pablo Agüero').length).toBeGreaterThan(1)); // card + lista
    expect(getAllByText('Emanuel Muñoz').length).toBeGreaterThan(1);
  });

  test('el botón "Enviar email" abre el compositor con mailto', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { findByText, getByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    fireEvent.press(await findByText('DELEGACIÓN I - NOA')); // selecciona → aparece la card
    fireEvent.press(getByText('Enviar email'));
    expect(spy).toHaveBeenCalledWith('mailto:lulyaf84@hotmail.com');
    spy.mockRestore();
  });

  test('error de la API muestra el mensaje', async () => {
    fetchDelegados.mockRejectedValue(new Error('net'));
    const { findByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    expect(await findByText(/No se pudieron cargar/)).toBeTruthy();
  });
});
