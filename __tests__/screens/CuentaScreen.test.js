import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

// Mockeamos sólo la parte de red del barrel: el store de sesión va de verdad,
// así el test ejercita el AuthProvider completo (hidratación, persistencia y
// re-render) con la API simulada.
jest.mock('../../src/api', () => {
  const session = jest.requireActual('../../src/api/session');
  return {
    ...session,
    login: jest.fn(),
    logout: jest.fn(),
    cambiarClave: jest.fn(),
    fetchPerfil: jest.fn(),
    mapPerfil: jest.requireActual('../../src/api/perfil').mapPerfil,
    OLVIDO_CLAVE_URL: 'https://caballoscriollos.com/espanol/expositores_olvidoclave.php',
  };
});

const api = require('../../src/api');
const session = require('../../src/api/session');
const SecureStore = require('expo-secure-store');
const { ApiError } = require('../../src/api/client');
const CuentaScreen = require('../../src/screens/CuentaScreen').default;
const { AuthProvider } = require('../../src/AuthContext');
const { T } = require('../helpers');

const SESION = { accessToken: 'acc1', refreshToken: 'ref1', expiresAt: Date.now() + 3600e3, usuarioId: 1234 };

const PERFIL = {
  perfil: {
    id: 1234,
    nombre: 'Juan', apellido: 'Pérez',
    email: 'socio@ejemplo.com',
    telefono: { cod_pais: '54', cod_area: '11', numero: '45551234' },
    celular: null,
    socio: { numero: '3072', categoria: 'Activo', nombre_padron: 'PÉREZ JUAN' },
  },
};

const apiError = (status, detail, code) => new ApiError({ path: '/auth/login', status, detail, code });

const renderCuenta = (onBack = jest.fn()) => render(
  <AuthProvider>
    <CuentaScreen t={T} topInset={0} onBack={onBack} />
  </AuthProvider>,
);

// Deja la pantalla con sesión abierta y el perfil ya cargado.
async function renderLogueada() {
  await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
  const utils = renderCuenta();
  await utils.findByText('Juan Pérez');
  return utils;
}

beforeEach(() => {
  session.clearSession();
  SecureStore.__reset();
  api.login.mockReset();
  api.logout.mockReset();
  api.cambiarClave.mockReset();
  api.fetchPerfil.mockReset();
  api.login.mockImplementation(async () => { session.setSession(SESION); });
  api.logout.mockImplementation(async () => { session.clearSession(); });
  api.cambiarClave.mockImplementation(async () => { session.setSession({ ...SESION, accessToken: 'acc3' }); });
  api.fetchPerfil.mockResolvedValue(PERFIL);
});

