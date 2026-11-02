import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

jest.mock('../../src/api', () => {
  const alta = jest.requireActual('../../src/api/alta');
  return {
    fetchEventosAlta: jest.fn(),
    buscarAnimalesAlta: jest.fn(),
    fetchOpcionesAlta: jest.fn(),
    buscarJinetes: jest.fn(),
    buscarDomadores: jest.fn(),
    crearInscripcion: jest.fn(),
    fetchAnimalPedigree: jest.fn(),
    fetchAlertasAlta: jest.fn(),
    fetchCabanias: jest.fn(),
    mapAlertas: alta.mapAlertas,
    mapEventoAlta: alta.mapEventoAlta,
    mapAnimalAlta: alta.mapAnimalAlta,
    mapOpciones: alta.mapOpciones,
    mapJinete: alta.mapJinete,
    mapAltaCreada: alta.mapAltaCreada,
    animalAPayload: alta.animalAPayload,
  };
});

const api = require('../../src/api');
const { ApiError } = require('../../src/api/client');
const AltaInscripcionScreen = require('../../src/screens/AltaInscripcionScreen').default;
const { T } = require('../helpers');

const EVENTO = {
  id: 9059001, nombre: 'Expo Palermo 2026', inscripcion_hasta: '2026-07-01',
  evento_desde: '2026-07-20', por_rehacer: false, pide_renspa: false, alertas: [],
};
const ANIMAL = { id: 'exis:9059010', nombre: 'LA ÑANDÚ', sba: '123456', rp: '45', sexo: 2, ya_inscripto: false };
const OPCIONES = {
  morfologia: { categoria: { id: 12, nombre: 'Potrancas' }, habilitada: true },
  tipo_aptitud: { categoria: null, habilitada: false },
  pruebas: [
    { prueba: { id: 1, nombre: 'Rienda' }, modalidad: 'individual',
      categorias: [{ id: 12, nombre: 'Mayor', habilitada: true, cupo: 30, ocupacion: 12, lista_espera: false }] },
    { prueba: { id: 2, nombre: 'Paleteada' }, modalidad: 'yunta',
      categorias: [{ id: 7, nombre: 'Mayor', habilitada: true, cupo: 20, ocupacion: 1, lista_espera: false }] },
  ],
};

const renderAlta = (onSalir = jest.fn(), onHecho = jest.fn()) =>
  render(<AltaInscripcionScreen t={T} topInset={0} onSalir={onSalir} onHecho={onHecho} />);

// Lleva el asistente hasta la pantalla de participación.
async function hastaParticipacion(utils) {
  fireEvent.press(await utils.findByText('Expo Palermo 2026'));
  fireEvent.changeText(await utils.findByLabelText('S.B.A.'), '123456');
  fireEvent.press(utils.getByText('Hembra'));
  fireEvent.press(utils.getByText('Buscar'));
  fireEvent.press(await utils.findByText('LA ÑANDÚ'));
  fireEvent.press(await utils.findByText('Cabestro'));
  fireEvent.press(utils.getByText('Continuar'));
  fireEvent.press(await utils.findByLabelText('Cabaña'));
  fireEvent.press(await utils.findByText('LA ESTANCIA'));
  fireEvent.changeText(utils.getByLabelText('Provincia'), 'Córdoba');
  fireEvent.changeText(utils.getByLabelText('Localidad'), 'Jesús María');
  fireEvent.press(utils.getByText('Continuar'));
  await utils.findByText('Pruebas');
}

// Elige un jinete desde el selector indicado. El jinete es obligatorio, así que
// casi todos los flujos que siguen de participación pasan por acá.
async function ponerJinete(utils, etiqueta = 'Elegir jinete') {
  fireEvent.press(await utils.findByText(etiqueta));
  await utils.findByLabelText('Apellido');
  fireEvent.changeText(utils.getByLabelText('Apellido'), 'Gómez');
  fireEvent.press(utils.getByText('Buscar'));
  fireEvent.press(await utils.findByText('Gómez Ana'));
  return utils.findByText('Pruebas');
}

