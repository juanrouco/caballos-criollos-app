import {
  mapEventoAlta, mapAnimalAlta, mapOpciones, mapJinete, mapAltaCreada, animalAPayload, mapAlertas,
  mapYuntaCandidato, mapEquipo, companieroAPayload,
  buscarAnimalesAlta, fetchOpcionesAlta, crearInscripcion,
} from '../../src/api/alta';
import { API_BASE } from '../../src/api/client';
import { setSession, clearSession } from '../../src/api/session';
import { textoErrorInscripcion, describirErrores, CODIGOS_CONOCIDOS } from '../../src/erroresInscripcion';

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });
const viva = () => ({ accessToken: 'acc1', refreshToken: 'ref1', expiresAt: Date.now() + 3600e3 });

describe('animalAPayload', () => {
  test('traduce el id compuesto al par {tabla, id} que pide el POST', () => {
    expect(animalAPayload('exis:9059010')).toEqual({ tabla: 'IdExis', id: 9059010 });
    expect(animalAPayload('pdre:1000')).toEqual({ tabla: 'IdPdre', id: 1000 });
    expect(animalAPayload('extr:6703')).toEqual({ tabla: 'IdExtr', id: 6703 });
  });

  test('un id que no tiene esa forma devuelve null en vez de inventar una tabla', () => {
    expect(animalAPayload('9059010')).toBeNull();
    expect(animalAPayload('otra:1')).toBeNull();
    expect(animalAPayload('')).toBeNull();
    expect(animalAPayload(null)).toBeNull();
  });
});

describe('mappers del alta', () => {
  test('mapEventoAlta expone si el evento pide Renspa y sus alertas', () => {
    const e = mapEventoAlta({
      id: 9059001, nombre: 'Expo Palermo 2026', inscripcion_hasta: '2026-07-01',
      evento_desde: '2026-07-20', por_rehacer: false, pide_renspa: true,
      alertas: [{ titulo: 'Atención', texto: 'Traer libreta sanitaria' }],
    });
    expect(e).toMatchObject({ id: 9059001, pideRenspa: true, inscripcionHasta: '2026-07-01' });
    expect(e.alertas[0].titulo).toBe('Atención');
  });

  test('mapEventoAlta conserva alerta2 y alerta3, las condiciones del evento', () => {
    // Son el HTML de expositores_alerta2.php / alerta3.php: las páginas que la
    // web muestra después de elegir el evento.
    const e = mapEventoAlta({ ...{ id: 1, nombre: 'X', alertas: [] }, alerta2: '<p>Tarifas</p>', alerta3: null });
    expect(e.alerta2).toBe('<p>Tarifas</p>');
    expect(e.alerta3).toBeNull();
  });

  test('mapAnimalAlta conserva ya_inscripto null (búsqueda sin evento)', () => {
    expect(mapAnimalAlta({ id: 'exis:1', nombre: 'LA ÑANDÚ', ya_inscripto: null }).yaInscripto).toBeNull();
    expect(mapAnimalAlta({ id: 'exis:1', ya_inscripto: true }).yaInscripto).toBe(true);
  });

  test('mapOpciones arma pruebas con su modalidad y el cupo de cada categoría', () => {
    const o = mapOpciones({
      morfologia: { categoria: { id: 12, nombre: 'Potrancas' }, habilitada: true },
      tipo_aptitud: { categoria: null, habilitada: false },
      pruebas: [
        { prueba: { id: 1, nombre: 'Rienda' }, modalidad: 'individual',
          categorias: [{ id: 12, nombre: 'Mayor', habilitada: true, cupo: 30, ocupacion: 12, lista_espera: false }] },
        { prueba: { id: 5, nombre: 'Freno de Oro' }, modalidad: 'individual',
          categorias: [{ id: 9, nombre: 'Mayor', habilitada: true, cupo: 0, ocupacion: 40, lista_espera: true }] },
      ],
    });
    expect(o.morfologia).toEqual({ categoria: { id: 12, nombre: 'Potrancas' }, habilitada: true });
    expect(o.tipoAptitud).toEqual({ categoria: null, habilitada: false });
    expect(o.pruebas[0]).toMatchObject({ id: 1, nombre: 'Rienda', modalidad: 'individual' });
    expect(o.pruebas[0].categorias[0]).toMatchObject({ cupo: 30, ocupacion: 12, listaEspera: false });
    // Freno de Oro es lista de espera: no bloquea aunque la ocupación pase el cupo.
    expect(o.pruebas[1].categorias[0].listaEspera).toBe(true);
  });

  test('mapJinete marca la deuda, que se evalúa a la fecha del evento', () => {
    expect(mapJinete({ id: 7, nombre: 'Ana', apellido: 'Gómez', documento: '123', tiene_deuda: true }))
      .toEqual({ id: 7, nombre: 'Ana', apellido: 'Gómez', documento: '123', tieneDeuda: true });
  });

  test('mapAltaCreada deja pruebas en null cuando la API no las pudo leer', () => {
    // Un 201 con pruebas null es un alta HECHA: reintentar daría 409.
    const a = mapAltaCreada({ inscripcion: { id: 185901, estado: 1, estado_nombre: 'Definitiva', precio: 2151, pruebas: null } });
    expect(a).toMatchObject({ id: 185901, estado: 1, precio: 2151 });
    expect(a.pruebas).toBeNull();
  });

  test('un precio null no se convierte en cero', () => {
    expect(mapAltaCreada({ inscripcion: { id: 1, precio: null, pruebas: [] } }).precio).toBeNull();
  });
});

