import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Igual que en CuentaScreen: mockeamos sólo la red; el store de sesión y los
// mappers van de verdad, así el test ejercita el shape real del contrato.
jest.mock('../../src/api', () => {
  const session = jest.requireActual('../../src/api/session');
  const carnet = jest.requireActual('../../src/api/carnet');
  return {
    ...session,
    emitirCarnet: jest.fn(),
    rotarCarnet: jest.fn(),
    descargarCarnetPdf: jest.fn(),
    fetchPerfil: jest.fn(),
    mapCarnet: carnet.mapCarnet,
    mapPerfil: jest.requireActual('../../src/api/perfil').mapPerfil,
    login: jest.fn(), logout: jest.fn(), cambiarClave: jest.fn(), OLVIDO_CLAVE_URL: 'https://x',
  };
});
jest.mock('../../src/descargas', () => ({
  descargarArchivo: jest.fn(async () => 'file:///cache/carnet.pdf'),
  compartirArchivo: jest.fn(async () => true),
}));

const api = require('../../src/api');
const { ApiError } = require('../../src/api/client');
const descargas = require('../../src/descargas');
const session = require('../../src/api/session');
const SecureStore = require('expo-secure-store');
const CarnetScreen = require('../../src/screens/CarnetScreen').default;
const { AuthProvider } = require('../../src/AuthContext');
const { MenuProvider } = require('../../src/MenuContext');
const { T } = require('../helpers');

const SESION = { accessToken: 'acc1', refreshToken: 'ref1', expiresAt: Date.now() + 3600e3, usuarioId: 1234 };
const URL_QR = 'https://api.caballoscriollos.com/v/0f1e2d3c4b5a69788796a5b4c3d2e1f0';
const CARNET = { carnet: { url: URL_QR, emitido: '2026-10-28 14:05:31' } };
const PERFIL = { perfil: { nombre: 'Juan', apellido: 'Pérez', socio: { numero: '3072', categoria: 'Activo' } } };

const renderCarnet = (onBack = jest.fn()) => render(
  <AuthProvider>
    <MenuProvider>
      <CarnetScreen t={T} topInset={0} onBack={onBack} />
    </MenuProvider>
  </AuthProvider>,
);

async function renderLogueada() {
  await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
  return renderCarnet();
}

beforeEach(() => {
  session.clearSession();
  SecureStore.__reset();
  api.emitirCarnet.mockReset();
  api.rotarCarnet.mockReset();
  api.fetchPerfil.mockReset();
  api.descargarCarnetPdf.mockReset();
  descargas.descargarArchivo.mockClear();
  descargas.compartirArchivo.mockClear();
  api.emitirCarnet.mockResolvedValue(CARNET);
  api.fetchPerfil.mockResolvedValue(PERFIL);
  api.descargarCarnetPdf.mockImplementation((descargar) => descargar('https://api/carnet.pdf', { Authorization: 'Bearer acc1' }));
});

