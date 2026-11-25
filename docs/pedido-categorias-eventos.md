# Pedido a la API: el catálogo de categorías de eventos

Una sola cosa, chica, y con un precedente exacto en el mismo código:
`GET /eventos/categorias`, el equivalente del `GET /noticias/categorias` que ya
existe.

## El problema

El calendario de la app ahora filtra por **actividad** (Morfología, Aparte
Campero, Rienda…). El filtro en sí funciona: va como `id_categorias` en
`GET /eventos` y lo resuelve la API.

Lo que no tenemos es de dónde sacar **la lista de actividades para ofrecer**. No
hay endpoint que la devuelva, así que hoy la app la arma con las categorías que
vienen en los eventos que ya cargó. Eso trae tres problemas, en orden de
gravedad:

1. **Con la primera página angosta, el selector miente.** Si los primeros 20
   eventos son todos de morfología, el socio ve una sola actividad y no se
   entera de que existen las otras hasta scrollear.
2. **Sin eventos no hay selector.** Si el listado viene vacío —por el filtro de
   mes, o porque no hay nada cargado—, la fila de actividades directamente no se
   dibuja, y desde afuera parece que la función no está.
3. **El catálogo cambia mientras se usa.** Aparecen opciones nuevas a medida que
   el socio scrollea, que es un comportamiento raro para un filtro.

## Lo que pedimos

```
GET /eventos/categorias
```

```json
{
  "data": [
    { "id": 7,  "nombre": "Aparte Campero" },
    { "id": 12, "nombre": "Morfología" }
  ]
}
```

Mismo shape, mismo orden y mismo cache que `/noticias/categorias`
(`Orden ASC`, después `Nombre ASC`, después `id`; `Cache-Control: public,
max-age=3600`). Público, sin `Authorization`.

**Qué categorías devolver.** Preferimos las que **tienen al menos un evento**,
resueltas por `tblEventosCategorias`, y no todas las de `tblCategorias` del tipo
que corresponda. Dos razones: nos evita adivinar cuál es el `IdTipo` de eventos
—el de noticias es 2 y el de eventos no lo sabemos desde acá, sólo vemos los ids
por el join—, y sobre todo no puebla el filtro con opciones que siempre dan
vacío. Es el mismo criterio que ya aplicaron en `findPruebasConReglamentos`,
donde el comentario dice *"devuelve solo las pruebas que realmente tienen
reglamentos, para no poblar el filtro con opciones vacías"*.

**Opcional, si es barato:** aceptar `fecha_desde` / `fecha_hasta` con la misma
semántica que `GET /eventos`, para que el catálogo acompañe al período que el
socio está mirando. Si complica, lo dejamos: con el catálogo completo ya
resolvemos el problema, y una opción que en ese mes no tiene eventos muestra un
vacío que explica por qué.

## Lo que no cambia

`GET /eventos` y su parámetro `id_categorias` quedan como están: el filtro ya
anda contra lo que hay hoy. Esto es sólo para poblar el selector.

## Por qué no lo resolvemos en la app

Las dos salidas que teníamos de este lado no sirven:

- **Traer todos los eventos para juntar las categorías.** Cada evento del listado
  viene con `observaciones`, `descripcion_tarifas` e `informacion_adicional` en
  HTML; pedir 200 para quedarnos con dos campos por evento es mucha transferencia
  para un selector.
- **Hardcodear la lista en la app.** Es lo que hace el calendario de la web
  (`src/web/calendario.php` tiene diez disciplinas escritas a mano en el
  `<select>`), pero ahí filtra por `NombreAlternativo` y no por id. En la app
  significaría que cada categoría nueva necesita una versión en las tiendas, y va
  contra la regla del proyecto de no volver a meter datos del sistema en el
  código.

## Qué hace la app cuando esté

Una llamada al montar la pantalla de eventos, cacheada una hora como la de
noticias, y el selector pasa a mostrar siempre el catálogo completo en lugar de
lo que haya traído la página. El filtro no se toca. Es un cambio de una sola
pantalla (`src/screens/EventsScreen.js`) más el archivo de transporte en
`src/api/eventos.js`.