describe('requests del alta', () => {
  beforeEach(() => { clearSession(); global.fetch = jest.fn(); setSession(viva()); });
  afterEach(() => { clearSession(); delete global.fetch; });

  test('la búsqueda de animales manda sba, rp, sexo y evento', async () => {
    fetch.mockResolvedValueOnce(okJson([]));
    await buscarAnimalesAlta({ sba: '115539', rp: '5550', sexo: 2, evento: 9059001 });
    const [crudo] = fetch.mock.calls[0];
    expect(crudo.startsWith(`${API_BASE}/inscripciones/animales?`)).toBe(true);
    const url = new URL(crudo);
    expect(url.searchParams.get('sba')).toBe('115539');
    expect(url.searchParams.get('sexo')).toBe('2');
    expect(url.searchParams.get('evento')).toBe('9059001');
  });

  test('las opciones van por evento y llevan animal, sexo y presentación', async () => {
    fetch.mockResolvedValueOnce(okJson({ pruebas: [] }));
    await fetchOpcionesAlta(9059001, { animal: 'exis:9059010', sexo: 2, presentacion: 'C' });
    const [crudo] = fetch.mock.calls[0];
    expect(crudo.startsWith(`${API_BASE}/inscripciones/eventos/9059001/opciones?`)).toBe(true);
    const url = new URL(crudo);
    expect(url.searchParams.get('animal')).toBe('exis:9059010');
    expect(url.searchParams.get('presentacion')).toBe('C');
  });

  test('crearInscripcion postea el payload con el token', async () => {
    fetch.mockResolvedValueOnce(okJson({ inscripcion: { id: 1 } }));
    const payload = { evento: 9059001, animal: { tabla: 'IdExis', id: 9059010 }, sexo: 2, presentacion: 'C' };
    await crearInscripcion(payload);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/inscripciones`);
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe('Bearer acc1');
    expect(JSON.parse(opts.body)).toEqual(payload);
  });

  test('un 422 llega con su lista de códigos para traducir', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 422,
      json: async () => ({
        error: true, status: 422, message: 'x', code: 'inscripcion_invalida',
        errores: [{ codigo: 'CupoLleno', campo: null, prueba: 1, categoria: 12 }],
      }),
    });
    await expect(crearInscripcion({})).rejects.toMatchObject({ status: 422, code: 'inscripcion_invalida' });
  });
});

describe('textos de los errores del 422', () => {
  test('cada código conocido tiene un texto propio', () => {
    const textos = CODIGOS_CONOCIDOS.map(textoErrorInscripcion);
    expect(textos.every((t) => t && t.length > 0)).toBe(true);
    // Ninguno cae en el genérico: si alguno lo hiciera, falta redactarlo.
    expect(new Set(textos).size).toBe(CODIGOS_CONOCIDOS.length);
  });

  test('un código desconocido no inventa un mensaje: cae en el genérico', () => {
    expect(textoErrorInscripcion('ReglaNueva2027')).toBe('Esta inscripción no cumple una regla del evento.');
    expect(textoErrorInscripcion(undefined)).toBe('Esta inscripción no cumple una regla del evento.');
  });

  test('describirErrores conserva prueba y categoría para ubicar el error', () => {
    const d = describirErrores([{ codigo: 'JineteFaltante', campo: null, prueba: 2, categoria: 7 }]);
    expect(d[0]).toEqual({
      codigo: 'JineteFaltante',
      texto: 'Falta elegir el jinete de esta prueba.',
      campo: null, prueba: 2, categoria: 7,
    });
  });

  test('sin errores devuelve lista vacía, no revienta', () => {
    expect(describirErrores(undefined)).toEqual([]);
    expect(describirErrores(null)).toEqual([]);
  });
});

describe('mapAlertas', () => {
  test('sin alertas ni términos marca que no hay nada que mostrar', () => {
    // Es el caso en que la web redirige directo al paso 1.
    expect(mapAlertas({ terminos: null, alertas: [] })).toMatchObject({ hayAlgo: false });
  });

  test('con alertas las devuelve con su HTML crudo', () => {
    const d = mapAlertas({ terminos: '<p>b</p>', alertas: [{ titulo: 'Atención', texto: '<p>a</p>' }] });
    expect(d.hayAlgo).toBe(true);
    expect(d.alertas[0]).toEqual({ titulo: 'Atención', html: '<p>a</p>' });
  });

  test('sólo términos, sin alertas, también es algo para mostrar', () => {
    const d = mapAlertas({ terminos: '<p>la alerta fija</p>', alertas: [] });
    expect(d).toMatchObject({ hayAlgo: true, terminos: '<p>la alerta fija</p>' });
    expect(d.alertas).toEqual([]);
  });
});

describe('yunta y equipo', () => {
  test('mapYuntaCandidato: permitido false es la regla J-1', () => {
    expect(mapYuntaCandidato({ id: 'pdre:1', nombre: 'X', sba: '9', permitido: false }).permitido).toBe(false);
    // Ausente se toma como permitido: la API sólo lo evalúa con prueba y categoría.
    expect(mapYuntaCandidato({ id: 'pdre:1', nombre: 'X' }).permitido).toBe(true);
  });

  test('mapEquipo trae el padrón con el jinete de cada integrante', () => {
    const e = mapEquipo({
      id: 7, nombre: 'EL TRÍO', anio: 2026,
      animales: [{ id: 'exis:1', nombre: 'UNA', sba: '1', sexo: 2, jinete: { id: 3, nombre: 'Ana', apellido: 'Gómez' } }],
      habilitado: false, jinetes_inhabilitados: ['Ana Gómez'], bloqueado: true, bloqueado_por: 'OTRO',
    });
    expect(e).toMatchObject({ id: 7, nombre: 'EL TRÍO', habilitado: false, bloqueado: true, bloqueadoPor: 'OTRO' });
    expect(e.animales[0].jinete).toEqual({ id: 3, nombre: 'Ana', apellido: 'Gómez' });
    expect(e.jinetesInhabilitados).toEqual(['Ana Gómez']);
  });

  test('companieroAPayload deriva la tabla y el sexo del propio candidato', () => {
    // Un par tabla/sexo incoherente da 400, así que el sexo no sale de lo tipeado.
    expect(companieroAPayload({ id: 'exis:9059011', sexo: 1 })).toEqual({ tabla: 'IdExis', id: 9059011, sexo: 2 });
    expect(companieroAPayload({ id: 'pdre:9059012', sexo: 2 })).toEqual({ tabla: 'IdPdre', id: 9059012, sexo: 1 });
    // Extranjero: admite los dos, así que se respeta el del candidato.
    expect(companieroAPayload({ id: 'extr:6703', sexo: 2 })).toEqual({ tabla: 'IdExtr', id: 6703, sexo: 2 });
  });

  test('companieroAPayload rechaza lo que no puede armar', () => {
    expect(companieroAPayload({ id: 'extr:1', sexo: 0 })).toBeNull(); // castrado no vale de compañero
    expect(companieroAPayload({ id: '9059011' })).toBeNull();
    expect(companieroAPayload(null)).toBeNull();
  });
});
