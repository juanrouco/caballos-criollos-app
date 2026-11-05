import { mapCarnet, mapVerificacion, verificarSocio, descargarCarnetPdf } from '../../src/api/carnet';
import { API_BASE } from '../../src/api/client';
import { setSession, clearSession } from '../../src/api/session';

const okJson = (body) => ({ ok: true, json: async () => body });
const errJson = (status, body) => ({ ok: false, status, json: async () => body });

beforeEach(() => { global.fetch = jest.fn(); clearSession(); });
afterEach(() => { delete global.fetch; clearSession(); });

describe('mapCarnet', () => {
  test('toma la url del QR y desde cuándo vale el token', () => {
    expect(mapCarnet({ carnet: { url: 'https://api.x/v/0f1e', emitido: '2026-10-28 14:05:31' } }))
      .toEqual({ url: 'https://api.x/v/0f1e', emitido: '2026-10-28 14:05:31' });
  });

  test('sin url no hay carnet, y no se inventa uno vacío', () => {
    // La url es lo único que lleva el token: sin ella no hay nada que mostrar.
    expect(mapCarnet({ carnet: { emitido: '2026-10-28 14:05:31' } })).toBeNull();
    expect(mapCarnet({})).toBeNull();
    expect(mapCarnet(undefined)).toBeNull();
  });
});

describe('verificarSocio', () => {
  test('un carnet válido trae sólo nombre, número y categoría', async () => {
    fetch.mockResolvedValueOnce(okJson({
      socio: { nombre: 'Juan Pérez', numero: '3072', categoria: 'Activo' }, valido: true,
    }));
    const r = await verificarSocio('0f1e2d3c4b5a69788796a5b4c3d2e1f0');
    expect(r).toEqual({ valido: true, socio: { nombre: 'Juan Pérez', numero: '3072', categoria: 'Activo' } });
    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/socios/verificacion/0f1e2d3c4b5a69788796a5b4c3d2e1f0`);
  });

  test('el 404 es un veredicto, no una falla: devuelve valido false', async () => {
    // Mal formado, inexistente, rotado o de una cuenta que dejó de calificar
    // dan el MISMO 404, y sin el envelope de error. Si esto tirara, la
    // pantalla no podría distinguir «no vale» de «no pude consultar».
    fetch.mockResolvedValueOnce(errJson(404, { valido: false }));
    await expect(verificarSocio('rotado')).resolves.toEqual({ valido: false, socio: null });
  });

  test('el 429 sí es falla: en el predio puede venir de otro teléfono', async () => {
    // Cuenta por IP, y con CGNAT muchos salen por la misma. No significa que
    // el carnet esté mal, así que no puede confundirse con el 404.
    fetch.mockResolvedValueOnce(errJson(429, { error: true, status: 429, message: 'Demasiadas consultas' }));
    await expect(verificarSocio('x')).rejects.toMatchObject({ status: 429 });
  });

  test('el 500 y el 503 del servidor también tiran', async () => {
    // La base caída da hoy 500 y no 503 (defecto conocido del backend), así
    // que los dos tienen que llegar como error y no como «no vale».
    fetch.mockResolvedValueOnce(errJson(500, { error: true, status: 500, message: 'Internal Server Error' }));
    await expect(verificarSocio('x')).rejects.toMatchObject({ status: 500 });
    fetch.mockResolvedValueOnce(errJson(503, { error: true, status: 503, message: 'x' }));
    await expect(verificarSocio('x')).rejects.toMatchObject({ status: 503 });
  });

  test('un 200 sin valido se trata como no válido', async () => {
    expect(mapVerificacion({ socio: { nombre: 'X' } })).toEqual({ valido: false, socio: null });
  });

  test('la categoría puede venir null y no rompe', async () => {
    fetch.mockResolvedValueOnce(okJson({ socio: { nombre: 'Ana', numero: '12', categoria: null }, valido: true }));
    expect((await verificarSocio('x')).socio.categoria).toBeNull();
  });
});

describe('descargarCarnetPdf', () => {
  test('baja con el Bearer, igual que el certificado', async () => {
    setSession({ accessToken: 'acc1', refreshToken: 'ref1', expiresAt: Date.now() + 3600e3 });
    const descargar = jest.fn(async () => 'file:///cache/carnet.pdf');
    await expect(descargarCarnetPdf(descargar)).resolves.toBe('file:///cache/carnet.pdf');
    expect(descargar).toHaveBeenCalledWith(`${API_BASE}/perfil/carnet.pdf`, { Authorization: 'Bearer acc1' });
  });

  test('si el downloader no devuelve archivo, es un error y no un éxito vacío', async () => {
    setSession({ accessToken: 'acc1', refreshToken: 'ref1', expiresAt: Date.now() + 3600e3 });
    await expect(descargarCarnetPdf(async () => null)).rejects.toThrow(/No se pudo bajar el carnet/);
  });
});