beforeEach(() => {
  api.fetchEventosAlta.mockReset().mockResolvedValue([EVENTO]);
  api.buscarAnimalesAlta.mockReset().mockResolvedValue([ANIMAL]);
  api.fetchOpcionesAlta.mockReset().mockResolvedValue(OPCIONES);
  api.buscarJinetes.mockReset().mockResolvedValue([
    { id: 7, nombre: 'Ana', apellido: 'Gómez', documento: '1', tiene_deuda: false },
  ]);
  api.buscarDomadores.mockReset().mockResolvedValue([]);
  // Sin alertas: el asistente saltea esa pantalla y arranca en el evento.
  api.fetchAlertasAlta.mockReset().mockResolvedValue({ terminos: null, alertas: [] });
  api.fetchCabanias.mockReset().mockResolvedValue(['LA ESTANCIA', 'LA SOÑADA']);
  api.fetchAnimalPedigree.mockReset().mockResolvedValue({
    animal: {
      nombre: 'LA ÑANDÚ',
      propietario: { numero: 221, nombre: 'LA ENTABLADA S.A.' },
      criador: { numero: 221, nombre: 'LA ENTABLADA S.A.' },
    },
  });
  api.crearInscripcion.mockReset().mockResolvedValue({
    inscripcion: { id: 185901, estado: 1, estado_nombre: 'Definitiva', precio: 2151, pruebas: [] },
  });
});