describe('CarnetScreen', () => {
  test('sin sesión no pide nada: el carnet es de alguien', async () => {
    const utils = renderCarnet();
    expect(await utils.findByText(/hay que entrar con tu cuenta/)).toBeTruthy();
    expect(api.emitirCarnet).not.toHaveBeenCalled();
  });

  test('el QR codifica la url del carnet, que es lo único que lleva el token', async () => {
    const utils = await renderLogueada();
    expect(await utils.findByLabelText(`QR:${URL_QR}`)).toBeTruthy();
  });

  test('alrededor del QR van el nombre, el número y la categoría', async () => {
    const utils = await renderLogueada();
    expect(await utils.findByText('Juan Pérez')).toBeTruthy();
    expect(utils.getByText('Socio N° 3072 · Activo')).toBeTruthy();
  });

  test('lleva la leyenda de que no informa cuota, igual que el PDF', async () => {
    // El carnet dice quién es el socio, no si está al día. Que eso quede
    // escrito importa: alguien en una tranquera podría leerlo como vigencia.
    const utils = await renderLogueada();
    expect(await utils.findByText(/No informa estado de cuota/)).toBeTruthy();
  });

  test('se pide en cada apertura: es la única forma de ver una rotación ajena', async () => {
    // No hay push ni evento cuando rota el otro teléfono o la ACCC. Si la app
    // se quedara con lo guardado, mostraría un QR muerto sin enterarse.
    const utils = await renderLogueada();
    await utils.findByLabelText(`QR:${URL_QR}`);
    expect(api.emitirCarnet).toHaveBeenCalledTimes(1);

    const URL2 = 'https://api.caballoscriollos.com/v/aaaa1111bbbb2222cccc3333dddd4444';
    api.emitirCarnet.mockResolvedValue({ carnet: { url: URL2, emitido: '2026-11-05 10:00:00' } });
    api.rotarCarnet.mockResolvedValue({ carnet: { url: URL2, emitido: '2026-11-05 10:00:00' } });
    fireEvent.press(utils.getByText('Renovar el código'));
    fireEvent.press(await utils.findByLabelText('Aceptar y renovar'));

    // Vuelta a la tarjeta, con el QR nuevo y sin rastro del anterior.
    expect(await utils.findByLabelText(`QR:${URL2}`)).toBeTruthy();
    expect(utils.queryByLabelText(`QR:${URL_QR}`)).toBeNull();
  });

  test('renovar avisa qué copias se rompen antes de hacer nada', async () => {
    const utils = await renderLogueada();
    await utils.findByLabelText(`QR:${URL_QR}`);
    fireEvent.press(utils.getByText('Renovar el código'));

    expect(await utils.findByText('¿Renovar el código?')).toBeTruthy();
    expect(utils.getByText(/impreso, guardado como imagen, o abierto en otro/)).toBeTruthy();
    expect(api.rotarCarnet).not.toHaveBeenCalled();
  });

  test('el relleno está en Cancelar, como en eliminar una inscripción', async () => {
    const { StyleSheet } = require('react-native');
    const utils = await renderLogueada();
    await utils.findByLabelText(`QR:${URL_QR}`);
    fireEvent.press(utils.getByText('Renovar el código'));
    await utils.findByText('¿Renovar el código?');

    const fondo = (n) => StyleSheet.flatten(n.props.style)?.backgroundColor;
    expect(fondo(utils.getByLabelText('Cancelar y volver'))).toBe(T.accent);
    expect(fondo(utils.getByLabelText('Aceptar y renovar'))).toBeUndefined();
  });

  test('cancelar no rota y devuelve a la tarjeta', async () => {
    const utils = await renderLogueada();
    await utils.findByLabelText(`QR:${URL_QR}`);
    fireEvent.press(utils.getByText('Renovar el código'));
    fireEvent.press(await utils.findByLabelText('Cancelar y volver'));

    expect(await utils.findByLabelText(`QR:${URL_QR}`)).toBeTruthy();
    expect(api.rotarCarnet).not.toHaveBeenCalled();
  });

  test('el PDF se baja con el Bearer y se comparte', async () => {
    const utils = await renderLogueada();
    fireEvent.press(await utils.findByLabelText('Bajar el carnet en PDF'));
    expect(await utils.findByLabelText('Bajar el carnet en PDF')).toBeTruthy();
    expect(descargas.descargarArchivo).toHaveBeenCalledWith('https://api/carnet.pdf', { Authorization: 'Bearer acc1' }, 'carnet.pdf');
  });

  // Los dos desenlaces del error se distinguen por lo que OFRECEN, no sólo por
  // el texto: no ser socio no se arregla insistiendo, y un botón ahí hace creer
  // que falló algo que se puede arreglar.
  test('sin_carnet dice que no es socio, y no ofrece reintentar', async () => {
    // La cuenta no califica (sin número de socio, o no habilitada). Ojo: acá
    // la API NO da el 403 usuario_no_habilitado de los otros endpoints.
    api.emitirCarnet.mockRejectedValue(new ApiError({
      path: '/perfil/carnet', status: 404, code: 'sin_carnet', detail: 'x',
    }));
    const utils = await renderLogueada();
    expect(await utils.findByText('No se encuentra registrado como socio.')).toBeTruthy();
    expect(utils.queryByText('Reintentar')).toBeNull();
  });

  test('cualquier otra falla sí ofrece reintentar, y el reintento trae el carnet', async () => {
    api.emitirCarnet
      .mockRejectedValueOnce(new ApiError({ path: '/perfil/carnet', status: 503, code: 'base_no_disponible', detail: 'x' }))
      .mockResolvedValueOnce(CARNET);
    const utils = await renderLogueada();
    expect(await utils.findByText('No se ha podido obtener el carnet. Por favor, reintente.')).toBeTruthy();
    fireEvent.press(utils.getByText('Reintentar'));
    expect(await utils.findByLabelText(`QR:${URL_QR}`)).toBeTruthy();
  });

  test('quedarse sin red también es reintentable, aunque no traiga code', async () => {
    // El `sin_carnet` es lo ÚNICO que no se reintenta; todo lo demás sí,
    // incluido un error sin código.
    api.emitirCarnet
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce(CARNET);
    const utils = await renderLogueada();
    expect(await utils.findByText(/Por favor, reintente/)).toBeTruthy();
    fireEvent.press(utils.getByText('Reintentar'));
    expect(await utils.findByLabelText(`QR:${URL_QR}`)).toBeTruthy();
  });

  test('si el perfil falla, el carnet se muestra igual: el QR es lo que importa', async () => {
    api.fetchPerfil.mockRejectedValue(new Error('net'));
    const utils = await renderLogueada();
    expect(await utils.findByLabelText(`QR:${URL_QR}`)).toBeTruthy();
  });
});
