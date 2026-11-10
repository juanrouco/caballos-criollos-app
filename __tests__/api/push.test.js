// El registro del token es lo único que ata este teléfono a una cuenta, y lo
// hace por un solo camino: el Bearer. De ahí que estos tests miren los headers
// y el body del fetch en vez del valor de vuelta — lo que importa es con qué
// identidad salió el pedido.
import { registerPushToken, bajaPushToken } from '../../src/api/push';
import { API_BASE } from '../../src/api/client';
import { setSession, clearSession, getSession } from '../../src/api/session';

const okJson = (body) => ({ ok: true, json: async () => body });
const errJson = (status, body) => ({ ok: false, status, json: async () => body });

const APARATO = { token: 'ExponentPushToken[xyz]', plataforma: 'ios', device_id: 'IFV-1234' };

const abrirSesion = (over) => setSession({
  accessToken: 'AT-1', refreshToken: 'RT-1', expiresAt: Date.now() + 60_000, usuarioId: 7, ...over,
});

const pedido = (i = 0) => {
  const [url, opts] = fetch.mock.calls[i];
  return { url, headers: opts?.headers || {}, body: JSON.parse(opts?.body || 'null') };
};

beforeEach(() => { global.fetch = jest.fn(); clearSession(); });
afterEach(() => { delete global.fetch; clearSession(); });

describe('registerPushToken', () => {
  test('sin sesión va anónimo: nada de Authorization', async () => {
    fetch.mockResolvedValueOnce(okJson({ ok: true }));
    await registerPushToken(APARATO);
    const p = pedido();
    expect(p.url).toBe(`${API_BASE}/push/register`);
    expect(p.headers.Authorization).toBeUndefined();
    expect(p.body).toEqual(APARATO);
  });

  test('con sesión va con Bearer — es lo que ata el token a la cuenta', async () => {
    abrirSesion();
    fetch.mockResolvedValueOnce(okJson({ ok: true }));
    await registerPushToken(APARATO);
    expect(pedido().headers.Authorization).toBe('Bearer AT-1');
  });

  test('el body no lleva usuario_id, ni con sesión ni sin ella', async () => {
    // El backend saca la cuenta del token validado. Mandar el id sería elegir
    // nosotros a quién atar el teléfono.
    fetch.mockResolvedValue(okJson({ ok: true }));
    await registerPushToken(APARATO);
    abrirSesion();
    await registerPushToken(APARATO);
    expect(Object.keys(pedido(0).body).sort()).toEqual(['device_id', 'plataforma', 'token']);
    expect(Object.keys(pedido(1).body).sort()).toEqual(['device_id', 'plataforma', 'token']);
  });

  test('un access vencido se refresca antes de registrar, no cae en anónimo', async () => {
    abrirSesion({ expiresAt: Date.now() - 1000 });
    fetch
      .mockResolvedValueOnce(okJson({ access_token: 'AT-2', refresh_token: 'RT-2', expires_in: 3600 }))
      .mockResolvedValueOnce(okJson({ ok: true }));
    await registerPushToken(APARATO);
    expect(pedido(0).url).toBe(`${API_BASE}/auth/refresh`);
    expect(pedido(1).headers.Authorization).toBe('Bearer AT-2');
  });

  test('si la sesión se cae del todo, re-registra anónimo en vez de fallar', async () => {
    // 401 en el register → refresh → 401 también: la sesión está perdida. El
    // teléfono igual tiene que quedar registrado, sólo que sin cuenta.
    abrirSesion();
    fetch
      .mockResolvedValueOnce(errJson(401, { error: { message: 'Token inválido' } }))
      .mockResolvedValueOnce(errJson(401, { error: { message: 'Refresh vencido' } }))
      .mockResolvedValueOnce(okJson({ ok: true }));
    await registerPushToken(APARATO);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(getSession()).toBeNull();
    expect(pedido(2).url).toBe(`${API_BASE}/push/register`);
    expect(pedido(2).headers.Authorization).toBeUndefined();
  });

  test('un error que no es 401 se propaga: no se degrada a anónimo', async () => {
    // Un 500 no dice nada sobre la sesión. Registrar anónimo acá desataría un
    // token que estaba bien atado.
    abrirSesion();
    fetch.mockResolvedValueOnce(errJson(500, { error: { message: 'boom' } }));
    await expect(registerPushToken(APARATO)).rejects.toMatchObject({ status: 500 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getSession()).not.toBeNull();
  });
});

describe('bajaPushToken', () => {
  test('va sin Bearer aunque haya sesión: la baja es del aparato, no de la cuenta', async () => {
    abrirSesion();
    fetch.mockResolvedValueOnce(okJson({ ok: true }));
    await bajaPushToken({ device_id: 'IFV-1234' });
    const p = pedido();
    expect(p.url).toBe(`${API_BASE}/push/baja`);
    expect(p.headers.Authorization).toBeUndefined();
    expect(p.body).toEqual({ device_id: 'IFV-1234' });
  });
});
