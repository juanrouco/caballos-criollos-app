import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

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
    bajaInscripcion: jest.fn(),
    descargarCertificadoPdf: jest.fn(),
    mapListado: insc.mapListado,
    mapInscripcion: insc.mapInscripcion,
    mapCertificado: insc.mapCertificado,
    mapBaja: insc.mapBaja,
  };
});
jest.mock('../../src/descargas', () => ({
  descargarArchivo: jest.fn(async () => 'file:///cache/certificado-180001.pdf'),
  compartirArchivo: jest.fn(async () => true),
}));

const api = require('../../src/api');
const { ApiError } = require('../../src/api/client');
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
  api.bajaInscripcion.mockReset();
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

  test('un domador con espacios de más sale parejo igual', async () => {
    // Tal cual lo devuelve cdev para una inscripción real: '    JUAN  MANUEL
    // VELA'. Los nombres se cargan a mano y quedan con sangría o con dobles
    // espacios; la web no lo nota porque el HTML los colapsa, y acá se veía
    // «Domador:   JUAN  MANUEL VELA».
    api.fetchCertificado.mockResolvedValueOnce({
      certificado: {
        numero: 190045, tipo: 'Definitiva', fecha: '2026-11-04', estado_nombre: 'Definitiva',
        evento: { id: 9061102, nombre: 'QA CDEV pide Renspa' },
        animal: { id: 'exis:9061001', nombre: 'LA TROPILLA', sba: '9061001' },
        pruebas: [
          { prueba: 'F.Z.B.', categoria: 'A', lista_espera: false,
            jinete: 'QA CDEV Vigente', domador: '    JUAN  MANUEL VELA' },
        ],
      },
    });
    const { getByText, findByText } = await renderLogueada();
    fireEvent.press(getByText('LA TROPILLA'));
    fireEvent.press(await findByText('Ver certificado'));

    expect(await findByText('F.Z.B. · A')).toBeTruthy();
    expect(getByText('Jinete: QA CDEV Vigente · Domador: JUAN MANUEL VELA')).toBeTruthy();
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

// La baja (#150). Es la única operación de la app que destruye algo y que el
// socio no puede deshacer solo, así que lo que se prueba es sobre todo lo que
// ve ANTES de confirmar y qué pasa cuando el servidor lo contradice.
describe('InscripcionesScreen — eliminar una inscripción', () => {
  const CON_BAJA = { ...INSCRIPCION, id: 185901, puede_baja: true };

  const abrirDetalle = async () => {
    const utils = await renderLogueada();
    fireEvent.press(utils.getByText('LA TROPILLA'));
    await utils.findByText('Ver certificado');
    return utils;
  };

  test('si la cuenta dejó de estar habilitada, el listado lo dice en criollo', async () => {
    // El access vale 60 minutos sin tocar la base, así que esto le puede pasar
    // a alguien que entró bien hace un rato y no cambió nada.
    api.fetchInscripciones.mockRejectedValue(new ApiError({
      path: '/inscripciones', status: 403, code: 'usuario_no_habilitado',
      detail: 'El usuario no está habilitado',
    }));
    await SecureStore.setItemAsync('auth.sesion', JSON.stringify(SESION));
    const utils = renderPantalla();
    expect(await utils.findByText(/Consultá con la Asociación/)).toBeTruthy();
    expect(utils.queryByText('El usuario no está habilitado')).toBeNull();
  });

  test('sin puede_baja no se ofrece eliminar', async () => {
    // El predicado es del servidor: si dice que no, el botón no está. Así el
    // socio no llega nunca a un 422 que no podía prever.
    api.fetchInscripcion.mockResolvedValue({ inscripcion: { ...INSCRIPCION, id: 185901, puede_baja: false } });
    const utils = await abrirDetalle();
    expect(utils.queryByText('Eliminar inscripción')).toBeNull();
  });

  test('con puede_baja hay botón, y no elimina al primer toque', async () => {
    api.fetchInscripcion.mockResolvedValue({ inscripcion: CON_BAJA });
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));

    expect(await utils.findByText('¿Eliminar esta inscripción?')).toBeTruthy();
    expect(api.bajaInscripcion).not.toHaveBeenCalled();
    // Y se puede volver sin consecuencias.
    fireEvent.press(utils.getByText('Cancelar'));
    expect(await utils.findByText('Ver certificado')).toBeTruthy();
    expect(api.bajaInscripcion).not.toHaveBeenCalled();
  });

  test('la confirmación avisa que la baja gasta la habilitación de rehacer', async () => {
    // Con el plazo cerrado, `puede_baja` viene de `puede_rehacer`, y esa
    // habilitación es de un solo uso: el socio tiene que saberlo antes.
    api.fetchInscripcion.mockResolvedValue({
      inscripcion: { ...CON_BAJA, puede_rehacer: true },
    });
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));
    expect(await utils.findByText(/usa la habilitación/)).toBeTruthy();
  });

  test('la confirmación lista las yuntas y equipos que quedan sin el animal', async () => {
    api.fetchInscripcion.mockResolvedValue({
      inscripcion: {
        ...CON_BAJA,
        unidades_relacionadas: [
          { inscripcion: 185902, animal: { id: 'exis:2', nombre: 'LA COMPAÑERA' },
            prueba: { id: 2, nombre: 'Paleteada' }, categoria: { id: 7, nombre: 'Mayor' },
            expositor: 'Ana Gómez', direccion: 'declarante' },
        ],
      },
    });
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));

    expect(await utils.findByText('Queda sin este animal')).toBeTruthy();
    expect(utils.getByText('LA COMPAÑERA')).toBeTruthy();
    expect(utils.getByText('Paleteada · Mayor · Ana Gómez')).toBeTruthy();
  });

  test('confirmada, llama al DELETE y el detalle deja de mostrarse', async () => {
    api.fetchInscripcion.mockResolvedValue({ inscripcion: CON_BAJA });
    api.bajaInscripcion.mockResolvedValue({
      inscripcion: { id: 185901, estado: 0 }, rehacer: false, unidades_relacionadas: [],
    });
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));
    fireEvent.press(await utils.findByLabelText('Aceptar que se elimina'));

    expect(await utils.findByText('Inscripción eliminada')).toBeTruthy();
    expect(api.bajaInscripcion).toHaveBeenCalledWith(185901);
    // Los datos de la inscripción no siguen a la vista como si nada.
    expect(utils.queryByText('Ver certificado')).toBeNull();
  });

  test('con rehacer dice que ya puede volver a inscribir, y qué quedó roto', async () => {
    api.fetchInscripcion.mockResolvedValue({ inscripcion: CON_BAJA });
    api.bajaInscripcion.mockResolvedValue({
      inscripcion: { id: 185901, estado: 0 },
      rehacer: true,
      unidades_relacionadas: [
        { inscripcion: 185902, animal: { id: 'exis:2', nombre: 'LA COMPAÑERA' },
          prueba: { id: 2, nombre: 'Paleteada' }, categoria: { id: 7, nombre: 'Mayor' },
          expositor: 'Ana Gómez', direccion: 'declarante' },
      ],
    });
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));
    fireEvent.press(await utils.findByLabelText('Aceptar que se elimina'));

    expect(await utils.findByText(/volver a inscribir este animal/)).toBeTruthy();
    expect(utils.getByText('Quedaron sin este animal')).toBeTruthy();
    expect(utils.getByText('LA COMPAÑERA')).toBeTruthy();
  });

  test('al volver del resultado, el listado se vuelve a pedir', async () => {
    // La inscripción dada de baja ya no va en el listado: si no se recarga, el
    // socio la sigue viendo y cree que la baja no funcionó.
    api.fetchInscripcion.mockResolvedValue({ inscripcion: CON_BAJA });
    api.bajaInscripcion.mockResolvedValue({ inscripcion: { id: 185901, estado: 0 }, rehacer: false });
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));
    fireEvent.press(await utils.findByLabelText('Aceptar que se elimina'));
    await utils.findByText('Inscripción eliminada');

    api.fetchInscripciones.mockClear();
    fireEvent.press(utils.getByText('Volver a mis inscripciones'));
    expect(await utils.findByText('LA TROPILLA')).toBeTruthy();
    expect(api.fetchInscripciones).toHaveBeenCalled();
  });

  test('el 422 explica el motivo y la inscripción sigue ahí', async () => {
    // El plazo se cerró entre que se pintó la pantalla y el socio apretó: el
    // texto sale del `motivo`, no del mensaje del backend.
    api.fetchInscripcion.mockResolvedValue({ inscripcion: CON_BAJA });
    api.bajaInscripcion.mockRejectedValue(new ApiError({
      path: '/inscripciones/185901', status: 422, code: 'baja_no_permitida',
      motivo: 'con_resultados', detail: 'La inscripción tiene resultados',
    }));
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));
    fireEvent.press(await utils.findByLabelText('Aceptar que se elimina'));

    expect(await utils.findByText(/resultados cargados/)).toBeTruthy();
    expect(utils.queryByText('Inscripción eliminada')).toBeNull();
    // Y sigue en la confirmación, de donde puede volver al detalle.
    expect(utils.getByText('Cancelar')).toBeTruthy();
  });

  test('el 409 de carrera perdida no se cuenta como que falló', async () => {
    api.fetchInscripcion.mockResolvedValue({ inscripcion: CON_BAJA });
    api.bajaInscripcion.mockRejectedValue(new ApiError({
      path: '/inscripciones/185901', status: 409, code: 'estado_no_permite_baja',
      detail: 'La inscripción no está activa',
    }));
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));
    fireEvent.press(await utils.findByLabelText('Aceptar que se elimina'));
    expect(await utils.findByText(/ya no está activa/)).toBeTruthy();
  });

  test('el header acompaña: título y flecha cambian en cada pantalla', async () => {
    // El header es del componente padre y la confirmación es un sub-estado del
    // detalle, así que sin avisarle el título seguía diciendo «Inscripción»
    // mientras se preguntaba si eliminar, y la flecha saltaba al listado
    // salteándose el detalle.
    api.fetchInscripcion.mockResolvedValue({ inscripcion: CON_BAJA });
    const utils = await abrirDetalle();
    expect(utils.getByText('Inscripción')).toBeTruthy();

    fireEvent.press(utils.getByText('Eliminar inscripción'));
    expect(await utils.findByText('Eliminar inscripción')).toBeTruthy();
    expect(utils.queryByText('Inscripción')).toBeNull();

    // Y la flecha de arriba vuelve al detalle, no al listado.
    fireEvent.press(utils.getByLabelText('Volver'));
    expect(await utils.findByText('Ver certificado')).toBeTruthy();
    expect(utils.getByText('Inscripción')).toBeTruthy();
  });

  test('el header del resultado dice que quedó eliminada y cierra al listado', async () => {
    api.fetchInscripcion.mockResolvedValue({ inscripcion: CON_BAJA });
    api.bajaInscripcion.mockResolvedValue({ inscripcion: { id: 185901, estado: 0 }, rehacer: false });
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));
    fireEvent.press(await utils.findByLabelText('Aceptar que se elimina'));
    await utils.findByText('Volver a mis inscripciones');

    // Desde el resultado no se vuelve al detalle: esa inscripción ya no está.
    api.fetchInscripciones.mockClear();
    fireEvent.press(utils.getByLabelText('Volver'));
    expect(await utils.findByText('LA TROPILLA')).toBeTruthy();
    expect(api.fetchInscripciones).toHaveBeenCalled();
  });

  test('el botón con relleno es Cancelar, no Aceptar', async () => {
    // Eliminar no se deshace desde la app. Lo que tiene que ser fácil de
    // apretar sin mirar es la salida, así que el relleno va ahí y Aceptar
    // queda en rojo y sin fondo.
    api.fetchInscripcion.mockResolvedValue({ inscripcion: CON_BAJA });
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));
    await utils.findByText('¿Eliminar esta inscripción?');

    const fondo = (nodo) => StyleSheet.flatten(nodo.props.style)?.backgroundColor;
    expect(fondo(utils.getByLabelText('Cancelar y volver'))).toBe(T.accent);
    expect(fondo(utils.getByLabelText('Aceptar que se elimina'))).toBeUndefined();
  });

  test('el 403 del usuario que opera sólo por la web se dice tal cual', async () => {
    api.fetchInscripcion.mockResolvedValue({ inscripcion: CON_BAJA });
    api.bajaInscripcion.mockRejectedValue(new ApiError({
      path: '/inscripciones/185901', status: 403, code: 'usuario_solo_web', detail: 'x',
    }));
    const utils = await abrirDetalle();
    fireEvent.press(utils.getByText('Eliminar inscripción'));
    fireEvent.press(await utils.findByLabelText('Aceptar que se elimina'));
    expect(await utils.findByText(/sólo desde caballoscriollos\.com/)).toBeTruthy();
  });
});
