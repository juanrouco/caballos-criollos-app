import { apiGet, API_BASE } from '../../src/api/client';

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
});
