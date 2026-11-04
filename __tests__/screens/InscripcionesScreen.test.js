import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Igual que en CuentaScreen: mockeamos sólo la red, el store de sesión va de
// verdad y los mappers también, así el test ejercita el shape real del contrato.
jest.mock('../../src/api', () => {
  const session = jest.requireActual('../../src/api/session');
  const insc = jest.requireActual('../../src/api/inscripciones');
  return {
    ...session,
    login: jest.fn(), logout: jest.fn(), cambiarClave: jest.fn(), fetchPerfil: jest.fn(),
    mapPerfil: jest.requireActual('../../src/api/perfil').mapPerfil,
    OLVIDO_CLAVE_URL: 'https://x',
    fetchInscripciones: jest.fn(),
    fetchInscripcion: jest.fn(),
    fetchCertificado: jest.fn(),
    descargarCertificadoPdf: jest.fn(),
    mapListado: insc.mapListado,
    mapInscripcion: insc.mapInscripcion,
    mapCertificado: insc.mapCertificado,
  };
});
jest.mock('../../src/descargas', () => ({
  descargarArchivo: jest.fn(async () => 'file:///cache/certificado-180001.pdf'),
  compartirArchivo: jest.fn(async () => true),
}));

const api = require('../../src/api');
const descargas = require('../../src/descargas');
const session = require('../../src/api/session');
const SecureStore = require('expo-secure-store');
const InscripcionesScreen = require('../../src/screens/InscripcionesScreen').default;
const { AuthProvider } = require('../../src/AuthContext');
const { MenuProvider } = require('../../src/MenuContext');
const { T } = require('../helpers');

const SESION = { accessToken: 'acc1', refreshToken: 'ref1', expiresAt: Date.now() + 3600e3, usuarioId: 1234 };

const INSCRIPCION = {
  id: 180001,
  evento: { id: 1180, nombre: 'Nacional 2025', fecha: '2025-05-10' },
  animal: { id: 'exis:9059010', nombre: 'LA ÑANDÚ', sba: '123456', rp: '45' },
  estado: 1, estado_nombre: 'Definitiva',
  sexo_nombre: 'Hembra', presentacion_nombre: 'Cabestro', condicion_nombre: 'Titular',
  morfologia: null, tipo_aptitud: null,
  pruebas: [{ prueba: { id: 1, nombre: 'Rienda' }, categoria: { id: 12, nombre: 'Mayor' }, lista_espera: false }],
  expositor: 'Juan Pérez', cabania: 'La Ñandú',
};

const LISTADO = {
  abiertas: [
    { evento: { id: 1201, nombre: 'Expo Palermo 2026', inscripcion_hasta: '2026-07-01' },
      inscripciones: [{ ...INSCRIPCION, id: 185901, animal: { ...INSCRIPCION.animal, nombre: 'LA TROPILLA' } }] },
    { evento: { id: 1300, nombre: 'Rural de Córdoba 2026', inscripcion_hasta: '2026-08-01' }, inscripciones: [] },
  ],
  cerradas: [INSCRIPCION],
};

const renderPantalla = (onBack = jest.fn()) => render(
  <AuthProvider>
    <MenuProvider>
      <InscripcionesScreen t={T} topInset={0} onBack={onBack} />
    </MenuProvider>
  </AuthProvider>,
);

async function renderLogueada() {
  await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
  const utils = renderPantalla();
  await utils.findByText('LA TROPILLA');
  return utils;
}

beforeEach(() => {
  session.clearSession();
  SecureStore.__reset();
  api.fetchInscripciones.mockReset();
  api.fetchInscripcion.mockReset();
  api.fetchCertificado.mockReset();
  api.descargarCertificadoPdf.mockReset();
  descargas.descargarArchivo.mockClear();
  descargas.compartirArchivo.mockClear();
  api.fetchInscripciones.mockResolvedValue(LISTADO);
  api.fetchInscripcion.mockResolvedValue({ inscripcion: { ...INSCRIPCION, id: 185901 } });
  api.fetchCertificado.mockResolvedValue({
    certificado: {
      numero: 185901, tipo: 'Definitiva', fecha: '2026-07-14', estado_nombre: 'Aprobada',
      evento: { id: 1201, nombre: 'Expo Palermo 2026' },
      animal: { id: 'exis:1', nombre: 'LA TROPILLA', sba: '9059101', rp: 'M1', nacimiento: '01-03-2015', sexo: 'Hembra', presentacion: 'Cabestro', pelo: 'Gateado' },
      pedigri: { padre: { nombre: 'EL PADRE' }, madre: { nombre: 'LA MADRE' } },
      ubicacion: { provincia: 'Buenos Aires', localidad: 'Luján' },
      pruebas: [],
    },
  });
  api.descargarCertificadoPdf.mockImplementation((id, descargar) =>
    descargar('https://api/x.pdf', { Authorization: 'Bearer acc1' }));
});

