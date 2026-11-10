import { fetchNotificaciones, mapNotificacion, isUnreadSince } from '../../src/api/notificaciones';
import { API_BASE } from '../../src/api/client';
import { setSession, clearSession } from '../../src/api/session';

// Con sesión el listado trae las generales MÁS las personales del socio, y eso
// depende enteramente de que el pedido lleve el Bearer: sin header, el backend
// no tiene de dónde saber de quién es el teléfono.
describe('fetchNotificaciones', () => {
  beforeEach(() => { global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ data: [] }) })); clearSession(); });
  afterEach(() => { delete global.fetch; clearSession(); });

  test('sin sesión pide sólo las generales, sin Authorization', async () => {
    await fetchNotificaciones({ limit: 20 });
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/notificaciones?limit=20`);
    expect(opts?.headers).toBeUndefined();
  });

  test('con sesión va con Bearer', async () => {
    setSession({ accessToken: 'AT-1', refreshToken: 'RT-1', expiresAt: Date.now() + 60_000, usuarioId: 7 });
    await fetchNotificaciones({ since: '2026-11-10 09:00:00', limit: 1 });
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/notificaciones?since=');
    expect(opts.headers.Authorization).toBe('Bearer AT-1');
  });
});


describe('mapNotificacion', () => {
  const base = {
    id: 1,
    titulo: 'Empezó la transmisión',
    cuerpo: 'Aparte vacuno está al aire ahora',
    tipo: 'vivo',
    target: { tipo: 'vivo', id: '2', url: null },
    imagen_url: null,
    fecha: '2026-06-08 13:11:58',
  };

  test('mapea el shape del backend al cliente', () => {
    const n = mapNotificacion(base);
    expect(n.id).toBe(1);
    expect(n.titulo).toBe('Empezó la transmisión');
    expect(n.cuerpo).toBe('Aparte vacuno está al aire ahora');
    expect(n.tipo).toBe('vivo');
    expect(n.target).toEqual({ tipo: 'vivo', id: '2', url: null });
    expect(n.imagen).toBe(null);
    expect(n.fecha).toBe('2026-06-08 13:11:58');
  });

  test('formatea fecha con hora a "D MMM · HH:MM"', () => {
    expect(mapNotificacion(base).fechaLabel).toBe('8 Jun · 13:11');
  });

  test('formatea fecha sin hora a "D MMM"', () => {
    expect(mapNotificacion({ ...base, fecha: '2026-12-03' }).fechaLabel).toBe('3 Dic');
  });

  test('fecha vacía → fechaLabel vacío', () => {
    expect(mapNotificacion({ ...base, fecha: '' }).fechaLabel).toBe('');
    expect(mapNotificacion({ ...base, fecha: null }).fechaLabel).toBe('');
  });

  test('fecha mal formada → fechaLabel vacío', () => {
    expect(mapNotificacion({ ...base, fecha: 'ayer' }).fechaLabel).toBe('');
  });

  test('tipo default es "generico" si la API no lo manda', () => {
    expect(mapNotificacion({ id: 1 }).tipo).toBe('generico');
  });

  test('target null se preserva (notif sin deeplink)', () => {
    expect(mapNotificacion({ ...base, target: null }).target).toBe(null);
  });

  test('imagen_url → imagen', () => {
    expect(mapNotificacion({ ...base, imagen_url: 'https://x/a.jpg' }).imagen).toBe('https://x/a.jpg');
  });
});

describe('isUnreadSince', () => {
  // El backend manda fechas en hora Argentina (UTC-3) sin TZ. El helper
  // las normaliza a UTC para comparar contra el lastSeenAt (ISO con Z).
  test('notif posterior al snapshot → true', () => {
    // 2026-06-08 13:11:58 ART = 2026-06-08T16:11:58Z
    expect(isUnreadSince('2026-06-08 13:11:58', '2026-06-08T16:00:00.000Z')).toBe(true);
  });

  test('notif anterior al snapshot → false', () => {
    expect(isUnreadSince('2026-06-08 13:11:58', '2026-06-08T17:00:00.000Z')).toBe(false);
  });

  test('snapshot null/undefined → false (todo se considera visto)', () => {
    expect(isUnreadSince('2026-06-08 13:11:58', null)).toBe(false);
    expect(isUnreadSince('2026-06-08 13:11:58', undefined)).toBe(false);
    expect(isUnreadSince('2026-06-08 13:11:58', '')).toBe(false);
  });

  test('fecha mal formada → false', () => {
    expect(isUnreadSince('', '2026-06-08T16:00:00.000Z')).toBe(false);
    expect(isUnreadSince(null, '2026-06-08T16:00:00.000Z')).toBe(false);
    expect(isUnreadSince('ayer', '2026-06-08T16:00:00.000Z')).toBe(false);
  });

  test('snapshot inválido → false', () => {
    expect(isUnreadSince('2026-06-08 13:11:58', 'no-es-fecha')).toBe(false);
  });

  test('exactamente igual → false (no la marcamos como nueva)', () => {
    // 2026-06-08 13:00:00 ART = 2026-06-08T16:00:00Z
    expect(isUnreadSince('2026-06-08 13:00:00', '2026-06-08T16:00:00.000Z')).toBe(false);
  });
});
