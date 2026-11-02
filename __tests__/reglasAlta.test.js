import { alternarCategoria } from '../src/reglasAlta';

// La regla: por prueba, una sola categoría «común» más cualquier cantidad de
// «propias». Cuál es cuál lo dice el `propia` que trae la API; acá se chequea
// que la app no ofrezca una combinación que el servidor va a rechazar con 422
// PruebaCategoriaUnica.

// Las categorías de una prueba, como las deja mapOpciones.
const CATS = [
  { id: 10, nombre: 'Mayor', propia: false },
  { id: 24, nombre: 'Menor', propia: false },
  { id: 22, nombre: '¼ de final', propia: true },
  { id: 40, nombre: 'Paleteada Campera', propia: true },
];

describe('alternarCategoria', () => {
  test('una común reemplaza a la común anterior', () => {
    expect(alternarCategoria(CATS, [10], 24)).toEqual([24]);
  });

  test('una propia se suma a la común que ya estaba', () => {
    expect(alternarCategoria(CATS, [10], 22)).toEqual([10, 22]);
  });

  test('la común no saca a las propias ya elegidas', () => {
    expect(alternarCategoria(CATS, [22, 10], 24)).toEqual([22, 24]);
  });

  test('las propias se acumulan sin límite', () => {
    const todas = [
      { id: 101, propia: true }, { id: 102, propia: true }, { id: 103, propia: true },
    ];
    const uno = alternarCategoria(todas, [], 101);
    const dos = alternarCategoria(todas, uno, 102);
    expect(alternarCategoria(todas, dos, 103)).toEqual([101, 102, 103]);
  });

  test('tocar una ya elegida la destilda, sea común o propia', () => {
    expect(alternarCategoria(CATS, [10, 22], 10)).toEqual([22]);
    expect(alternarCategoria(CATS, [10, 22], 22)).toEqual([10]);
  });

  test('una categoría que no está en la lista se trata como común', () => {
    // No debería pasar, pero si pasa conviene el lado seguro: una sola. Lo
    // contrario inscribiría dos comunes y el POST daría 422.
    expect(alternarCategoria(CATS, [10], 999)).toEqual([999]);
  });
});
