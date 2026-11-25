# Pedido a la API: los méritos de un animal

Nos pidieron que en el pedigree se vean **los méritos que tuvo el animal**. El
dato ya existe y ya lo exponen; lo que falta es poder pedirlo **por animal**.

## Lo que hay hoy

`GET /rankings/solanet/detalle?premio=&propietario=` devuelve los méritos de
`tblMeritosSolanet` agrupados **por propietario**, y cada fila ya trae todo lo
que queremos mostrar: evento, fecha, prueba, categoría, logro y puntos. Incluso
resuelven el `animalId` fila por fila (por SBA + RP) para que se pueda abrir el
pedigree desde ahí.

O sea que hoy se puede ir **del propietario al animal**, pero no al revés. En el
legacy pasa lo mismo: `MeritosSolanet::ParseFilter` sólo acepta
`NumeroPropietario`, `Propietario` e `IdPremioSolanet` — no hay filtro por
animal en ningún lado.

## Lo que pedimos

```
GET /animales/{id}/meritos
```

con el `{id}` compuesto de siempre (`pdre:N` / `exis:N` / `extr:N`), y una fila
por mérito:

```json
{
  "data": [
    {
      "premio": { "id": 2, "nombre": "Premio Emilio Solanet 2025 - 2026" },
      "evento": "Final Nacional Freno de Oro 2025",
      "fecha": "2025-03-25",
      "prueba": "Freno de Oro",
      "categoria": "Hembras",
      "logro": "Finalista",
      "puntos": 19.00
    }
  ]
}
```

- **De todos los premios**, no sólo del vigente, con el premio en cada fila: lo
  que nos pidieron es el historial del animal. Ordenado de más nuevo a más
  viejo; cuántos mostrar lo decide la app.
- **`[]`** cuando el animal no tiene méritos, que va a ser lo normal.
- **Fecha en `YYYY-MM-DD`**, como el resto del contrato (el detalle Solanet la
  manda `DD-MM-YYYY`, que es la única del contrato en ese formato).
- **Cache**: los méritos se cargan por temporada, así que un `max-age` largo
  está bien; nos alcanza con el `300` que ya usa el detalle.

Si les resulta más barato, también nos sirve un filtro `animal=` en
`/rankings/solanet/detalle` en vez de una ruta nueva. Preferimos la ruta propia
porque esto no es un drill-down del ranking: es la ficha del animal.

## El punto fino: cómo se encuentra al animal

`tblMeritosSolanet` **no guarda `IdAnimal`/`Tabla`**: identifica al animal por
**SBA + RP**. Para ir del animal a sus méritos hay que hacer el camino inverso
al que ya hacen: tomar la SBA y el RP del animal y buscar las filas que
coincidan.

Dos cosas que conocen mejor que nosotros y preferimos que decidan ustedes:

- **Exigir SBA + RP o sólo SBA.** Con los dos, un mérito con el RP mal tipeado
  no aparece — su propia nota documenta 2 casos así sobre 2605 méritos. Con la
  SBA sola aparecerían méritos de **otro** caballo, que es el error de 525 de
  1133 que midieron en octubre. Desde acá preferimos **perder un mérito antes
  que mostrar el de otro animal**, pero la decisión es suya.
- **Animales unificados.** Si un animal absorbió a otro, sus méritos viejos
  pueden estar guardados con la SBA/RP del absorbido. No sabemos si la
  unificación los reescribe; si no lo hace, el historial va a salir cortado.

## Qué hace la app cuando esté

Una sección «Méritos» en la ficha del animal, abajo del árbol de pedigree, con
una fila por mérito —logro, prueba y evento a la izquierda, puntos a la
derecha— y la fecha. Si el array viene vacío la sección no se dibuja, como
hacemos con el resto de lo opcional.
