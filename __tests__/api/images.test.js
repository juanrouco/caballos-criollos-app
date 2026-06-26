import { imgUrl } from '../../src/api/images';

describe('imgUrl', () => {
  test('null / undefined / vacío → null', () => {
    expect(imgUrl(null, 240)).toBeNull();
    expect(imgUrl(undefined, 240)).toBeNull();
    expect(imgUrl('', 240)).toBeNull();
  });

  test('sin width devuelve la base tal cual', () => {
    expect(imgUrl('https://x/api/img/noticias/a.png')).toBe('https://x/api/img/noticias/a.png');
    expect(imgUrl('https://x/api/img/noticias/a.png', 0)).toBe('https://x/api/img/noticias/a.png');
  });

  test('agrega ?w= cuando la base no tiene query', () => {
    expect(imgUrl('https://x/api/img/noticias/a.png', 240))
      .toBe('https://x/api/img/noticias/a.png?w=240');
  });

  test('agrega &w= cuando la base ya tiene query', () => {
    expect(imgUrl('https://x/api/img/noticias/a.png?fmt=jpg', 800))
      .toBe('https://x/api/img/noticias/a.png?fmt=jpg&w=800');
  });

  test('redondea el width a entero', () => {
    expect(imgUrl('https://x/a.png', 239.6)).toBe('https://x/a.png?w=240');
  });
});