describe('InscripcionesScreen', () => {
  test('sin sesión invita a entrar y no pide nada a la API', async () => {
    const { findByText } = renderPantalla();
    expect(await findByText('Ingresar')).toBeTruthy();
    expect(api.fetchInscripciones).not.toHaveBeenCalled();
  });

  test('lista las inscripciones de los eventos abiertos y las anteriores', async () => {
    const { getByText } = await renderLogueada();
    expect(getByText('Inscripciones abiertas')).toBeTruthy();
    expect(getByText('Expo Palermo 2026')).toBeTruthy();
    expect(getByText('Cierra el 01/07/2026')).toBeTruthy();
    expect(getByText('Inscripciones anteriores')).toBeTruthy();
    expect(getByText('LA ÑANDÚ')).toBeTruthy(); // la cerrada
    expect(getByText('Nacional 2025 · 10/05/2025')).toBeTruthy(); // la cerrada lleva su evento
  });

  test('no repite la fecha cuando el nombre del evento ya la trae', async () => {
    // Los nombres de esta base suelen venir con la fecha adentro ("EXPO
    // SALADILLO 16/10/2026"); sumarle el campo fecha la mostraba dos veces.
    api.fetchInscripciones.mockResolvedValue({
      abiertas: [],
      cerradas: [{ ...INSCRIPCION, evento: { id: 9, nombre: 'EXPO SALADILLO 16/10/2026', fecha: '2026-10-16' } }],
    });
    await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
    const { findByText, queryByText } = renderPantalla();
    expect(await findByText('EXPO SALADILLO 16/10/2026')).toBeTruthy();
    expect(queryByText('EXPO SALADILLO 16/10/2026 · 16/10/2026')).toBeNull();
  });

  test('un evento abierto sin inscripciones del socio no se muestra', async () => {
    // La API lo manda igual (como la web), pero con una cuenta sin
    // inscripciones la pantalla quedaba llena de cards vacías y enterraba lo
    // que el socio vino a ver.
    const { queryByText } = await renderLogueada();
    expect(queryByText('Rural de Córdoba 2026')).toBeNull();
  });

  test('si ningún evento abierto tiene inscripciones, lo dice', async () => {
    api.fetchInscripciones.mockResolvedValue({
      abiertas: [{ evento: { id: 1300, nombre: 'Rural de Córdoba 2026' }, inscripciones: [] }],
      cerradas: [INSCRIPCION],
    });
    await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
    const { findByText, queryByText } = renderPantalla();
    expect(await findByText('No hay inscripciones a eventos abiertos')).toBeTruthy();
    expect(queryByText('Rural de Córdoba 2026')).toBeNull();
    // Las anteriores se siguen mostrando.
    expect(await findByText('LA ÑANDÚ')).toBeTruthy();
  });

  test('el botón de inscribir está en el header, no al pie del listado', async () => {
    // Al pie hay que scrollear todas las anteriores para llegar.
    const { getByLabelText } = await renderLogueada();
    expect(getByLabelText('Inscribir un animal')).toBeTruthy();
  });

  test('tocar una inscripción abre su detalle', async () => {
    const { getByText, findByText } = await renderLogueada();
    fireEvent.press(getByText('LA TROPILLA'));
    expect(await findByText('Pruebas')).toBeTruthy();
    expect(api.fetchInscripcion).toHaveBeenCalledWith(185901);
    expect(getByText('Rienda · Mayor')).toBeTruthy();
    expect(getByText('Titular')).toBeTruthy();
  });

  test('morfología sin categoría se muestra como «No participa»', async () => {
    const { getByText, findByText } = await renderLogueada();
    fireEvent.press(getByText('LA TROPILLA'));
    await findByText('Pruebas');
    expect(getByText('No participa')).toBeTruthy();
  });

  test('el detalle lista las yuntas y equipos relacionados', async () => {
    api.fetchInscripcion.mockResolvedValueOnce({
      inscripcion: {
        ...INSCRIPCION, id: 185901,
        unidades_relacionadas: [{
          inscripcion: 185950, animal: { id: 'exis:2', nombre: 'LA COMPAÑERA' },
          expositor: 'Ana Gómez', prueba: { id: 2, nombre: 'Paleteada' },
          categoria: { id: 7, nombre: 'Mayor' }, direccion: 'declarado',
        }],
      },
    });
    const { getByText, findByText } = await renderLogueada();
    fireEvent.press(getByText('LA TROPILLA'));
    expect(await findByText('Yuntas y equipos')).toBeTruthy();
    expect(getByText('LA COMPAÑERA')).toBeTruthy();
    expect(getByText('Paleteada · Mayor · Ana Gómez')).toBeTruthy();
  });

  test('desde el detalle se abre el certificado y se comparte el PDF', async () => {
    const { getByText, findByText } = await renderLogueada();
    fireEvent.press(getByText('LA TROPILLA'));
    fireEvent.press(await findByText('Ver certificado'));

    expect(await findByText('Compartir PDF')).toBeTruthy();
    expect(api.fetchCertificado).toHaveBeenCalledWith(185901);
    expect(getByText('Luján, Buenos Aires')).toBeTruthy();
    expect(getByText('EL PADRE')).toBeTruthy();

    fireEvent.press(getByText('Compartir PDF'));
    await findByText('Compartir PDF'); // vuelve del estado "bajando"
    expect(descargas.descargarArchivo).toHaveBeenCalled();
    expect(descargas.compartirArchivo).toHaveBeenCalledWith(
      'file:///cache/certificado-180001.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );
  });

  test('el certificado lista las pruebas con su jinete y su domador', async () => {
    // El PDF las imprime y el detalle también: la pantalla del certificado era
    // la única que no, aunque la API ya las mandaba.
    api.fetchCertificado.mockResolvedValueOnce({
      certificado: {
        numero: 185901, tipo: 'Definitiva', fecha: '2026-07-14', estado_nombre: 'Definitiva',
        evento: { id: 1201, nombre: 'Expo Palermo 2026' },
        animal: { id: 'exis:1', nombre: 'LA TROPILLA', sba: '9059101' },
        pruebas: [
          { prueba: 'F.Z.B.', categoria: 'A', lista_espera: false, jinete: 'PÉREZ LUIS', domador: 'VELA JUAN' },
          { prueba: 'Freno de Oro', categoria: 'A', lista_espera: true, jinete: 'PÉREZ LUIS', domador: '' },
        ],
      },
    });
    const { getByText, findByText } = await renderLogueada();
    fireEvent.press(getByText('LA TROPILLA'));
    fireEvent.press(await findByText('Ver certificado'));

    expect(await findByText('F.Z.B. · A')).toBeTruthy();
    expect(getByText('Jinete: PÉREZ LUIS · Domador: VELA JUAN')).toBeTruthy();
    expect(getByText('Freno de Oro · A')).toBeTruthy();
    expect(getByText('Jinete: PÉREZ LUIS · Lista de espera')).toBeTruthy();
  });

  test('un animal no inspeccionado lo avisa, con el texto del backend', async () => {
    // `no_inspeccionado` no frena la inscripción (queda Definitiva igual) pero
    // decide si el animal puede correr tercios y semifinales. El PDF lo imprime
    // y la app no lo mostraba en ninguna pantalla.
    const texto = 'Importante: Animal "no inspeccionado", de persistir la irregularidad no podrá participar en tercios y semifinales de las competencias.';
    api.fetchCertificado.mockResolvedValueOnce({
      certificado: {
        numero: 185901, tipo: 'Definitiva', estado_nombre: 'Definitiva',
        evento: { id: 1201, nombre: 'Expo Palermo 2026' },
        animal: { id: 'exis:1', nombre: 'LA TROPILLA', sba: '9059101' },
        pruebas: [{ prueba: 'F.Z.B.', categoria: 'A', lista_espera: false, jinete: 'PÉREZ LUIS', domador: '' }],
        no_inspeccionado: true,
        textos: { no_inspeccionado: texto },
      },
    });
    const { getByText, findByText } = await renderLogueada();
    fireEvent.press(getByText('LA TROPILLA'));
    fireEvent.press(await findByText('Ver certificado'));
    expect(await findByText(texto)).toBeTruthy();
  });

  test('sin aviso de inspección no se muestra nada', async () => {
    const { getByText, findByText, queryByText } = await renderLogueada();
    fireEvent.press(getByText('LA TROPILLA'));
    fireEvent.press(await findByText('Ver certificado'));
    expect(queryByText(/no inspeccionado/)).toBeNull();
  });

  test('si el teléfono no puede compartir, lo dice en vez de fallar en silencio', async () => {
    descargas.compartirArchivo.mockResolvedValueOnce(false);
    const { getByText, findByText } = await renderLogueada();
    fireEvent.press(getByText('LA TROPILLA'));
    fireEvent.press(await findByText('Ver certificado'));
    fireEvent.press(await findByText('Compartir PDF'));
    expect(await findByText('Este teléfono no tiene con qué compartir el archivo.')).toBeTruthy();
  });

  test('si el listado falla, ofrece reintentar y lo vuelve a pedir', async () => {
    api.fetchInscripciones
      .mockRejectedValueOnce(Object.assign(new Error('x'), { detail: 'La base no responde' }))
      .mockResolvedValueOnce(LISTADO);
    await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
    const { findByText, getByText } = renderPantalla();
    expect(await findByText('La base no responde')).toBeTruthy();
    fireEvent.press(getByText('Reintentar'));
    expect(await findByText('LA TROPILLA')).toBeTruthy();
  });

  test('sin ninguna inscripción muestra el aviso y ninguna sección de anteriores', async () => {
    api.fetchInscripciones.mockResolvedValue({ abiertas: [], cerradas: [] });
    await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
    const { findByText, queryByText } = renderPantalla();
    expect(await findByText('No hay inscripciones a eventos abiertos')).toBeTruthy();
    expect(queryByText('Inscripciones anteriores')).toBeNull();
  });
});
