import { mapNoticia } from '../../src/api/noticias';

describe('mapNoticia', () => {
  test('formatea fecha YYYY-MM-DD a "D MMM"', () => {
    const n = mapNoticia({
      id: 10,
      titulo: 'Una noticia',
      fecha: '2026-05-05',
      categoria: { id: 7, nombre: 'Eventos' },
      destacado: true,
      fijo: false,
      imagen: { big: 'big.jpg', thumb: 'thumb.jpg' },
    });
    expect(n.id).toBe(10);
    expect(n.title).toBe('Una noticia');
    expect(n.date).toBe('5 May');
    expect(n.tag).toBe('Eventos');
    expect(n.thumb).toBe('thumb.jpg');
    expect(n.destacado).toBe(true);
    expect(n.fijo).toBe(false);
  });

  test('prefiere imagen.optimizada (con ?w=240) sobre thumb/big legacy', () => {
    const n = mapNoticia({
      id: 1, titulo: 'X', fecha: '2026-01-01',
      imagen: {
        big: 'big.jpg',
        thumb: 'thumb.jpg',
        optimizada: 'https://caballoscriollos.com/api/img/noticias/foo.png',
      },
    });
    expect(n.thumb).toBe('https://caballoscriollos.com/api/img/noticias/foo.png?w=240');
  });

  test('cae a imagen.big si no hay thumb', () => {
    const n = mapNoticia({ id: 1, titulo: 'X', fecha: '2026-01-01', imagen: { big: 'b.jpg' } });
    expect(n.thumb).toBe('b.jpg');
  });

  test('thumb queda null si imagen es null o no viene', () => {
    expect(mapNoticia({ id: 1, titulo: 'X', fecha: '2026-01-01', imagen: null }).thumb).toBe(null);
    expect(mapNoticia({ id: 1, titulo: 'X', fecha: '2026-01-01' }).thumb).toBe(null);
  });

  test('tag queda vacío si la API devuelve categoria_id sin objeto', () => {
    const n = mapNoticia({ id: 1, titulo: 'X', fecha: '2026-01-01', categoria_id: 7 });
    expect(n.tag).toBe('');
  });

  test('fecha inválida → date vacío', () => {
    const n = mapNoticia({ id: 1, titulo: 'X', fecha: '' });
    expect(n.date).toBe('');
  });

  test('booleans destacado / fijo se normalizan', () => {
    const n = mapNoticia({ id: 1, titulo: 'X', fecha: '2026-01-01' });
    expect(n.destacado).toBe(false);
    expect(n.fijo).toBe(false);
  });
});

describe('fetchNoticiaCategorias (cache a nivel módulo)', () => {
  // Por el cache global, este test resetea el módulo antes de cada caso.
  let fetchNoticiaCategorias;
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    ({ fetchNoticiaCategorias } = require('../../src/api/noticias'));
  });
  afterEach(() => {
    delete global.fetch;
  });

  test('hace una sola request aunque se invoque dos veces', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 1, nombre: 'A' }] }) });
    const a = await fetchNoticiaCategorias();
    const b = await fetchNoticiaCategorias();
    expect(a).toEqual({ data: [{ id: 1, nombre: 'A' }] });
    expect(b).toBe(a); // misma referencia cacheada
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('si la primera falla, deja reintentar en la siguiente llamada', async () => {
    fetch.mockRejectedValueOnce(new Error('boom'));
    await expect(fetchNoticiaCategorias()).rejects.toThrow('boom');
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });
    const r = await fetchNoticiaCategorias();
    expect(r).toEqual({ data: [] });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('múltiples llamadas concurrentes comparten la misma promise en vuelo', async () => {
    let resolveFetch;
    fetch.mockReturnValueOnce(new Promise((res) => { resolveFetch = res; }));
    const p1 = fetchNoticiaCategorias();
    const p2 = fetchNoticiaCategorias();
    resolveFetch({ ok: true, json: async () => ({ data: [{ id: 7 }] }) });
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toEqual({ data: [{ id: 7 }] });
    expect(b).toBe(a);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