describe('AltaInscripcionScreen — paso a paso', () => {
  test('arranca listando los eventos con inscripción abierta', async () => {
    const { findByText, getByText } = renderAlta();
    expect(await findByText('Expo Palermo 2026')).toBeTruthy();
    expect(getByText('Cierra el 01/07/2026')).toBeTruthy();
  });

  test('sin eventos abiertos lo dice en vez de mostrar una lista vacía', async () => {
    api.fetchEventosAlta.mockResolvedValue([]);
    const { findByText } = renderAlta();
    expect(await findByText(/No hay eventos con la inscripción abierta/)).toBeTruthy();
  });

  test('después de elegir el evento muestra sus condiciones', async () => {
    // Es expositores_alerta2.php: tarifas, cierre, reglas del evento.
    api.fetchEventosAlta.mockResolvedValue([{
      ...EVENTO,
      alerta2: '<p>TARIFAS: las inscripciones se abonan en el evento</p>',
      alerta3: null,
    }]);
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    expect(await utils.findByText('Condiciones del evento')).toBeTruthy();
    // Todavía no se busca animal.
    expect(utils.queryByLabelText('S.B.A.')).toBeNull();
    fireEvent.press(utils.getByLabelText('Aceptar condiciones'));
    expect(await utils.findByLabelText('S.B.A.')).toBeTruthy();
  });

  test('el aviso del evento avanza con un solo Aceptar', async () => {
    // Antes el aviso iba como popup encima de la página y hacían falta dos
    // clicks: uno para cerrarlo y otro para avanzar.
    api.fetchEventosAlta.mockResolvedValue([{
      ...EVENTO, alerta2: null, alerta3: null,
      alertas: [{ titulo: 'Condiciones 2026', texto: '<p>Tarifas y cierre</p>' }],
    }]);
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    expect(await utils.findByText('Condiciones 2026')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Aceptar condiciones'));
    expect(await utils.findByLabelText('S.B.A.')).toBeTruthy();
  });

  test('una condición con HTML vacío no gasta una pantalla', async () => {
    api.fetchEventosAlta.mockResolvedValue([{
      ...EVENTO, alerta2: '<p>Tarifas</p>', alerta3: '<p>&nbsp;</p>',
    }]);
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    fireEvent.press(await utils.findByLabelText('Aceptar condiciones'));
    // alerta3 no existe a efectos prácticos: pasa derecho al animal.
    expect(await utils.findByLabelText('S.B.A.')).toBeTruthy();
  });

  test('el aviso repetido en alerta2 no se muestra dos veces', async () => {
    // El evento suele traer el mismo texto en su aviso y en alerta2. Dos
    // páginas idénticas parecen un botón que no responde.
    api.fetchEventosAlta.mockResolvedValue([{
      ...EVENTO,
      alertas: [{ titulo: 'Condiciones', texto: '<p>ART. 42 - TODOS LOS REPRODUCTORES</p>' }],
      alerta2: '<p>ART. 42 - TODOS LOS  REPRODUCTORES</p>',
      alerta3: null,
    }]);
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    await utils.findByText('Condiciones');
    // Una sola página: no hay contador y un Aceptar pasa al animal.
    expect(utils.queryByText('1 de 2')).toBeNull();
    fireEvent.press(utils.getByLabelText('Aceptar condiciones'));
    expect(await utils.findByLabelText('S.B.A.')).toBeTruthy();
  });

  test('alerta3 no sale con las condiciones del evento', async () => {
    // En la web, alerta3 es la pantalla previa a paso7 (la que confirma), no un
    // aviso del evento: va en el paso de confirmar.
    api.fetchEventosAlta.mockResolvedValue([{
      ...EVENTO, alerta2: '<p>Condiciones</p>', alerta3: '<p>Declaración final</p>',
    }]);
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    await utils.findByText('Condiciones del evento');
    // Una sola página de condiciones: alerta3 no está acá.
    expect(utils.queryByText('1 de 2')).toBeNull();
    fireEvent.press(utils.getByLabelText('Aceptar condiciones'));
    expect(await utils.findByLabelText('S.B.A.')).toBeTruthy();
  });

  test('dos avisos distintos del evento sí son dos páginas', async () => {
    api.fetchEventosAlta.mockResolvedValue([{
      ...EVENTO, alerta2: '<p>Condiciones</p>', alerta3: null,
      alertas: [{ titulo: 'Aviso', texto: '<p>Otra cosa</p>' }],
    }]);
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    expect(await utils.findByText('1 de 2')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Aceptar condiciones'));
    expect(await utils.findByText('2 de 2')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Aceptar condiciones'));
    expect(await utils.findByLabelText('S.B.A.')).toBeTruthy();
  });

  test('un evento sin condiciones saltea ese paso', async () => {
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    expect(await utils.findByLabelText('S.B.A.')).toBeTruthy();
  });

  test('no busca animales sin S.B.A./R.P. y sexo', async () => {
    const { findByText, getByText } = renderAlta();
    fireEvent.press(await findByText('Expo Palermo 2026'));
    fireEvent.press(await findByText('Buscar'));
    expect(api.buscarAnimalesAlta).not.toHaveBeenCalled();
    expect(getByText('Buscar')).toBeTruthy();
  });

  test('al buscar se cierra el teclado, que si no tapa los resultados', async () => {
    const cerrar = jest.spyOn(Keyboard, 'dismiss');
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    fireEvent.changeText(await utils.findByLabelText('S.B.A.'), '123783');
    fireEvent.press(utils.getByText('Hembra'));
    fireEvent.press(utils.getByText('Buscar'));
    expect(cerrar).toHaveBeenCalled();
    cerrar.mockRestore();
  });

  test('un animal ya inscripto en el evento no se puede elegir', async () => {
    api.buscarAnimalesAlta.mockResolvedValue([{ ...ANIMAL, ya_inscripto: true }]);
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    fireEvent.changeText(await utils.findByLabelText('S.B.A.'), '123456');
    fireEvent.press(utils.getByText('Hembra'));
    fireEvent.press(utils.getByText('Buscar'));
    expect(await utils.findByText('Ya está inscripto en este evento')).toBeTruthy();
    fireEvent.press(utils.getByText('LA ÑANDÚ'));
    // No avanza: la presentación no aparece.
    expect(utils.queryByText('Cabestro')).toBeNull();
  });

  test('primero los popups, después los términos y recién el evento', async () => {
    api.fetchAlertasAlta.mockResolvedValue({
      terminos: '<p>Términos generales</p>',
      alertas: [
        { titulo: 'Asociar Propietarios SRA', texto: '<p>Sólo los propietarios…</p>' },
        { titulo: 'Segundo aviso', texto: '<p>Otra cosa</p>' },
      ],
    });
    const utils = renderAlta();

    // 1) El primer popup, por encima de la página de términos.
    expect(await utils.findByText('Asociar Propietarios SRA')).toBeTruthy();
    expect(utils.queryByText('Expo Palermo 2026')).toBeNull();

    // 2) Un popup por alerta, en orden.
    fireEvent.press(utils.getByLabelText('Aceptar aviso'));
    expect(await utils.findByText('Segundo aviso')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Aceptar aviso'));

    // 3) Cerrados los popups queda la página de términos, y recién de ahí
    //    se pasa a elegir el evento.
    expect(utils.queryByText('Segundo aviso')).toBeNull();
    expect(utils.getByText('Términos y condiciones generales')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Aceptar términos'));
    expect(await utils.findByText('Expo Palermo 2026')).toBeTruthy();
  });

  test('sin alertas pero con términos, muestra la página sin popups', async () => {
    api.fetchAlertasAlta.mockResolvedValue({ terminos: '<p>Términos generales</p>', alertas: [] });
    const utils = renderAlta();
    expect(await utils.findByText('Términos y condiciones generales')).toBeTruthy();
    expect(utils.queryByLabelText('Aceptar aviso')).toBeNull();
    fireEvent.press(utils.getByLabelText('Aceptar términos'));
    expect(await utils.findByText('Expo Palermo 2026')).toBeTruthy();
  });

  test('sin alertas ni términos saltea esa pantalla, como la web', async () => {
    const { findByText } = renderAlta();
    expect(await findByText('Expo Palermo 2026')).toBeTruthy();
  });

  test('si la lectura de alertas falla, el alta sigue igual', async () => {
    // Son informativas: no vale la pena trabar la inscripción por ellas.
    api.fetchAlertasAlta.mockRejectedValueOnce(new Error('x'));
    const { findByText } = renderAlta();
    expect(await findByText('Expo Palermo 2026')).toBeTruthy();
  });

  test('muestra criador, propietario y expositor del animal', async () => {
    // El expositor no se elige: el servidor lo deriva del dueño, así que es el
    // propietario. La web muestra los tres igual.
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    fireEvent.changeText(await utils.findByLabelText('S.B.A.'), '123456');
    fireEvent.press(utils.getByText('Hembra'));
    fireEvent.press(utils.getByText('Buscar'));
    fireEvent.press(await utils.findByText('LA ÑANDÚ'));
    fireEvent.press(await utils.findByText('Cabestro'));
    fireEvent.press(utils.getByText('Continuar'));

    expect(await utils.findByText('Criador')).toBeTruthy();
    expect(utils.getByText('Propietario')).toBeTruthy();
    expect(utils.getByText('Expositor')).toBeTruthy();
    expect(utils.getAllByText('LA ENTABLADA S.A.').length).toBe(3);
  });

  test('el Renspa sólo se pide si el evento lo pide', async () => {
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    fireEvent.changeText(await utils.findByLabelText('S.B.A.'), '123456');
    fireEvent.press(utils.getByText('Hembra'));
    fireEvent.press(utils.getByText('Buscar'));
    fireEvent.press(await utils.findByText('LA ÑANDÚ'));
    fireEvent.press(await utils.findByText('Cabestro'));
    fireEvent.press(utils.getByText('Continuar'));
    await utils.findByLabelText('Cabaña');
    expect(utils.queryByLabelText('Renspa')).toBeNull();
  });

  test('con un evento que lo pide, el Renspa aparece', async () => {
    api.fetchEventosAlta.mockResolvedValue([{ ...EVENTO, pide_renspa: true }]);
    const utils = renderAlta();
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    fireEvent.changeText(await utils.findByLabelText('S.B.A.'), '123456');
    fireEvent.press(utils.getByText('Hembra'));
    fireEvent.press(utils.getByText('Buscar'));
    fireEvent.press(await utils.findByText('LA ÑANDÚ'));
    fireEvent.press(await utils.findByText('Cabestro'));
    fireEvent.press(utils.getByText('Continuar'));
    expect(await utils.findByLabelText('Renspa')).toBeTruthy();
  });

  // Deja el asistente en el paso de datos, con el selector de cabaña a mano.
  async function hastaDatos(utils) {
    fireEvent.press(await utils.findByText('Expo Palermo 2026'));
    fireEvent.changeText(await utils.findByLabelText('S.B.A.'), '123456');
    fireEvent.press(utils.getByText('Hembra'));
    fireEvent.press(utils.getByText('Buscar'));
    fireEvent.press(await utils.findByText('LA ÑANDÚ'));
    fireEvent.press(await utils.findByText('Cabestro'));
    fireEvent.press(utils.getByText('Continuar'));
    return utils.findByLabelText('Cabaña');
  }

  test('la cabaña se busca en vez de listarse entera', async () => {
    // El socio puede tener decenas: la lista desplegada no sirve.
    api.fetchCabanias.mockResolvedValue(['ARROYO DE LOS HUESOS', 'DEL JUNCAL', 'EL ESPINILLO']);
    const utils = renderAlta();
    await hastaDatos(utils);

    // Cerrado, no muestra ninguna.
    expect(utils.queryByText('DEL JUNCAL')).toBeNull();

    fireEvent.press(utils.getByLabelText('Cabaña'));
    fireEvent.changeText(await utils.findByLabelText('Buscar o escribir una nueva'), 'junc');
    expect(await utils.findByText('DEL JUNCAL')).toBeTruthy();
    expect(utils.queryByText('EL ESPINILLO')).toBeNull(); // filtrada

    fireEvent.press(utils.getByText('DEL JUNCAL'));
    expect(await utils.findByText('DEL JUNCAL')).toBeTruthy(); // ya en el campo
  });

  test('lo que se escribe sirve como cabaña nueva', async () => {
    // El POST acepta texto libre: el mismo buscador hace de campo.
    api.fetchCabanias.mockResolvedValue(['DEL JUNCAL']);
    const utils = renderAlta();
    await hastaDatos(utils);
    fireEvent.press(utils.getByLabelText('Cabaña'));
    fireEvent.changeText(await utils.findByLabelText('Buscar o escribir una nueva'), 'LA NUEVA');
    fireEvent.press(await utils.findByText('Usar «LA NUEVA»'));
    expect(await utils.findByText('LA NUEVA')).toBeTruthy();
  });

  test('una cabaña que ya está en la lista no se ofrece como nueva', async () => {
    api.fetchCabanias.mockResolvedValue(['DEL JUNCAL']);
    const utils = renderAlta();
    await hastaDatos(utils);
    fireEvent.press(utils.getByLabelText('Cabaña'));
    fireEvent.changeText(await utils.findByLabelText('Buscar o escribir una nueva'), 'del juncal');
    expect(utils.queryByText('Usar «del juncal»')).toBeNull();
  });

  test('sin cabañas previas invita a escribir la suya', async () => {
    api.fetchCabanias.mockResolvedValue([]);
    const utils = renderAlta();
    await hastaDatos(utils);
    fireEvent.press(utils.getByLabelText('Cabaña'));
    expect(await utils.findByText('Escribí el nombre de tu cabaña.')).toBeTruthy();
  });

  test('las pruebas de yunta se listan pero no se pueden elegir todavía', async () => {
    const utils = renderAlta();
    await hastaParticipacion(utils);
    expect(utils.getByText('Paleteada')).toBeTruthy();
    expect(utils.getByText('Las pruebas de yunta se inscriben por la web por ahora.')).toBeTruthy();
  });

  test('una prueba con una sola categoría va en una línea, con su nombre', async () => {
    // La categoría venía sin nombre y la fila quedaba con un checkbox suelto.
    api.fetchOpcionesAlta.mockResolvedValue({
      ...OPCIONES,
      pruebas: [{ prueba: { id: 3, nombre: 'Marchita' }, modalidad: 'individual',
        categorias: [{ id: 30, nombre: '', habilitada: true, cupo: 50, ocupacion: 0, lista_espera: false }] }],
    });
    const utils = renderAlta();
    await hastaParticipacion(utils);
    // El checkbox se etiqueta con el nombre de la prueba.
    expect(utils.getByLabelText('Marchita')).toBeTruthy();
    expect(utils.getByText('0/50')).toBeTruthy();
  });

  test('con varias categorías cada una es una fila propia', async () => {
    api.fetchOpcionesAlta.mockResolvedValue({
      ...OPCIONES,
      pruebas: [{ prueba: { id: 1, nombre: 'Rienda' }, modalidad: 'individual', categorias: [
        { id: 12, nombre: 'Mayor', habilitada: true, cupo: 30, ocupacion: 12, lista_espera: false },
        { id: 13, nombre: 'Menor', habilitada: true, cupo: 30, ocupacion: 3, lista_espera: false },
      ] }],
    });
    const utils = renderAlta();
    await hastaParticipacion(utils);
    expect(utils.getByText('Rienda')).toBeTruthy(); // el encabezado
    expect(utils.getByLabelText('Mayor')).toBeTruthy();
    expect(utils.getByLabelText('Menor')).toBeTruthy();
  });

  test('una prueba elegida ofrece jinete y domador', async () => {
    const utils = renderAlta();
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByLabelText('Rienda · Mayor'));
    expect(await utils.findByText('Elegir jinete')).toBeTruthy();
    expect(utils.getByText('Elegir domador (opcional)')).toBeTruthy();
  });

  test('morfología muestra la categoría calculada', async () => {
    const utils = renderAlta();
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByText('No participa'));
    expect(await utils.findByText('Participa — Potrancas')).toBeTruthy();
  });

  test('habilitada pero sin categoría no se puede elegir', async () => {
    // La categoría la calcula el servidor contra las del evento; sin una que
    // matchee al animal, el alta daría 422 CategoriaSinCalcular.
    api.fetchOpcionesAlta.mockResolvedValue({
      ...OPCIONES,
      morfologia: { categoria: null, habilitada: true },
    });
    const utils = renderAlta();
    await hastaParticipacion(utils);
    expect(utils.getByText('Este evento no tiene una categoría para este animal.')).toBeTruthy();
    expect(utils.queryByText(/categoría a calcular/)).toBeNull();
  });

  test('tipo y aptitud aparece igual que morfología', async () => {
    api.fetchOpcionesAlta.mockResolvedValue({
      ...OPCIONES,
      tipo_aptitud: { categoria: { id: 9, nombre: 'Machos T&A' }, habilitada: true },
    });
    const utils = renderAlta();
    await hastaParticipacion(utils);
    expect(utils.getByText('Tipo y aptitud')).toBeTruthy();
    // Dos «No participa»: uno por participación.
    expect(utils.getAllByText('No participa')).toHaveLength(2);
  });

  test('tipo y aptitud elegida viaja en el payload', async () => {
    api.fetchOpcionesAlta.mockResolvedValue({
      ...OPCIONES,
      morfologia: { categoria: null, habilitada: false },
      tipo_aptitud: { categoria: { id: 9, nombre: 'Machos T&A' }, habilitada: true },
    });
    const utils = renderAlta();
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByText('No participa')); // el único: T&A
    await ponerJinete(utils);
    fireEvent.press(await utils.findByText('Continuar'));
    fireEvent.press(await utils.findByText('Confirmar inscripción'));

    const payload = api.crearInscripcion.mock.calls[0][0];
    expect(payload.tipo_aptitud).toEqual({ jinete: 7 });
    expect(payload.morfologia).toBeNull();
  });

  test('no deja continuar sin el jinete, y dice cuál falta', async () => {
    // El servidor lo valida (JineteFaltante / JineteMorfologia): avisarlo acá
    // evita cargar todo para enterarse con un 422.
    const utils = renderAlta();
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByLabelText('Rienda · Mayor'));
    expect(await utils.findByText('Falta el jinete de Rienda.')).toBeTruthy();

    await ponerJinete(utils);
    expect(utils.queryByText('Falta el jinete de Rienda.')).toBeNull();
  });

  test('con morfología y una prueba, nombra los dos jinetes que faltan', async () => {
    const utils = renderAlta();
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByText('No participa'));
    fireEvent.press(utils.getByLabelText('Rienda · Mayor'));
    expect(await utils.findByText('Falta el jinete de morfología, el jinete de Rienda.')).toBeTruthy();
  });

  test('sin participación elegida no deja continuar', async () => {
    const utils = renderAlta();
    await hastaParticipacion(utils);
    expect(utils.getByText('Elegí al menos una participación.')).toBeTruthy();
  });
});

