import {
  mapEventoAlta, mapAnimalAlta, mapOpciones, mapJinete, mapAltaCreada, animalAPayload, mapAlertas,
  mapYuntaCandidato, mapEquipo, companieroAPayload, integranteAPayload, mapEquipoCreado,
  buscarAnimalesAlta, fetchOpcionesAlta, crearInscripcion, crearEquipo,
  buscarJinetes, buscarDomadores,
} from '../../src/api/alta';
import { API_BASE } from '../../src/api/client';
import { setSession, clearSession } from '../../src/api/session';
import {
  textoErrorInscripcion, describirErrores, CODIGOS_CONOCIDOS,
  textoErrorEquipo, describirErroresEquipo,
} from '../../src/erroresInscripcion';

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

  test('propio queda en tri-estado: false bloquea, ausente no', () => {
    // A2 lista candidatos de cualquier dueño y los marca con `propio` (#248);
    // el ajeno siempre termina en 422 `Pertenencia`. Pero si un deploy dejara
    // de mandar el campo, un `!!undefined` habría bloqueado TODOS los animales
    // y dejado el alta sin salida, así que ausente no decide nada.
    expect(mapAnimalAlta({ id: 'pdre:9061002', propio: false }).propio).toBe(false);
    expect(mapAnimalAlta({ id: 'pdre:9061001', propio: true }).propio).toBe(true);
    expect(mapAnimalAlta({ id: 'exis:1' }).propio).toBeNull();
  });

  test('mapOpciones arma pruebas con su modalidad y el cupo de cada categoría', () => {
    const o = mapOpciones({
      morfologia: { categoria: { id: 12, nombre: 'Potrancas' }, habilitada: true },
      tipo_aptitud: { categoria: null, habilitada: false },
      pruebas: [
        { prueba: { id: 1, nombre: 'Rienda' }, modalidad: 'individual',
          categorias: [{ id: 12, nombre: 'Mayor', habilitada: true, cupo: 30, ocupacion: 12, lista_espera: false }] },
        { prueba: { id: 5, nombre: 'Freno de Oro' }, modalidad: 'individual',
          categorias: [{ id: 9, nombre: 'Mayor', propia: true, habilitada: true, cupo: 0, ocupacion: 40, lista_espera: true }] },
      ],
    });
    expect(o.morfologia).toEqual({ categoria: { id: 12, nombre: 'Potrancas' }, habilitada: true });
    expect(o.tipoAptitud).toEqual({ categoria: null, habilitada: false });
    expect(o.pruebas[0]).toMatchObject({ id: 1, nombre: 'Rienda', modalidad: 'individual' });
    expect(o.pruebas[0].categorias[0]).toMatchObject({ cupo: 30, ocupacion: 12, listaEspera: false });
    // `propia` dice si la categoría se acumula con otras de la misma prueba:
    // es el dato con el que la pantalla arma los checkboxes. Sin el campo
    // (una API vieja) queda false, que es el lado seguro: una sola.
    expect(o.pruebas[0].categorias[0].propia).toBe(false);
    expect(o.pruebas[1].categorias[0].propia).toBe(true);
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

  // Las dos búsquedas de personas pasaron de GET a POST (#259) porque el
  // documento no puede viajar en la URL: queda en el log de accesos del
  // servidor. Lo que se chequea acá es que el dato efectivamente NO esté en la
  // URL, que es el punto del cambio, y los tipos que el backend rechaza con 400.
  describe('buscar jinetes y domadores (POST, no GET)', () => {
    test('el documento no viaja en la URL sino en el body', async () => {
      fetch.mockResolvedValueOnce(okJson([]));
      await buscarJinetes({ nombre: '', apellido: 'Pérez', documento: '30111222', evento: 9059001 });
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe(`${API_BASE}/jinetes`);
      expect(url).not.toMatch(/30111222/);
      expect(url).not.toMatch(/\?/);
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(opts.headers.Authorization).toBe('Bearer acc1');
      expect(JSON.parse(opts.body)).toEqual({ apellido: 'Pérez', documento: '30111222', evento: 9059001 });
    });

    test('los domadores van a su propia ruta y sin evento', async () => {
      fetch.mockResolvedValueOnce(okJson([]));
      await buscarDomadores({ nombre: 'Luis', apellido: '', documento: '' });
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe(`${API_BASE}/domadores`);
      expect(JSON.parse(opts.body)).toEqual({ nombre: 'Luis' });
    });

    test('`evento` va como número, no como el string que daría 400', async () => {
      fetch.mockResolvedValueOnce(okJson([]));
      await buscarJinetes({ documento: '9', evento: '9059001' });
      expect(JSON.parse(fetch.mock.calls[0][1].body).evento).toBe(9059001);
    });

    test('un evento que el backend rechazaría se omite en vez de mandarse', async () => {
      // 0, negativos, decimales y null dan 400. Antes, con querystring, un
      // evento ausente simplemente no llegaba; mandarlo como null rompería una
      // búsqueda que hoy funciona.
      for (const evento of [undefined, null, '', 0, -1, 1.5, 'abc', NaN]) {
        fetch.mockResolvedValueOnce(okJson([]));
        await buscarJinetes({ documento: '9', evento });
        const body = JSON.parse(fetch.mock.calls.pop()[1].body);
        expect(body).not.toHaveProperty('evento');
      }
    });

    test('ningún campo vacío se manda como null ni como cadena vacía', async () => {
      fetch.mockResolvedValueOnce(okJson([]));
      await buscarJinetes({ nombre: '', apellido: null, documento: undefined, evento: 1 });
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body).toEqual({ evento: 1 });
      for (const v of Object.values(body)) expect(v).not.toBeNull();
    });
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

  test('los choques de equipo hablan de categoría, no de prueba', () => {
    // Las dos reglas son por prueba + categoría: un equipo anotado en otra
    // categoría de la misma prueba no molesta. Decir «en esta prueba» mandaba
    // al socio a cambiar la prueba entera.
    expect(textoErrorInscripcion('EquipoOcupado')).toMatch(/en esta categoría/);
    expect(textoErrorInscripcion('AnimalEnOtroEquipo')).toMatch(/en esta categoría/);
    expect(textoErrorInscripcion('EquipoOcupado')).not.toMatch(/en esta prueba/);
    expect(textoErrorInscripcion('AnimalEnOtroEquipo')).not.toMatch(/en esta prueba/);
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

describe('crear equipo (POST /equipos)', () => {
  test('integranteAPayload admite el castrado, que la yunta no', () => {
    // El sexo es la etiqueta que eligió el socio, no la tabla: cuatro de cada
    // diez integrantes reales son castrados en IdPdre.
    expect(integranteAPayload({ id: 'pdre:134355' }, 0)).toEqual({ tabla: 'IdPdre', id: 134355, sexo: 0 });
    expect(integranteAPayload({ id: 'pdre:134355' }, 1)).toEqual({ tabla: 'IdPdre', id: 134355, sexo: 1 });
    expect(integranteAPayload({ id: 'extr:6703' }, 0)).toEqual({ tabla: 'IdExtr', id: 6703, sexo: 0 });
    expect(integranteAPayload({ id: 'extr:6703' }, 2)).toEqual({ tabla: 'IdExtr', id: 6703, sexo: 2 });
  });

  test('integranteAPayload fuerza el 2 de Exis y rechaza lo que no puede armar', () => {
    // Un par tabla/sexo incoherente da 400.
    expect(integranteAPayload({ id: 'exis:9059010' }, 1)).toEqual({ tabla: 'IdExis', id: 9059010, sexo: 2 });
    expect(integranteAPayload({ id: 'pdre:1' }, null)).toBeNull();
    expect(integranteAPayload({ id: '9059010' }, 1)).toBeNull();
    expect(integranteAPayload(null, 1)).toBeNull();
  });

  test('mapEquipoCreado devuelve el equipo del 201 listo para elegir', () => {
    const e = mapEquipoCreado({
      equipo: {
        id: 40, nombre: 'LOS FRASQUEADOS', anio: 2026,
        animales: [{ id: 'exis:1', nombre: 'UNA', sba: '1', sexo: 2, jinete: { id: 7, nombre: 'Ana', apellido: 'Gómez' } }],
        habilitado: true, jinetes_inhabilitados: [], bloqueado: false, bloqueado_por: null,
      },
    });
    expect(e).toMatchObject({ id: 40, nombre: 'LOS FRASQUEADOS', habilitado: true, incompleto: false });
    expect(e.animales[0].jinete.apellido).toBe('Gómez');
  });

  test('mapEquipoCreado marca incompleto el 201 que trae sólo el id', () => {
    // Si el equipo se creó pero la lectura posterior falló viene {equipo: {id}}:
    // mapearlo como equipo daría un trío vacío y habilitado.
    const e = mapEquipoCreado({ equipo: { id: 40 } });
    expect(e).toEqual({ id: 40, incompleto: true });
    expect(mapEquipoCreado({})).toBeNull();
  });

  test('cada código del 422 de equipos tiene su texto, distinto del de la prueba', () => {
    const codigos = [
      'NombreFaltante', 'NombreRepetido', 'AnimalFaltante', 'JineteFaltante',
      'AnimalInexistente', 'JineteNoDisponible', 'AnimalRepetido', 'EquipoDuplicado', 'AnimalAjeno',
    ];
    const generico = textoErrorEquipo('CodigoQueNoExiste');
    codigos.forEach((c) => expect(textoErrorEquipo(c)).not.toBe(generico));
    // JineteFaltante habla del integrante del equipo, no de la prueba.
    expect(textoErrorEquipo('JineteFaltante')).not.toBe(textoErrorInscripcion('JineteFaltante'));
    expect(describirErroresEquipo([{ codigo: 'NombreRepetido', campo: 'nombre' }])).toEqual([
      { codigo: 'NombreRepetido', texto: textoErrorEquipo('NombreRepetido'), campo: 'nombre' },
    ]);
    expect(describirErroresEquipo(null)).toEqual([]);
  });

  describe('request', () => {
    beforeEach(() => { clearSession(); global.fetch = jest.fn(); setSession(viva()); });
    afterEach(() => { clearSession(); delete global.fetch; });

    test('crearEquipo postea a /equipos con el token y el payload tal cual', async () => {
      fetch.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ equipo: { id: 40 } }) });
      const payload = {
        nombre: 'LOS FRASQUEADOS', evento: 2130, prueba: 6, categoria: 15,
        animales: [
          { animal: { tabla: 'IdExis', id: 9059010, sexo: 2 }, jinete: 7 },
          { animal: { tabla: 'IdPdre', id: 134355, sexo: 0 }, jinete: 8 },
          { animal: { tabla: 'IdExtr', id: 6703, sexo: 1 }, jinete: 9 },
        ],
      };
      await crearEquipo(payload);
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe(`${API_BASE}/equipos`);
      expect(opts.method).toBe('POST');
      expect(opts.headers.Authorization).toBe('Bearer acc1');
      expect(JSON.parse(opts.body)).toEqual(payload);
    });

    test('el 422 de equipos llega con su propio code y sus códigos', async () => {
      // `equipo_invalido`, no `inscripcion_invalida`: otra pantalla, otra tabla.
      fetch.mockResolvedValueOnce({
        ok: false, status: 422,
        json: async () => ({
          error: true, status: 422, message: 'x', code: 'equipo_invalido',
          errores: [{ codigo: 'NombreRepetido', campo: 'nombre' }, { codigo: 'AnimalAjeno', campo: 'animales' }],
        }),
      });
      await expect(crearEquipo({})).rejects.toMatchObject({
        status: 422, code: 'equipo_invalido',
        errores: [{ codigo: 'NombreRepetido' }, { codigo: 'AnimalAjeno' }],
      });
    });
  });
});
