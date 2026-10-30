import { apiGetAuth, API_BASE } from '../../src/api/client';
import { login, logout, cambiarClave } from '../../src/api/auth';
import { getSession, setSession, clearSession, accessExpired } from '../../src/api/session';

const okJson  = (body) => ({ ok: true, status: 200, json: async () => body });
const errJson = (status, body) => ({ ok: false, status, json: async () => body });

// Shape de /auth/login, /auth/refresh y /auth/clave (los tres iguales).
const SESION = (over) => ({
  access_token: 'acc1',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: 'ref1',
  refresh_expires_in: 7776000,
  usuario: { id: 1234 },
  ...over,
});

const viva    = () => ({ accessToken: 'acc1', refreshToken: 'ref1', expiresAt: Date.now() + 3600e3, usuarioId: 1234 });
const vencida = () => ({ accessToken: 'viejo', refreshToken: 'ref1', expiresAt: Date.now() - 1000, usuarioId: 1234 });

beforeEach(() => {
  clearSession();
  global.fetch = jest.fn();
});
afterEach(() => {
  clearSession();
  delete global.fetch;
});

describe('login', () => {
  test('guarda la sesión mapeada y trimea el usuario', async () => {
    fetch.mockResolvedValueOnce(okJson(SESION()));
    await login('  Socio@Ejemplo.com  ', 'su clave');

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/auth/login`);
    expect(JSON.parse(opts.body)).toEqual({ usuario: 'Socio@Ejemplo.com', clave: 'su clave' });
    expect(getSession()).toMatchObject({ accessToken: 'acc1', refreshToken: 'ref1', usuarioId: 1234 });
    // expires_in (segundos) se guarda como epoch en ms.
    expect(getSession().expiresAt).toBeGreaterThan(Date.now());
  });

  test('401 (usuario, clave o cuenta deshabilitada): no deja sesión', async () => {
    fetch.mockResolvedValueOnce(errJson(401, { error: true, status: 401, message: 'No autenticado' }));
    await expect(login('socio', 'mala')).rejects.toMatchObject({ status: 401 });
    expect(getSession()).toBeNull();
  });

  test('403 email_no_verificado: el code y el mensaje del backend llegan al caller', async () => {
    fetch.mockResolvedValueOnce(errJson(403, {
      error: true, status: 403,
      message: 'Tenés que verificar tu email antes de entrar a la app',
      code: 'email_no_verificado',
    }));
    await expect(login('socio', 'buena')).rejects.toMatchObject({
      status: 403,
      code: 'email_no_verificado',
      detail: 'Tenés que verificar tu email antes de entrar a la app',
    });
    expect(getSession()).toBeNull();
  });

  test('409 cuenta_duplicada: idem, con su code', async () => {
    fetch.mockResolvedValueOnce(errJson(409, {
      error: true, status: 409, message: 'Cuenta duplicada: contactá a la asociación', code: 'cuenta_duplicada',
    }));
    await expect(login('socio', 'buena')).rejects.toMatchObject({ status: 409, code: 'cuenta_duplicada' });
  });
});

describe('requests protegidos', () => {
  test('mandan el access en Authorization: Bearer', async () => {
    setSession(viva());
    fetch.mockResolvedValueOnce(okJson({ perfil: { id: 1234 } }));
    await apiGetAuth('/perfil');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer acc1');
  });

  test('sin sesión fallan con 401 sin tocar la red', async () => {
    await expect(apiGetAuth('/perfil')).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('con el access vencido refrescan ANTES de salir, y guardan el refresh nuevo', async () => {
    setSession(vencida());
    fetch
      .mockResolvedValueOnce(okJson(SESION({ access_token: 'acc2', refresh_token: 'ref2' })))
      .mockResolvedValueOnce(okJson({ perfil: { id: 1234 } }));

    await apiGetAuth('/perfil');

    expect(fetch.mock.calls[0][0]).toBe(`${API_BASE}/auth/refresh`);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ refresh_token: 'ref1' });
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer acc2');
    // El refresh rota: si no guardamos el nuevo, el próximo refresh manda uno
    // ya usado y el servidor cierra la sesión entera.
    expect(getSession().refreshToken).toBe('ref2');
  });

  test('un 401 del endpoint dispara refresh + un reintento', async () => {
    setSession(viva());
    fetch
      .mockResolvedValueOnce(errJson(401, { message: 'No autenticado' }))
      .mockResolvedValueOnce(okJson(SESION({ access_token: 'acc2', refresh_token: 'ref2' })))
      .mockResolvedValueOnce(okJson({ perfil: { id: 1234 } }));

    const r = await apiGetAuth('/perfil');

    expect(r.perfil.id).toBe(1234);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer acc2');
  });

  test('dos requests en paralelo con el access vencido refrescan UNA sola vez', async () => {
    // El caso que puede cerrar la sesión del socio: dos refresh con el mismo
    // token y el segundo queda como "token robado".
    setSession(vencida());
    let resolverRefresh;
    const refreshEnVuelo = new Promise((res) => { resolverRefresh = res; });
    fetch
      .mockImplementationOnce(() => refreshEnVuelo)
      .mockResolvedValue(okJson({ data: [] }));

    const p1 = apiGetAuth('/perfil');
    const p2 = apiGetAuth('/inscripciones');
    resolverRefresh(okJson(SESION({ access_token: 'acc2', refresh_token: 'ref2' })));
    await Promise.all([p1, p2]);

    const refrescos = fetch.mock.calls.filter(([url]) => url === `${API_BASE}/auth/refresh`);
    expect(refrescos).toHaveLength(1);
    expect(getSession().accessToken).toBe('acc2');
  });

  test('si el refresh da 401, la sesión se pierde (la app vuelve al login)', async () => {
    setSession(vencida());
    fetch.mockResolvedValueOnce(errJson(401, { message: 'Token inválido' }));
    await expect(apiGetAuth('/perfil')).rejects.toMatchObject({ status: 401 });
    expect(getSession()).toBeNull();
  });

  test('un 401 que persiste después del refresh también pierde la sesión', async () => {
    setSession(viva());
    fetch
      .mockResolvedValueOnce(errJson(401, { message: 'No autenticado' }))
      .mockResolvedValueOnce(okJson(SESION({ access_token: 'acc2' })))
      .mockResolvedValueOnce(errJson(401, { message: 'No autenticado' }));

    await expect(apiGetAuth('/perfil')).rejects.toMatchObject({ status: 401 });
    expect(getSession()).toBeNull();
  });

  test('un 403 NO refresca ni pierde la sesión', async () => {
    setSession(viva());
    fetch.mockResolvedValueOnce(errJson(403, { message: 'Usuario no habilitado', code: 'usuario_no_habilitado' }));
    await expect(apiGetAuth('/perfil')).rejects.toMatchObject({ status: 403, code: 'usuario_no_habilitado' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getSession()).not.toBeNull();
  });

  test('sin red no pierde la sesión: se reintenta más tarde', async () => {
    setSession(vencida());
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(apiGetAuth('/perfil')).rejects.toThrow(/Sin conexión/);
    expect(getSession()).not.toBeNull();
  });
});

describe('logout', () => {
  test('manda el refresh y borra la sesión local (204 sin body)', async () => {
    setSession(viva());
    fetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => { throw new Error('sin body'); } });
    await logout();
    expect(fetch.mock.calls[0][0]).toBe(`${API_BASE}/auth/logout`);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ refresh_token: 'ref1' });
    expect(getSession()).toBeNull();
  });

  test('si el POST falla, la sesión local se borra igual', async () => {
    setSession(viva());
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await logout();
    expect(getSession()).toBeNull();
  });
});

describe('cambiarClave', () => {
  test('reemplaza la sesión por la que devuelve la API', async () => {
    setSession(viva());
    fetch.mockResolvedValueOnce(okJson(SESION({ access_token: 'acc3', refresh_token: 'ref3' })));

    await cambiarClave('la de hoy', 'Nueva-Clave-1');

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      clave_actual: 'la de hoy', clave_nueva: 'Nueva-Clave-1',
    });
    // El cambio cierra todas las sesiones, incluida la de este teléfono: si no
    // guardáramos el par nuevo, el socio quedaría afuera al toque.
    expect(getSession()).toMatchObject({ accessToken: 'acc3', refreshToken: 'ref3' });
  });

  test('clave_actual_incorrecta es 403: la sesión sigue viva', async () => {
    setSession(viva());
    fetch.mockResolvedValueOnce(errJson(403, {
      message: 'La clave actual no es correcta', code: 'clave_actual_incorrecta',
    }));
    await expect(cambiarClave('mal', 'Nueva-Clave-1')).rejects.toMatchObject({
      status: 403, code: 'clave_actual_incorrecta',
    });
    expect(getSession()).not.toBeNull();
  });
});

describe('accessExpired', () => {
  test('un access que vence dentro del margen de 30s ya cuenta como vencido', () => {
    setSession({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 10e3 });
    expect(accessExpired()).toBe(true);
  });

  test('sin expiresAt se usa hasta que el servidor diga 401', () => {
    setSession({ accessToken: 'a', refreshToken: 'r', expiresAt: null });
    expect(accessExpired()).toBe(false);
  });
});
