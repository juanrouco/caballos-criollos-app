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
    { delegacion: 'DELEGACIÓN V - b - CENTRO SUR', nombre: 'Emanuel Muñoz', email: 'veterinariomunoz@gmail.com' },
  ],
};

beforeEach(() => { fetchDelegados.mockReset(); fetchDelegados.mockResolvedValue(RESP); });

describe('MapaScreen', () => {
  test('carga los delegados y los lista', async () => {
    const { findByText, getByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    expect(await findByText('DELEGACIÓN I - NOA')).toBeTruthy();
    expect(getByText('Pablo Agüero')).toBeTruthy();
  });

  test('tocar un marcador del mapa selecciona su fila y muestra el email inline', async () => {
    const { findByText, getByLabelText, queryByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    await findByText('DELEGACIÓN I - NOA'); // lista cargada
    expect(queryByText('lulyaf84@hotmail.com')).toBeNull(); // colapsado
    fireEvent.press(getByLabelText('Delegación I')); // marcador del mapa
    expect(await findByText('lulyaf84@hotmail.com')).toBeTruthy(); // email en la fila
  });

  test('el romano se deriva del texto: el marcador V agrupa V-a y V-b', async () => {
    const { findByText, getByLabelText, getByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    await findByText('DELEGACIÓN I - NOA');
    fireEvent.press(getByLabelText('Delegación V')); // un solo marcador para las dos sub-delegaciones
    expect(await findByText('veterinariomunoz@gmail.com')).toBeTruthy(); // V-b (con email)
    expect(getByText('Sin email registrado')).toBeTruthy();             // V-a (sin email)
  });

  test('tocar una fila muestra su email y tocarlo abre el compositor (mailto)', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { findByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    fireEvent.press(await findByText('DELEGACIÓN I - NOA')); // selecciona la fila → aparece el email
    fireEvent.press(await findByText('lulyaf84@hotmail.com'));
    expect(spy).toHaveBeenCalledWith('mailto:lulyaf84@hotmail.com');
    spy.mockRestore();
  });

  test('error de la API muestra el mensaje', async () => {
    fetchDelegados.mockRejectedValue(new Error('net'));
    const { findByText } = render(<MapaScreen t={T} topInset={0} onBack={jest.fn()} />);
    expect(await findByText(/No se pudieron cargar/)).toBeTruthy();
  });
});
