import {
  textoEntradaInvalida,
  CAMPOS_ENTRADA_INVALIDA,
  textoServicio,
  CODIGOS_SERVICIO,
  SERVICIO_ALTA,
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