describe('AltaInscripcionScreen — jinete', () => {
  async function hastaJinete(utils) {
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByText('No participa')); // activa morfología
    fireEvent.press(await utils.findByText('Elegir jinete'));
    return utils.findByLabelText('Apellido');
  }

  test('busca por nombre, apellido y documento', async () => {
    // La A4 acepta los tres y los combina con AND; faltaba el nombre.
    const utils = renderAlta();
    await hastaJinete(utils);
    fireEvent.changeText(utils.getByLabelText('Nombre'), 'Ana');
    fireEvent.changeText(utils.getByLabelText('Apellido'), 'Gómez');
    fireEvent.press(utils.getByText('Buscar'));

    expect(api.buscarJinetes).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Ana', apellido: 'Gómez', documento: '', evento: 9059001 }),
    );
  });

  test('con sólo el nombre ya se puede buscar', async () => {
    const utils = renderAlta();
    await hastaJinete(utils);
    fireEvent.changeText(utils.getByLabelText('Nombre'), 'Ana');
    fireEvent.press(utils.getByText('Buscar'));
    expect(api.buscarJinetes).toHaveBeenCalled();
  });

  test('sin ningún campo no busca', async () => {
    const utils = renderAlta();
    await hastaJinete(utils);
    fireEvent.press(utils.getByText('Buscar'));
    expect(api.buscarJinetes).not.toHaveBeenCalled();
  });

  test('un jinete con deuda no se puede elegir', async () => {
    // La deuda se evalúa a la fecha del evento, no a la de hoy.
    api.buscarJinetes.mockResolvedValue([
      { id: 7, nombre: 'Ana', apellido: 'Gómez', documento: '123', tiene_deuda: true },
    ]);
    const utils = renderAlta();
    await hastaJinete(utils);
    fireEvent.changeText(utils.getByLabelText('Apellido'), 'Gómez');
    fireEvent.press(utils.getByText('Buscar'));
    expect(await utils.findByText('Tiene la cuota impaga a la fecha del evento')).toBeTruthy();
    fireEvent.press(utils.getByText('Gómez Ana'));
    // No lo eligió: sigue en el buscador.
    expect(utils.getByLabelText('Apellido')).toBeTruthy();
  });
});

