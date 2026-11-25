# Pedido a la API: los jurados del evento

Nos pidieron mostrar en la Info del evento tres datos: **jurados, cantidad de
animales y cantidad de expositores**. Dos de los tres ya los resolvimos de este
lado y no necesitan nada de ustedes (abajo está cómo, para que no los
presupuesten). El que falta es el primero.

## Lo que pedimos

Que `GET /eventos/{id}` incluya las autoridades del evento:

```json
{
  "id": 2294,
  "...": "...",
  "jurados": [
    { "id": 12, "nombre": "Pérez, Juan", "rol": "jurado" },
    { "id": 34, "nombre": "Gómez, Ana",  "rol": "jurado" }
  ]
}
```

- **En el detalle, no en un endpoint aparte.** La pantalla ya pide
  `GET /eventos/{id}` al abrirse; un recurso suelto sería una request más para
  dos o tres nombres. Si les resulta más limpio `GET /eventos/{id}/autoridades`,
  lo consumimos igual, pero preferimos lo primero.
- **`[]` cuando no hay nada cargado**, que va a ser el caso de muchos eventos.
  La app no muestra la fila si viene vacío.
- **Sin reordenar**: el orden del formulario (Jurado 1, 2, 3).
- **Con el rol**, si hay más de un tipo de autoridad cargado. Mostrar a un
  secretario como «jurado» sería perder una distinción que el sistema ya hace.

## Dónde están los datos

En `tblEventosMorfologicosAutoridades`, una fila por evento
(`EventosMorfologicosAutoridades::GetByIdEvento`). Es la misma tabla de la que
la API ya lee `Categoria` y `TipoMorfologia` para decidir cómo agrupar los
campeonatos en `GET /eventos/{id}/resultados` — o sea que el join al evento ya
existe, falta exponer las personas.

Los ids de jurado salen de las columnas `JAVE1`, `JAVE2`, `JAVE3`, que el admin
rotula «Jurado 1/2/3»
(`_adminexpo_/eventos_morfologicos_autoridades_mod.php`), y los nombres de la
entidad `Jurado` por `IdJurado`.

Un detalle que vimos y no sabemos interpretar: la entidad tiene además
`SAVE1..3`, `JAMO1..3`, `SAMO1..3`, `JAMA1..3` y `SAMA1..3`, pero en el alta del
admin **están comentadas** — sólo se escriben los `JAVE`. Si esas columnas
tienen datos viejos que valen, díganos y las mostramos; si son legado, con los
`JAVE` nos alcanza. Esa decisión es de ustedes, que conocen el dato.

## Lo que no hace falta que nos den

- **Cantidad de animales** y **cantidad de expositores**: salen del catálogo que
  la pantalla ya trae (`GET /eventos/{id}/catalogo`), contando animales
  distintos por `id` y propietarios distintos por `numero`. Ya está implementado
  y verificado contra producción: el evento 2294 da **81 animales de 23
  expositores**, y hay que recorrer las tres formas en que el catálogo los
  lista: `animales[]`, `yuntas[].animales[]` y `equipos[].animales[]`. En ese
  evento, mirar sólo `animales[]` daría 30 — se perderían los 24 equipos de
  Aparte Campero.

## Qué hace la app cuando esté

Una fila más en la tabla de la pestaña Info, al lado de «Categorías» y
«Animales inscriptos», con los nombres separados por coma. Si el campo no
viene, la fila no aparece y no se rompe nada: es el mismo criterio que usamos
con el resto de los campos opcionales del evento.