describe('CuentaScreen — login', () => {
  test('sin sesión guardada muestra el formulario', async () => {
    const { findByLabelText, getByText } = renderCuenta();
    expect(await findByLabelText('Usuario o email')).toBeTruthy();
    expect(getByText('Ingresar')).toBeTruthy();
  });

  test('ingresa con usuario y clave, y pasa a mostrar el perfil', async () => {
    const { findByLabelText, getByLabelText, getByText, findByText } = renderCuenta();
    fireEvent.changeText(await findByLabelText('Usuario o email'), 'socio@ejemplo.com');
    fireEvent.changeText(getByLabelText('Clave'), 'su clave');
    fireEvent.press(getByText('Ingresar'));

    expect(api.login).toHaveBeenCalledWith('socio@ejemplo.com', 'su clave');
    expect(await findByText('Juan Pérez')).toBeTruthy();
    expect(getByText('Socio N° 3072')).toBeTruthy();
    expect(getByText('socio@ejemplo.com')).toBeTruthy();
    expect(getByText('+54 (11) 45551234')).toBeTruthy();
  });

  test('no manda nada con los campos vacíos', async () => {
    const { findByText, getByText } = renderCuenta();
    fireEvent.press(await findByText('Ingresar'));
    expect(api.login).not.toHaveBeenCalled();
    expect(getByText('Ingresar')).toBeTruthy();
  });

  test('401: un solo mensaje, sin decir si falló el usuario o la clave', async () => {
    api.login.mockRejectedValueOnce(apiError(401, 'No autenticado'));
    const { findByLabelText, getByLabelText, getByText, findByText } = renderCuenta();
    fireEvent.changeText(await findByLabelText('Usuario o email'), 'socio');
    fireEvent.changeText(getByLabelText('Clave'), 'mala');
    fireEvent.press(getByText('Ingresar'));
    expect(await findByText('Usuario o clave incorrectos')).toBeTruthy();
  });

  test('403 email_no_verificado: cartel propio con el texto de la API', async () => {
    const detalle = 'Tenés que verificar tu email antes de entrar a la app';
    api.login.mockRejectedValueOnce(apiError(403, detalle, 'email_no_verificado'));
    const { findByLabelText, getByLabelText, getByText, findByText } = renderCuenta();
    fireEvent.changeText(await findByLabelText('Usuario o email'), 'socio');
    fireEvent.changeText(getByLabelText('Clave'), 'buena');
    fireEvent.press(getByText('Ingresar'));
    expect(await findByText('Verificá tu email')).toBeTruthy();
    expect(getByText(detalle)).toBeTruthy();
  });

  test('403 cuenta_pendiente y 409 cuenta_duplicada tienen su propio cartel', async () => {
    api.login
      .mockRejectedValueOnce(apiError(403, 'Tu cuenta está pendiente de aprobación por la Asociación', 'cuenta_pendiente'))
      .mockRejectedValueOnce(apiError(409, 'Cuenta duplicada: contactá a la asociación', 'cuenta_duplicada'));

    const { findByLabelText, getByLabelText, getByText, findByText } = renderCuenta();
    fireEvent.changeText(await findByLabelText('Usuario o email'), 'socio');
    fireEvent.changeText(getByLabelText('Clave'), 'buena');
    fireEvent.press(getByText('Ingresar'));
    expect(await findByText('Cuenta pendiente de aprobación')).toBeTruthy();

    // Reintento: el error anterior se limpia al escribir de nuevo.
    fireEvent.changeText(getByLabelText('Clave'), 'buena2');
    fireEvent.press(getByText('Ingresar'));
    expect(await findByText('Cuenta duplicada')).toBeTruthy();
  });

  test('sin conexión muestra el mensaje de red tal cual', async () => {
    api.login.mockRejectedValueOnce(new Error('Sin conexión. Revisá tu internet e intentá de nuevo.'));
    const { findByLabelText, getByLabelText, getByText, findByText } = renderCuenta();
    fireEvent.changeText(await findByLabelText('Usuario o email'), 'socio');
    fireEvent.changeText(getByLabelText('Clave'), 'x');
    fireEvent.press(getByText('Ingresar'));
    expect(await findByText(/Sin conexión/)).toBeTruthy();
  });

  test('"¿Olvidaste tu clave?" abre la página del sitio (el recupero no pasa por la API)', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { findByText } = renderCuenta();
    fireEvent.press(await findByText('¿Olvidaste tu clave?'));
    expect(spy).toHaveBeenCalledWith('https://caballoscriollos.com/espanol/expositores_olvidoclave.php');
    spy.mockRestore();
  });
});

describe('CuentaScreen — perfil', () => {
  test('con la sesión guardada arranca logueada y pide el perfil', async () => {
    await renderLogueada();
    expect(api.fetchPerfil).toHaveBeenCalled();
    expect(api.login).not.toHaveBeenCalled();
  });

  test('rotula la categoría como categoría, no como vigencia', async () => {
    const { getByText } = await renderLogueada();
    // "Activo" es la CATEGORÍA del socio, no quiere decir "al día": el contrato
    // de la API pide que se muestre rotulada así.
    expect(getByText('Categoría')).toBeTruthy();
    expect(getByText('Activo')).toBeTruthy();
  });

  test('los datos vacíos se muestran con un guión', async () => {
    const { getAllByText } = await renderLogueada();
    expect(getAllByText('—').length).toBeGreaterThan(0); // celular viene null
  });

  test('si el perfil falla, ofrece reintentar', async () => {
    api.fetchPerfil
      .mockRejectedValueOnce(new ApiError({ path: '/perfil', status: 503, detail: 'La base no responde' }))
      .mockResolvedValueOnce(PERFIL);
    await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
    const { findByText, getByText } = renderCuenta();
    expect(await findByText('La base no responde')).toBeTruthy();
    fireEvent.press(getByText('Reintentar'));
    expect(await findByText('Juan Pérez')).toBeTruthy();
  });

  test('no ofrece cerrar sesión: esa acción vive en el menú lateral', async () => {
    const { queryByText } = await renderLogueada();
    expect(queryByText('Cerrar sesión')).toBeNull();
  });
});

