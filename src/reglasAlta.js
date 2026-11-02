// Reglas del alta que la app tiene que saber porque la API no las expone.
//
// Cuántas categorías de una misma prueba se pueden elegir (§2 de «Reglas de la
// pantalla de pruebas»):
//
//   Por prueba, a lo sumo UNA categoría «común», más cualquier cantidad de
//   «propias».
//
// Una categoría propia tiene su propio SI/NO y se marca junto con otras de la
// misma prueba; las comunes comparten un grupo de radios y se elige una sola.
// La web lo decide en `paso5:2166`, y el servidor repite esa cuenta en
// `ReglasInscripcion::PruebaConCategoriaPropia($prueba, $categoria, $evento)`
// antes de dar 422 PruebaCategoriaUnica.
//
// ⚠️ ESTO ES UN ESPEJO, NO LA FUENTE. `GET /inscripciones/eventos/{id}/opciones`
// devuelve `{id, nombre, habilitada, cupo, ocupacion, lista_espera}` por
// categoría y NO dice cuál es propia, así que los ids viven acá. En cuanto la
// API exponga el dato (un `propia` en cada categoría), esta tabla se borra y
// `esPropia` lee el campo: por eso está en un solo lugar y no repartida por la
// pantalla.
//
// Si la app se equivoca de más (marca propia una común), el POST lo frena con
// 422 `PruebaCategoriaUnica`. Si se equivoca de menos (trata una propia como
// común), nadie se queja: el socio simplemente no puede anotarse en algo que sí
// podría. Por eso conviene revisar esta tabla cuando aparezca una prueba nueva.

// F.Z.B.: todas sus categorías son propias.
const PRUEBAS_TODAS_PROPIAS = [1];

// La 22 (¼ de final) en cualquier prueba que la use; la 40 (Paleteada Campera),
// en Rodeos.
const CATEGORIAS_PROPIAS = [22, 40];

// Y una cláusula que depende del evento: la prueba 2 es propia SÓLO en el
// evento 2130. Es el mejor argumento para que el dato venga de la API: una
// regla por evento no se puede tener completa en la app.
const PRUEBA_PROPIA_POR_EVENTO = { 2130: [2] };

export function esPropia(pruebaId, categoriaId, eventoId) {
  return PRUEBAS_TODAS_PROPIAS.includes(Number(pruebaId))
    || CATEGORIAS_PROPIAS.includes(Number(categoriaId))
    || (PRUEBA_PROPIA_POR_EVENTO[Number(eventoId)] || []).includes(Number(pruebaId));
}

// Qué queda elegido al tocar una categoría, dado lo que ya estaba elegido de esa
// misma prueba. Devuelve las categorías de ESA prueba que quedan marcadas.
//
//  - ya estaba ⇒ se destilda
//  - propia ⇒ se suma a lo que haya
//  - común ⇒ se suma y saca la común anterior, si había (una sola por prueba)
export function alternarCategoria(pruebaId, elegidas, categoriaId, eventoId) {
  if (elegidas.includes(categoriaId)) return elegidas.filter((c) => c !== categoriaId);
  if (esPropia(pruebaId, categoriaId, eventoId)) return [...elegidas, categoriaId];
  return [...elegidas.filter((c) => esPropia(pruebaId, c, eventoId)), categoriaId];
}