describe('AltaInscripcionScreen — confirmación', () => {
  // Deja el asistente en la pantalla de confirmar, con morfología elegida.
  async function hastaConfirmar(utils) {
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByText('No participa')); // activa morfología
    await ponerJinete(utils);
    fireEvent.press(utils.getByText('Continuar'));
    await utils.findByText('Confirmar inscripción');
  }

  test('arma el payload con el evento de inscripciones y el animal como {tabla, id}', async () => {
    const utils = renderAlta();
    await hastaConfirmar(utils);
    fireEvent.press(utils.getByText('Confirmar inscripción'));

    expect(api.crearInscripcion).toHaveBeenCalledTimes(1);
    const payload = api.crearInscripcion.mock.calls[0][0];
    expect(payload).toMatchObject({
      evento: 9059001,
      animal: { tabla: 'IdExis', id: 9059010 },
      sexo: 2,
      presentacion: 'C',
      cabania: 'LA ESTANCIA',
      provincia: 'Córdoba',
      localidad: 'Jesús María',
      // Otoño es de los eventos 61/62, cerrados desde 2012.
      otonio: 0,
      ficcc: 0,
      tipo_aptitud: null,
    });
    expect(payload.morfologia).toEqual({ jinete: 7 });
  });

  test('alerta3 es una pantalla propia: se acepta y recién después se confirma', async () => {
    // Es expositores_alerta3.php, la página cuyo formulario postea a paso7.
    api.fetchEventosAlta.mockResolvedValue([{ ...EVENTO, alerta3: '<p>Declaración final</p>' }]);
    const utils = renderAlta();
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByText('No participa'));
    await ponerJinete(utils);
    fireEvent.press(utils.getByText('Continuar'));

    // Primero el aviso, sin el botón de confirmar a la vista.
    expect(await utils.findByText('Antes de confirmar')).toBeTruthy();
    expect(utils.queryByText('Confirmar inscripción')).toBeNull();

    fireEvent.press(utils.getByLabelText('Acepto'));
    expect(await utils.findByText('Confirmar inscripción')).toBeTruthy();
  });

  test('un evento sin alerta3 va directo a confirmar', async () => {
    const utils = renderAlta();
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByText('No participa'));
    await ponerJinete(utils);
    fireEvent.press(utils.getByText('Continuar'));
    expect(await utils.findByText('Confirmar inscripción')).toBeTruthy();
  });

  test('el domador elegido viaja en el payload de su prueba', async () => {
    api.buscarDomadores.mockResolvedValue([{ id: 55, nombre: 'Luis', apellido: 'Pérez', documento: '9' }]);
    const utils = renderAlta();
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByLabelText('Rienda · Mayor'));
    fireEvent.press(await utils.findByText('Elegir domador (opcional)'));
    await utils.findByLabelText('Apellido'); // el paso ya montó
    fireEvent.changeText(utils.getByLabelText('Apellido'), 'Pérez');
    fireEvent.press(utils.getByText('Buscar'));
    fireEvent.press(await utils.findByText('Pérez Luis'));
    await ponerJinete(utils);

    fireEvent.press(await utils.findByText('Continuar'));
    fireEvent.press(await utils.findByText('Confirmar inscripción'));

    const payload = api.crearInscripcion.mock.calls[0][0];
    expect(payload.pruebas[0]).toMatchObject({ prueba: 1, categoria: 12, domador: 55, jinete: 7 });
    expect(api.buscarDomadores).toHaveBeenCalled();
  });

  test('una prueba sin nombre de categoría dice que participa, no un guión', async () => {
    api.fetchOpcionesAlta.mockResolvedValue({
      ...OPCIONES,
      pruebas: [{ prueba: { id: 3, nombre: 'Marchita' }, modalidad: 'individual',
        categorias: [{ id: 30, nombre: '', habilitada: true, cupo: 50, ocupacion: 0, lista_espera: false }] }],
    });
    const utils = renderAlta();
    await hastaParticipacion(utils);
    fireEvent.press(utils.getByLabelText('Marchita'));
    await ponerJinete(utils);
    fireEvent.press(await utils.findByText('Continuar'));
    await utils.findByText('Confirmar inscripción');
    expect(utils.getByText('Participa')).toBeTruthy();
  });

  test('un 201 muestra el número de inscripción y el precio', async () => {
    const utils = renderAlta();
    await hastaConfirmar(utils);
    fireEvent.press(utils.getByText('Confirmar inscripción'));
    expect(await utils.findByText('Inscripción N° 185901')).toBeTruthy();
    expect(utils.getByText('Definitiva')).toBeTruthy();
    expect(utils.getByText('$ 2151')).toBeTruthy();
  });

  test('un 201 con pruebas null igual confirma el alta', async () => {
    // No hay que reintentar: el alta se hizo y un reintento daría 409.
    api.crearInscripcion.mockResolvedValue({
      inscripcion: { id: 185902, estado: 1, estado_nombre: 'Definitiva', precio: null, pruebas: null },
    });
    const utils = renderAlta();
    await hastaConfirmar(utils);
    fireEvent.press(utils.getByText('Confirmar inscripción'));
    expect(await utils.findByText('Inscripción N° 185902')).toBeTruthy();
    expect(utils.getByText(/La inscripción quedó registrada/)).toBeTruthy();
  });

  test('un 422 muestra cada regla traducida y deja volver a intentar', async () => {
    api.crearInscripcion.mockRejectedValueOnce(new ApiError({
      path: '/inscripciones', status: 422, detail: 'x', code: 'inscripcion_invalida',
      errores: [
        { codigo: 'CupoLleno', campo: null, prueba: 1, categoria: 12 },
        { codigo: 'JineteMorfologia', campo: null, prueba: null, categoria: null },
      ],
    }));
    const utils = renderAlta();
    await hastaConfirmar(utils);
    fireEvent.press(utils.getByText('Confirmar inscripción'));

    expect(await utils.findByText('No se pudo inscribir')).toBeTruthy();
    expect(utils.getByText('· Esta categoría ya no tiene cupo.')).toBeTruthy();
    expect(utils.getByText('· Falta elegir el jinete para la morfología.')).toBeTruthy();
    expect(utils.getByText('Confirmar inscripción')).toBeTruthy(); // sigue ahí
  });

  test('un error que no es 422 se muestra como mensaje, sin lista de reglas', async () => {
    api.crearInscripcion.mockRejectedValueOnce(new ApiError({
      path: '/inscripciones', status: 503, detail: 'La base no responde', code: 'base_no_disponible',
    }));
    const utils = renderAlta();
    await hastaConfirmar(utils);
    fireEvent.press(utils.getByText('Confirmar inscripción'));
    expect(await utils.findByText('La base no responde')).toBeTruthy();
    expect(utils.queryByText('No se pudo inscribir')).toBeNull();
  });
});
