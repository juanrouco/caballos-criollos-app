// Cuántas categorías de una misma prueba se pueden elegir (§2 de «Reglas de la
// pantalla de pruebas»):
//
//   Por prueba, a lo sumo UNA categoría «común», más cualquier cantidad de
//   «propias».
//
// Una categoría propia tiene su propio SI/NO y se marca junto con otras de la
// misma prueba; las comunes comparten un grupo de radios y se elige una sola.
//
// Cuál es propia lo dice la API, en el `propia` de cada categoría de
// `GET /inscripciones/eventos/{id}/opciones`: lo calcula la misma función que el
// POST usa para el 422 `PruebaCategoriaUnica`, con el evento de la consulta. No
// se replica acá — la regla tiene cuatro cláusulas y una depende del evento, así
// que una copia en la app se desincroniza sin que nadie se entere. Lo único que
// vive en este archivo es qué queda elegido al tocar una categoría.

// Qué categorías de una prueba quedan marcadas al tocar una, dado lo que ya
// estaba elegido. `categorias` son las de esa prueba, como las devuelve
// `mapOpciones` (cada una con su `propia`); `elegidas` y el resultado son ids.
//
//  - ya estaba ⇒ se destilda
//  - propia ⇒ se suma a lo que haya
//  - común ⇒ se suma y saca la común anterior, si había (una sola por prueba)
export function alternarCategoria(categorias, elegidas, categoriaId) {
  if (elegidas.includes(categoriaId)) return elegidas.filter((c) => c !== categoriaId);
  const propia = (id) => !!categorias.find((c) => c.id === id)?.propia;
  if (propia(categoriaId)) return [...elegidas, categoriaId];
  return [...elegidas.filter(propia), categoriaId];
}
