import { esPropia, alternarCategoria } from '../src/reglasAlta';

// La regla: por prueba, una sola categoría «común» más cualquier cantidad de
// «propias». El POST la verifica (422 PruebaCategoriaUnica); acá se chequea que
// la app no ofrezca una combinación que el servidor va a rechazar.

describe('esPropia', () => {
  test('todas las categorías de F.Z.B. son propias', () => {
    expect(esPropia(1, 101)).toBe(true);
    expect(esPropia(1, 102)).toBe(true);
  });

  test('la 22 (¼ de final) y la 40 (Paleteada Campera) son propias en cualquier prueba', () => {
    expect(esPropia(3, 22)).toBe(true);
    expect(esPropia(9, 40)).toBe(true);
  });

  test('el resto es común', () => {
    expect(esPropia(3, 12)).toBe(false);
    expect(esPropia(9, 7)).toBe(false);
  });

  test('ids como string también, que es como pueden llegar de la API', () => {
    expect(esPropia('1', '101')).toBe(true);
    expect(esPropia('3', '22')).toBe(true);
    expect(esPropia('3', '12')).toBe(false);
  });
});

describe('alternarCategoria', () => {
  test('una común reemplaza a la común anterior', () => {
    expect(alternarCategoria(3, [12], 13)).toEqual([13]);
  });

  test('una propia se suma a la común que ya estaba', () => {
    expect(alternarCategoria(3, [12], 22)).toEqual([12, 22]);
  });

  test('la común no saca a las propias ya elegidas', () => {
    expect(alternarCategoria(3, [22, 12], 13)).toEqual([22, 13]);
  });

  test('las propias se acumulan sin límite', () => {
    const uno = alternarCategoria(1, [], 101);
    const dos = alternarCategoria(1, uno, 102);
    expect(alternarCategoria(1, dos, 103)).toEqual([101, 102, 103]);
  });

  test('tocar una ya elegida la destilda, sea común o propia', () => {
    expect(alternarCategoria(3, [12, 22], 12)).toEqual([22]);
    expect(alternarCategoria(3, [12, 22], 22)).toEqual([12]);
  });
});
