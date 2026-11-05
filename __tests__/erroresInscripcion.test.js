import {
  textoEntradaInvalida,
  CAMPOS_ENTRADA_INVALIDA,
  textoServicio,
  CODIGOS_SERVICIO,
  SERVICIO_ALTA,
  textoErrorBaja,
  textoUsuario,
  CODIGOS_USUARIO,
  CODIGOS_BAJA,
  MOTIVOS_BAJA_CONOCIDOS,
} from '../src/erroresInscripcion';

// El 400 `entrada_invalida` trae un `message` para quien programa («rp en
// blanco o '0'»). La app lo traduce por `campo` y nunca por el texto: así una
// regla que cambia del lado del backend no obliga a tocar la app ni se le
// escapa jerga al socio.
describe('textoEntradaInvalida', () => {
  test('los campos que el socio tipeó le dicen qué revisar', () => {
    expect(textoEntradaInvalida('sba')).toMatch(/^Revisá el S\.B\.A\./);
    expect(textoEntradaInvalida('rp')).toMatch(/^Revisá el R\.P\./);
    expect(textoEntradaInvalida('renspa')).toMatch(/^Revisá el Renspa/);
  });

  test('un campo que la app arma sola no le pide nada al socio', () => {
    // evento, prueba, categoría y animal no los escribe nadie: si la API los
    // rechaza, el error es de la app y el texto no manda a buscar un dato.
    for (const campo of ['evento', 'prueba', 'categoria', 'animal', 'presentacion']) {
      const texto = textoEntradaInvalida(campo);
      expect(texto).toBe('No pudimos hacer esta consulta. Probá de nuevo y, si sigue, avisanos.');
      expect(texto).not.toMatch(/Revisá/);
    }
  });

  test('un campo desconocido cae en el mismo texto, no en undefined', () => {
    expect(textoEntradaInvalida('loQueVenga')).toBeTruthy();
    expect(textoEntradaInvalida(undefined)).toBeTruthy();
    expect(textoEntradaInvalida('')).toBeTruthy();
  });

  test('ningún texto repite la jerga del backend', () => {
    for (const campo of CAMPOS_ENTRADA_INVALIDA) {
      const texto = textoEntradaInvalida(campo);
      expect(texto).not.toMatch(/entero positivo|en blanco|se esperaba/);
    }
  });
});

describe('los 503 del servicio', () => {
  test('cada código tiene su texto, y ninguno cuenta qué falló por dentro', () => {
    for (const code of CODIGOS_SERVICIO) {
      const texto = textoServicio(code);
      expect(texto).toBeTruthy();
      expect(texto).not.toMatch(/lock|transacción|base de datos|escribir la inscripción/i);
    }
  });

  test('un código que no es de servicio no inventa texto', () => {
    // Así `mensaje()` sigue cayendo en el `detail` del backend para los
    // errores que sí están redactados para el socio (los de /auth, los 422).
    expect(textoServicio('inscripcion_invalida')).toBeNull();
    expect(textoServicio('')).toBeNull();
    expect(textoServicio(undefined)).toBeNull();
  });

  test('el del alta dice lo único que importa: que no quedó anotado', () => {
    // Es lo que decide si el socio reintenta o llama por teléfono.
    expect(SERVICIO_ALTA).toMatch(/no quedó nada anotado/);
    expect(SERVICIO_ALTA).toMatch(/de nuevo/);
  });
});

