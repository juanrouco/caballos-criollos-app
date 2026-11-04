import { apiGet, apiPost, API_BASE, OFFLINE_MSG, RESPUESTA_RARA_MSG } from '../../src/api/client';

const okJson = (body) => ({ ok: true, json: async () => body });
const errJson = (status, body) => ({
  ok: false,
  status,
  json: async () => body,
});

beforeEach(() => {
  global.fetch = jest.fn();
});
afterEach(() => {
  delete global.fetch;
});

describe('apiGet', () => {
  test('arma la URL sin query cuando no se pasan params', async () => {
    fetch.mockResolvedValueOnce(okJson({ ok: 1 }));
    await apiGet('/eventos');
    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/eventos`);
  });

  test('arma query string a partir de params, ignorando undefined / null / ""', async () => {
    fetch.mockResolvedValueOnce(okJson({ ok: 1 }));
    await apiGet('/eventos', {
      sort: 'fecha_asc',
      limit: 20,
      offset: 0,
      titulo: undefined,
      provincia: null,
      vacio: '',
    });
    const [url] = fetch.mock.calls[0];
    expect(url.startsWith(`${API_BASE}/eventos?`)).toBe(true);
    const qs = url.split('?')[1];
    const params = new URLSearchParams(qs);
    expect(params.get('sort')).toBe('fecha_asc');
    expect(params.get('limit')).toBe('20');
    expect(params.get('offset')).toBe('0');
    expect(params.has('titulo')).toBe(false);
    expect(params.has('provincia')).toBe(false);
    expect(params.has('vacio')).toBe(false);
  });

  test('devuelve el body parseado en respuestas ok', async () => {
    const body = { data: [{ id: 1 }], meta: { total: 1 } };
    fetch.mockResolvedValueOnce(okJson(body));
    const res = await apiGet('/eventos');
    expect(res).toEqual(body);
  });

  test('lanza con HTTP <status> + message del backend en respuestas no-ok', async () => {
    fetch.mockResolvedValueOnce(errJson(404, { message: 'Animal no encontrado' }));
    await expect(apiGet('/animales/x')).rejects.toThrow(
      /\/animales\/x → HTTP 404: Animal no encontrado/,
    );
  });

  test('tolera body de error que no es JSON parseable', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    });
    await expect(apiGet('/eventos')).rejects.toThrow(/HTTP 500/);
  });

  test('falla de red (fetch rechaza): traduce el TypeError a OFFLINE_MSG', async () => {
    // Sin internet, fetch tira TypeError('Network request failed').
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(apiGet('/eventos')).rejects.toThrow(OFFLINE_MSG);
  });

  test('un HTTP 500 NO se confunde con offline (sigue mostrando el status, no OFFLINE_MSG)', async () => {
    fetch.mockResolvedValueOnce(errJson(500, {}));
    await expect(apiGet('/eventos')).rejects.toThrow(/HTTP 500/);
  });
});

describe('apiPost', () => {
  test('falla de red: también traduce a OFFLINE_MSG', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(apiPost('/push/register', { token: 'x' })).rejects.toThrow(OFFLINE_MSG);
  });
});

describe('un 2xx que no trae JSON', () => {
  // Pasó de verdad: `GET /inscripciones/yunta-candidatos` con un sba no
  // numérico devolvía status 200 con la página HTML de un fatal de PHP, y la
  // pantalla terminaba mostrando «JSON Parse error: Unexpected character: <».
  const html200 = () => ({
    ok: true, status: 200,
    json: async () => { throw new SyntaxError('JSON Parse error: Unexpected character: <'); },
  });

  test('apiGet lo convierte en un ApiError con un mensaje legible', async () => {
    fetch.mockResolvedValueOnce(html200());
    await expect(apiGet('/inscripciones/yunta-candidatos')).rejects.toThrow(RESPUESTA_RARA_MSG);
  });

  test('apiPost tampoco lo hace pasar por una respuesta vacía', async () => {
    fetch.mockResolvedValueOnce(html200());
    await expect(apiPost('/inscripciones', { a: 1 })).rejects.toThrow(RESPUESTA_RARA_MSG);
  });

  test('un 204 sigue valiendo vacío: no trae cuerpo a propósito', async () => {
    fetch.mockResolvedValueOnce({
      ok: true, status: 204,
      json: async () => { throw new Error('sin body'); },
    });
    await expect(apiPost('/auth/logout', { refresh_token: 'r' })).resolves.toEqual({});
  });
});
