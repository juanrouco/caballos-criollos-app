import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { MenuProvider, useMenu } from '../src/MenuContext';
import { MenuLayer } from '../src/SideMenu';
import { AuthProvider } from '../src/AuthContext';
import { T } from './helpers';

// Mockeamos sólo la red del barrel; el store de sesión va de verdad, así el
// drawer se prueba con el AuthProvider real (hidratación incluida).
jest.mock('../src/api', () => {
  const session = jest.requireActual('../src/api/session');
  return {
    ...session,
    login: jest.fn(),
    logout: jest.fn(),
    cambiarClave: jest.fn(),
    fetchPerfil: jest.fn(() => Promise.resolve({ perfil: {} })),
    mapPerfil: jest.requireActual('../src/api/perfil').mapPerfil,
    OLVIDO_CLAVE_URL: 'https://caballoscriollos.com/espanol/expositores_olvidoclave.php',
  };
});

const api = require('../src/api');
const session = require('../src/api/session');
const SecureStore = require('expo-secure-store');

const SESION = { accessToken: 'acc1', refreshToken: 'ref1', expiresAt: Date.now() + 3600e3, usuarioId: 1234 };

beforeEach(() => {
  session.clearSession();
  SecureStore.__reset();
  api.logout.mockReset();
  api.logout.mockImplementation(async () => { session.clearSession(); });
});

// Botón para abrir el menú desde afuera del MenuLayer (simula la hamburguesa).
// Expone `menuOpen` como texto para poder assertir el cierre sin depender de la
// animación de desmontaje del drawer.
function Harness() {
  const { openMenu, menuOpen } = useMenu();
  return (
    <>
      <TouchableOpacity onPress={openMenu}><Text>ABRIR</Text></TouchableOpacity>
      <Text>{menuOpen ? 'MENU_OPEN' : 'MENU_CLOSED'}</Text>
      <MenuLayer t={T} />
    </>
  );
}

const renderMenu = () => render(
  <AuthProvider><MenuProvider><Harness /></MenuProvider></AuthProvider>,
);

describe('MenuLayer / drawer', () => {
  test('cerrado no muestra las secciones', () => {
    const { queryByText } = renderMenu();
    expect(queryByText('Reglamentos')).toBeNull();
    expect(queryByText('Mapa ACCC')).toBeNull();
    expect(queryByText('Mi cuenta')).toBeNull();
    expect(queryByText('Mis inscripciones')).toBeNull();
  });

  test('al abrir el menú lista los accesos a las tabs y las secciones', () => {
    const { getByText, queryByText } = renderMenu();
    fireEvent.press(getByText('ABRIR'));
    // Accesos a las tabs del footer
    expect(getByText('Inicio')).toBeTruthy();
    expect(getByText('Eventos')).toBeTruthy();
    expect(getByText('Pedigree')).toBeTruthy();
    expect(getByText('Rankings')).toBeTruthy();
    // Secciones propias
    expect(getByText('Reglamentos')).toBeTruthy();
    expect(getByText('Mapa ACCC')).toBeTruthy();
    expect(getByText('Mi cuenta')).toBeTruthy();
    expect(getByText('Mis inscripciones')).toBeTruthy();
    // Presencia Institucional quitada por ahora
    expect(queryByText('Presencia Institucional')).toBeNull();
  });

  test('tocar un acceso de navegación cierra el menú', () => {
    const { getByText } = renderMenu();
    fireEvent.press(getByText('ABRIR'));
    expect(getByText('MENU_OPEN')).toBeTruthy();
    fireEvent.press(getByText('Inicio')); // navega a la tab (no-op sin nav) y cierra el menú
    expect(getByText('MENU_CLOSED')).toBeTruthy();
  });

  test('"Mi cuenta" abre la sección con el formulario de login', async () => {
    const { getByText, findByLabelText } = renderMenu();
    fireEvent.press(getByText('ABRIR'));
    fireEvent.press(getByText('Mi cuenta'));
    // openSection espera que cierre el drawer antes de presentar la sección.
    expect(await findByLabelText('Usuario o email')).toBeTruthy();
  });

  test('sin sesión no ofrece cerrar sesión', async () => {
    const { getByText, findByText, queryByText } = renderMenu();
    fireEvent.press(getByText('ABRIR'));
    await findByText('Mi cuenta'); // drawer montado
    expect(queryByText('Cerrar sesión')).toBeNull();
  });

  test('con sesión abierta ofrece cerrar sesión, y al hacerlo cierra el menú', async () => {
    await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
    const { getByText, findByText } = renderMenu();
    fireEvent.press(getByText('ABRIR'));

    fireEvent.press(await findByText('Cerrar sesión'));

    expect(api.logout).toHaveBeenCalled();
    expect(await findByText('MENU_CLOSED')).toBeTruthy();
    expect(session.getSession()).toBeNull();
  });
});