describe('CuentaScreen — cambio de clave', () => {
  async function abrirClave() {
    const utils = await renderLogueada();
    fireEvent.press(utils.getByText('Cambiar clave'));
    await utils.findByLabelText('Clave actual');
    return utils;
  }

  test('valida que las dos claves nuevas coincidan antes de salir a la red', async () => {
    const { getByLabelText, getByText, findByText } = await abrirClave();
    fireEvent.changeText(getByLabelText('Clave actual'), 'la de hoy');
    fireEvent.changeText(getByLabelText('Clave nueva'), 'Nueva-Clave-1');
    fireEvent.changeText(getByLabelText('Repetir clave nueva'), 'Nueva-Clave-2');
    fireEvent.press(getByText('Guardar clave nueva'));
    expect(await findByText('Las dos claves nuevas no coinciden')).toBeTruthy();
    expect(api.cambiarClave).not.toHaveBeenCalled();
  });

  test('rechaza una clave de menos de 6 caracteres sin ir al servidor', async () => {
    const { getByLabelText, getByText, findByText } = await abrirClave();
    fireEvent.changeText(getByLabelText('Clave actual'), 'la de hoy');
    fireEvent.changeText(getByLabelText('Clave nueva'), 'corta');
    fireEvent.changeText(getByLabelText('Repetir clave nueva'), 'corta');
    fireEvent.press(getByText('Guardar clave nueva'));
    expect(await findByText(/al menos 6 caracteres/)).toBeTruthy();
    expect(api.cambiarClave).not.toHaveBeenCalled();
  });

  test('con todo bien la guarda y vuelve al perfil con la confirmación', async () => {
    const { getByLabelText, getByText, findByText } = await abrirClave();
    fireEvent.changeText(getByLabelText('Clave actual'), 'la de hoy');
    fireEvent.changeText(getByLabelText('Clave nueva'), 'Nueva-Clave-1');
    fireEvent.changeText(getByLabelText('Repetir clave nueva'), 'Nueva-Clave-1');
    fireEvent.press(getByText('Guardar clave nueva'));

    expect(api.cambiarClave).toHaveBeenCalledWith('la de hoy', 'Nueva-Clave-1');
    expect(await findByText('Tu clave fue cambiada')).toBeTruthy();
    // Dos relojes distintos: el flash es un prop y se pinta en el mismo render
    // de la vuelta, pero PerfilView estuvo desmontada mientras se cambiaba la
    // clave y al remontar vuelve a pedir el perfil. Con un `getByText` acá el
    // test pasaba sólo si ese fetch alcanzaba a resolver en el mismo tick, y
    // con la suite entera a veces no llegaba.
    expect(await findByText('Juan Pérez')).toBeTruthy();
  });

  test('clave_actual_incorrecta se muestra sin cerrar la sesión', async () => {
    api.cambiarClave.mockRejectedValueOnce(apiError(403, 'La clave actual no es correcta', 'clave_actual_incorrecta'));
    const { getByLabelText, getByText, findByText } = await abrirClave();
    fireEvent.changeText(getByLabelText('Clave actual'), 'mal');
    fireEvent.changeText(getByLabelText('Clave nueva'), 'Nueva-Clave-1');
    fireEvent.changeText(getByLabelText('Repetir clave nueva'), 'Nueva-Clave-1');
    fireEvent.press(getByText('Guardar clave nueva'));

    expect(await findByText('La clave actual no es correcta')).toBeTruthy();
    expect(session.getSession()).not.toBeNull();
  });

  test('clave_invalida (400): se muestra la regla que devolvió el servidor', async () => {
    api.cambiarClave.mockRejectedValueOnce(apiError(400, 'La clave no puede tener emojis', 'clave_invalida'));
    const { getByLabelText, getByText, findByText } = await abrirClave();
    fireEvent.changeText(getByLabelText('Clave actual'), 'la de hoy');
    fireEvent.changeText(getByLabelText('Clave nueva'), 'Nueva-Clave-1');
    fireEvent.changeText(getByLabelText('Repetir clave nueva'), 'Nueva-Clave-1');
    fireEvent.press(getByText('Guardar clave nueva'));
    expect(await findByText('La clave no puede tener emojis')).toBeTruthy();
  });

  test('clave_cambiada (409): cierra la sesión y vuelve al login con el aviso', async () => {
    api.cambiarClave.mockRejectedValueOnce(apiError(409, 'La clave cambió en otro lado: volvé a entrar', 'clave_cambiada'));
    const { getByLabelText, getByText, findByText, findByLabelText } = await abrirClave();
    fireEvent.changeText(getByLabelText('Clave actual'), 'la de hoy');
    fireEvent.changeText(getByLabelText('Clave nueva'), 'Nueva-Clave-1');
    fireEvent.changeText(getByLabelText('Repetir clave nueva'), 'Nueva-Clave-1');
    fireEvent.press(getByText('Guardar clave nueva'));

    expect(await findByLabelText('Usuario o email')).toBeTruthy();
    expect(await findByText('La clave cambió en otro lado: volvé a entrar')).toBeTruthy();
    expect(api.logout).toHaveBeenCalled();
  });

  test('volver desde el cambio de clave no cierra la sección', async () => {
    const onBack = jest.fn();
    await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
    const { findByText, getByText, getByLabelText, findByLabelText } = renderCuenta(onBack);
    await findByText('Juan Pérez');
    fireEvent.press(getByText('Cambiar clave'));
    await findByLabelText('Clave actual');
    fireEvent.press(getByLabelText('Volver'));
    expect(await findByText('Juan Pérez')).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
  });
});