// La baja se ve recién después de que el socio apretó, así que estos textos
// tienen que contestar dos cosas: si quedó dada de baja, y qué hacer si no.
describe('los errores de eliminar una inscripción', () => {
  test('el motivo del 422 gana sobre el código, que sería el genérico', () => {
    const e = { status: 422, code: 'baja_no_permitida', motivo: 'con_resultados' };
    expect(textoErrorBaja(e)).toMatch(/resultados cargados/);
    expect(textoErrorBaja(e)).not.toMatch(/No pudimos eliminar/);
  });

  test('cada motivo dice qué pasó y, cuando hay, a quién recurrir', () => {
    for (const motivo of MOTIVOS_BAJA_CONOCIDOS) {
      const texto = textoErrorBaja({ status: 422, code: 'baja_no_permitida', motivo });
      expect(texto).toBeTruthy();
      expect(texto).not.toMatch(/plazo_cerrado|no_propietario|piso_no_medible|sin_evento/);
    }
  });

  test('el plazo cerrado manda a pedir la habilitación, que es la única salida', () => {
    expect(textoErrorBaja({ code: 'baja_no_permitida', motivo: 'plazo_cerrado' }))
      .toMatch(/habilitación para rehacer/);
  });

  test('cada código tiene su texto y ninguno repite la jerga del backend', () => {
    for (const code of CODIGOS_BAJA) {
      const texto = textoErrorBaja({ code });
      expect(texto).toBeTruthy();
      expect(texto).not.toMatch(/estado_no_permite|habilitacion_usada|usuario_solo_web|no_encontrada/);
    }
  });

  test('el 409 de carrera perdida se cuenta como resultado, no como falla', () => {
    // Otra baja la ganó: para el socio ya está, así que el texto lo manda a
    // mirar la lista y no a reintentar.
    expect(textoErrorBaja({ status: 409, code: 'estado_no_permite_baja' })).toMatch(/ya no está activa/);
  });

  test('el 409 no dice «eliminada»: también cubre una rechazada', () => {
    // El mismo código salta con Cancelada (0) y con Rechazada (3). Decirle al
    // socio que «ya estaba eliminada» sería falso en el segundo caso.
    expect(textoErrorBaja({ code: 'estado_no_permite_baja' })).not.toMatch(/eliminada/);
  });

  test('el 503 cae en el texto de servicio y no en el genérico de la baja', () => {
    expect(textoErrorBaja({ status: 503, code: 'mantenimiento' })).toBe(textoServicio('mantenimiento'));
    expect(textoErrorBaja({ status: 503, code: 'base_no_disponible' })).toBe(textoServicio('base_no_disponible'));
  });

  test('un código desconocido usa el detail del backend antes que inventar', () => {
    expect(textoErrorBaja({ status: 400, code: 'otra_cosa', detail: 'Texto de la API' })).toBe('Texto de la API');
    expect(textoErrorBaja({})).toMatch(/No pudimos eliminar/);
    expect(textoErrorBaja(undefined)).toMatch(/No pudimos eliminar/);
  });
});

// Los dos 403 que puede dar cualquier endpoint protegido. El `detail` del
// backend está en castellano, así que algo se veía; lo que no decía es qué
// hacer.
describe('los 403 de la cuenta', () => {
  test('el que no está habilitado dice a quién recurrir, que es lo que falta', () => {
    // «El usuario no está habilitado», que es lo que manda la API, deja al
    // socio sin saber qué hacer — y encima él no cambió nada: el access le
    // sobrevivió al estado de la cuenta.
    const texto = textoUsuario('usuario_no_habilitado');
    expect(texto).toMatch(/Asociación/);
    expect(texto).toMatch(/[Tt]u cuenta/);
  });

  test('el de la cuenta operativa manda a la web, y la nombra', () => {
    expect(textoUsuario('usuario_solo_web')).toMatch(/caballoscriollos\.com/);
  });

  test('ninguno repite la jerga ni habla en tercera persona del «usuario»', () => {
    for (const code of CODIGOS_USUARIO) {
      expect(textoUsuario(code)).not.toMatch(/El usuario|Este usuario/);
    }
  });

  test('un código que no es de cuenta devuelve null y no pisa al resto', () => {
    // Si no devolviera null, taparía los textos de las otras tablas al estar
    // primero en la cadena de `mensaje()`.
    expect(textoUsuario('entrada_invalida')).toBeNull();
    expect(textoUsuario('base_no_disponible')).toBeNull();
    expect(textoUsuario(undefined)).toBeNull();
  });

  test('eliminar los usa también, sin tener su propia copia', () => {
    expect(textoErrorBaja({ status: 403, code: 'usuario_solo_web' })).toBe(textoUsuario('usuario_solo_web'));
    expect(textoErrorBaja({ status: 403, code: 'usuario_no_habilitado' })).toBe(textoUsuario('usuario_no_habilitado'));
  });
});
