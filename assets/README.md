# API Caballos Criollos

API REST de solo lectura para alimentar el sitio público, la app mobile y otros consumidores. Lee de dos bases (`caballos_web` para sitio público y noticias, `caballos_bd` para inscripciones / catálogos / resultados / pedigrees).

## Base URL

```
https://caballoscriollos.com/api
```

En desarrollo local con Docker: `http://localhost:8090/api`.

## Convenciones generales

- **Formato**: JSON con `Content-Type: application/json; charset=utf-8`. Strings UTF-8.
- **Métodos**: solo `GET`. La API es de lectura.
- **CORS**: `Access-Control-Allow-Origin: *`. Métodos: `GET, POST, PUT, PATCH, DELETE, OPTIONS`. Preflight (`OPTIONS`) devuelve `204`.
- **Autenticación**: ninguna por ahora. Los endpoints son públicos.
- **Fechas**: siempre `YYYY-MM-DD` (sin hora). En filtros también se acepta `DD-MM-YYYY` solo en `/eventos` (legado).
- **IDs de animales**: compuestos, formato `"<fuente>:<id_local>"` — fuente es `pdre` (machos nacionales), `exis` (hembras nacionales) o `extr` (extranjeros). Ejemplos: `pdre:1000`, `exis:142493`, `extr:6703`. El `:` puede ir literal o URL-encoded (`%3A`).
- **Sexo**: `"M"` (macho), `"H"` (hembra), `"C"` (castrado), `""` (desconocido).
- **Paginación**: `limit` y `offset` en query string. Los rangos válidos y defaults varían por endpoint (ver cada uno).
- **Cache-Control**: algunos endpoints envían `public, max-age=N` (ver "Cache" más abajo). Si tu cliente respeta HTTP cache (browsers, fetch default), los hits repetidos se sirven del cache local sin ir al server.

## Errores

Todos los errores son JSON con shape uniforme:

```json
{
  "error": true,
  "status": 404,
  "message": "Animal no encontrado"
}
```

Códigos usados:

| Status | Cuándo |
|--------|--------|
| `400` | Input inválido (id mal formado, fecha en formato no soportado, etc.) |
| `404` | Recurso no encontrado o ruta no registrada |
| `405` | Método HTTP no permitido en una ruta existente |
| `500` | Error interno (en `dev` el `message` incluye el detalle; en `prod` es genérico) |
| `503` | DB degradada (solo `/health/db`) |

---

## Endpoints

### Health

#### `GET /health`

Smoke test sin acceso a DB.

```json
{
  "status": "ok",
  "service": "caballos-criollos-api",
  "time": "2026-06-01T13:21:00+00:00",
  "php": "5.6.40"
}
```

#### `GET /health/db`

Verifica que ambas DBs conecten. Devuelve `503` si alguna falla.

```json
{
  "status": "ok",
  "time": "2026-06-01T13:21:00+00:00",
  "web":  { "ok": true },
  "expo": { "ok": true }
}
```

---

### Animales

Listado y detalle de animales del Stud Book (machos en `tblPdre`, hembras en `tblExis`, extranjeros en `tblExtr`). El listing deduplica por `(SBA, ASOC)` para que un animal repetido en varias tablas aparezca una sola vez.

#### `GET /animales`

Listado paginado con filtros.

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `nombre` | string | — | Busca por `NOMB LIKE %valor%`. |
| `sba` | string | — | Match exacto contra `HBAE` (y `HBEX` en extranjeros). |
| `rp` | string | — | Match exacto contra `RPEX`. |
| `sexo` | `M` \| `H` | — | Filtra por sexo. Otros valores se ignoran. |
| `numero_criador` | string | — | Match exacto contra `PROP` (excluye extranjeros). |
| `limit` | int (1–200) | `50` | Tamaño de página. |
| `offset` | int (≥0) | `0` | Offset para paginar. |

**Response**

```json
{
  "data": [
    {
      "id": "pdre:1000",
      "fuente": "pdre",
      "nombre": "FERMIN REMOLON",
      "sba": 6598,
      "rp": "3",
      "sexo": "M",
      "raza": 200,
      "propietario": {
        "numero": "376",
        "nombre": "HERMANAS BUSQUET"
      }
    }
  ],
  "meta": { "count": 1, "limit": 50, "offset": 0 }
}
```

`propietario` puede ser `null` si el animal no tiene número de criador. `propietario.nombre` puede ser `null` si el número no encuentra match en `tblPropietarios`.

#### `GET /animales/{id}`

Detalle de un animal. El id es compuesto (`pdre:N`, `exis:N`, `extr:N`).

**Response**: mismo shape que un item del listing.

`404` si no existe / id mal formado.

#### `GET /animales/{id}/pedigree`

Devuelve el animal raíz y su árbol de ancestros (4 generaciones: padre, abuelos, bisabuelos, tatarabuelos).

**Cache**: `Cache-Control: public, max-age=3600` (1 hora — el pedigree es muy estable).

**Response**

```json
{
  "animal": {
    "id": "pdre:1000",
    "fuente": "pdre",
    "nombre": "FERMIN REMOLON",
    "sba": 6598,
    "rp": "3",
    "sexo": "M",
    "raza": 200,
    "propietario": { "numero": "376", "nombre": "HERMANAS BUSQUET" }
  },
  "pedigree": {
    "padre": null,
    "madre": {
      "id": "exis:46308",
      "fuente": "exis",
      "nombre": "CARDAL AMATISTA",
      "sba": 5098,
      "rp": "293",
      "sexo": "H",
      "raza": 200,
      "padre": { "...": "..." },
      "madre": { "...": "..." }
    }
  }
}
```

- Cada nodo del árbol (`padre` / `madre`) tiene shape mínimo: `id`, `fuente`, `nombre`, `sba`, `rp`, `sexo`, `raza` + sus propios `padre`/`madre`.
- Ancestros desconocidos: `null`.
- Los nodos del último nivel (tatarabuelos) traen `padre: null` y `madre: null` sin recurse más profundo.
- Un ancestro puede aparecer múltiples veces en distintas ramas (consanguinidad / ancestros compartidos). Es esperado, no está deduplicado.
- `404` si el animal raíz no existe.

---

### Noticias

Noticias del sitio público. Solo expone las activas (`IdEstado = 1`) y dentro del rango vigente (`FechaDesde` / `FechaHasta` contra la fecha actual del server).

#### `GET /noticias`

Listado paginado. **Cache**: `Cache-Control: public, max-age=300` (5 min).

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `q` | string | — | Búsqueda libre `LIKE %valor%` en `Titulo`, `Copete` y `Cuerpo`. |
| `categoria` | int | — | Filtra por `IdCategoria`. |
| `destacado` | `1` \| `0` | — | Filtra noticias marcadas como destacadas. |
| `fijo` | `1` \| `0` | — | Filtra noticias fijas. |
| `fecha_desde` | `YYYY-MM-DD` | — | `Fecha >= valor`. Si el formato es inválido, se ignora. |
| `fecha_hasta` | `YYYY-MM-DD` | — | `Fecha <= valor`. Si el formato es inválido, se ignora. |
| `limit` | int (1–100) | `20` | Tamaño de página. |
| `offset` | int (≥0) | `0` | Offset para paginar. |

**Response**

```json
{
  "data": [
    {
      "id": 2218,
      "titulo": "La pasión de los Rodeos llegó a la manga internacional",
      "copete": "",
      "fecha": "2026-05-05",
      "categoria_id": 7,
      "destacado": false,
      "fijo": true,
      "video": "",
      "imagen": {
        "big":   "https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2026051904563230832.png",
        "thumb": "https://caballoscriollos.com/web/_recursos/noticias/imagenes/thumb/2026051904563230832.png"
      }
    }
  ],
  "meta": { "count": 20, "limit": 20, "offset": 0, "total": 1373 }
}
```

`imagen` puede ser `null` si la noticia no tiene imagen asociada. Orden: `Fijo DESC, Fecha DESC, IdNoticia DESC`.

#### `GET /noticias/{id}`

Detalle de una noticia. **Cache**: `Cache-Control: public, max-age=300`.

**Response**

```json
{
  "id": 2175,
  "titulo": "FICCC: servicios para expositores",
  "copete": "",
  "cuerpo": "<h2>...</h2>...",
  "fecha": "2026-02-10",
  "fuente": "",
  "video": "",
  "destacado": true,
  "fijo": true,
  "categoria_id": 10,
  "imagenes": [
    {
      "id": 4985,
      "epigrafe": "FICCC: servicios para expositores",
      "orden": 0,
      "urls": {
        "big":   "https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/foo.jpg",
        "thumb": "https://caballoscriollos.com/web/_recursos/noticias/imagenes/thumb/foo.jpg"
      }
    }
  ],
  "archivos": [
    {
      "id": 12,
      "nombre": "Reglamento 2026",
      "url": "https://caballoscriollos.com/web/_recursos/noticias/archivos/reglamento.pdf"
    }
  ]
}
```

- `cuerpo` viene como HTML crudo. Las referencias `../_recursos/...` dentro del HTML se reescriben a URLs absolutas automáticamente, así las imágenes embebidas funcionan desde cualquier cliente.
- `imagenes` ordenadas por `orden` ascendente.
- `404` si la noticia no existe / no está activa / no está en rango de fechas.

---

### Eventos

Eventos del sitio público (`caballos_web.tblEventos`), con categorías asociadas y, opcionalmente, su catálogo y resultados desde el sistema de inscripciones (`caballos_bd`).

#### `GET /eventos`

Listado paginado.

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `titulo` | string | — | `LIKE %valor%` sobre `Titulo`. |
| `id_region` | int | — | Filtra por región. |
| `id_provincia` | int | — | Filtra por provincia. |
| `suspendido` | `1` \| `0` | — | Filtra por estado. |
| `fecha_desde` | `YYYY-MM-DD` o `DD-MM-YYYY` | — | `Fecha >= valor`. |
| `fecha_hasta` | `YYYY-MM-DD` o `DD-MM-YYYY` | — | `Fecha <= valor`. |
| `id_categorias` | CSV de ints | — | Ej. `1,5,9`. Cualquier categoría que matchee. |
| `limit` | int (1–200) | `50` | Tamaño de página. |
| `offset` | int (≥0) | `0` | Offset para paginar. |

**Response**

```json
{
  "data": [
    {
      "id": 2057,
      "titulo": "Exposición Nacional Caballos Criollos",
      "fecha": "2026-04-10",
      "fecha_hasta": "2026-04-15",
      "suspendido": false,
      "region":    { "id": 3, "nombre": "Pampeana" },
      "provincia": { "id": 5, "nombre": "Buenos Aires" },
      "localidad": "Palermo",
      "direccion": "Av. Sarmiento 2704",
      "latitud":  "-34.5800",
      "longitud": "-58.4200",
      "web":   "https://...",
      "email": "info@...",
      "video": "",
      "imagen": "",
      "observaciones":          "...",
      "descripcion_tarifas":    "...",
      "informacion_adicional":  "...",
      "id_delegado": null,
      "fecha_inscripcion_desde": "2026-02-01",
      "fecha_inscripcion_hasta": "2026-03-30",
      "categorias": [
        { "id": 7,  "nombre": "Exposición Nacional" },
        { "id": 10, "nombre": "Expo FICCC" }
      ]
    }
  ],
  "meta": { "count": 50, "limit": 50, "offset": 0 }
}
```

`observaciones`, `descripcion_tarifas` e `informacion_adicional` vienen como HTML. Las `<img src="data:image/...;base64,...">` embebidas por el editor WYSIWYG del admin viejo se quitan automáticamente (ahorra decenas de KB por respuesta).

#### `GET /eventos/{id}`

Detalle. Mismo shape que un item del listing.

`fecha_desde` también acepta `DD-MM-YYYY` (formato del admin viejo); cualquier otro formato devuelve `400`.

#### `GET /eventos/{id}/catalogo`

Catálogo de animales inscriptos para el evento. Recibe el `IdEvento` del lado web y resuelve los eventos de inscripción vinculados (puede haber varios).

**Response**

```json
{
  "id_evento": 2057,
  "pruebas_funcionales": [
    {
      "id": 12,
      "nombre": "Aparte Vacuno",
      "categorias": [
        {
          "id": 95,
          "nombre": "Categ. 17 - Caballo Menor - Montado",
          "animales": [
            {
              "orden": 1,
              "id": "pdre:12345",
              "box": "A-15",
              "nombre": "...",
              "sba": "...",
              "rp": "...",
              "sexo": "M",
              "fecha_nacimiento": "2018-08-10",
              "pelaje": "Tordillo",
              "cabania": "...",
              "propietario": { "numero": "...", "nombre": "..." },
              "jinete": { "id": 123, "nombre": "Juan", "apellido": "Pérez" },
              "domador": null,
              "equipo": null,
              "id_evento_inscripcion": 2785
            }
          ]
        }
      ]
    }
  ],
  "morfologicas": [
    {
      "id": 95,
      "nombre": "Categ. 17 - Caballo Menor - Montado",
      "tipo_aptitud": true,
      "animales": [
        { "...": "..." }
      ]
    }
  ]
}
```

- Un mismo animal puede aparecer múltiples veces si está inscripto en varias pruebas / categorías; `id_evento_inscripcion` indica de qué evento de inscripción viene cada entrada.
- `orden` solo se setea en pruebas funcionales (`Posicion`); en morfología es siempre `null`.
- `domador` y `equipo` están como stub (`null`) — pendiente de implementar el link.

Si el evento no tiene inscripciones, devuelve el shape vacío con arrays vacíos.

#### `GET /eventos/{id}/resultados`

Premios cargados para el evento, agrupados por disciplina (morfología, tipo y aptitud) y dentro de cada una por nivel de premio.

**Response**

```json
{
  "id_evento": 2057,
  "morfologia": {
    "gran_campeonato": [
      { "sexo": "M", "resultados": [ /* entries */ ] },
      { "sexo": "H", "resultados": [ /* ... */ ] },
      { "sexo": "C", "resultados": [ /* ... */ ] }
    ],
    "campeonato": [
      { "sexo": "M", "resultados": [ /* ... */ ] }
    ],
    "categorias": [
      {
        "id": 95,
        "nombre": "Categ. 17 - Caballo Menor - Montado",
        "tipo_aptitud": false,
        "premios": [ /* entries */ ]
      }
    ]
  },
  "tipo_aptitud": {
    "campeonato": [
      { "sexo": "H", "resultados": [ /* ... */ ] }
    ],
    "categorias": [ /* idem morfología */ ]
  }
}
```

Cada **entry** tiene este shape:

```json
{
  "premio": {
    "id": 42,
    "nombre": "Gran Campeón Macho",
    "abreviatura": "GC.M",
    "tipo_id": 1,
    "tipo_nombre": "Gran Campeonato"
  },
  "puntaje": 87.5,
  "animal": {
    "id": "pdre:12345",
    "box": "A-15",
    "nombre": "...",
    "sba": "...",
    "rp": "...",
    "sexo": "M",
    "fecha_nacimiento": "2018-08-10",
    "pelaje": "Tordillo",
    "cabania": "...",
    "propietario": { "numero": "...", "nombre": "..." },
    "jinete": { "id": 123, "nombre": "Juan", "apellido": "Pérez" }
  },
  "categoria_morfologica": {
    "id": 95,
    "nombre": "...",
    "tipo_aptitud": false
  },
  "id_evento_inscripcion": 2785
}
```

Mapeo de `premio.tipo_id`:

| `tipo_id` | `tipo_nombre` | Va a |
|---|---|---|
| 1 | Gran Campeonato | `gran_campeonato` (solo morfología) |
| 2 | Campeonato | `campeonato` |
| 3 | Premios | `categorias[].premios` |
| 4 | Menciones | `categorias[].premios` |
| 5 | Sin Premio | `categorias[].premios` |

Dentro de cada grupo, los entries vienen ordenados por puntaje descendente. El orden de sexos dentro de `campeonato` / `gran_campeonato` es estable: primero `M`, luego `H`, luego `C`, después cualquier otro.

Si el evento no tiene resultados, devuelve el shape vacío con los arrays vacíos en cada disciplina.

---

### Vivos (transmisiones en vivo)

Transmisiones en vivo asociadas a eventos. Cada vivo es un rango horario único `{fecha, hora_inicio, hora_fin}` con título, descripción, link a la página que transmite y/o link de YouTube. Un evento puede tener N vivos (varios días, varios bloques por día). Las horas se interpretan como **Argentina (UTC-3)** y se devuelven sin offset.

Cada vivo trae un campo `estado` derivado contra "ahora":

| `estado` | Cuándo |
|---|---|
| `en_vivo` | `Fecha = hoy` y `HoraInicio <= ahora < HoraFin` |
| `proximo` | Fecha futura, o hoy con `HoraInicio > ahora` |
| `pasado`  | Fecha pasada, o hoy con `HoraFin <= ahora` |

#### `GET /vivos`

Listado global con filtros. **Cache**: `Cache-Control: public, max-age=60` (el `estado` se invalida cada minuto).

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `evento_id` | int | — | Filtra por evento. |
| `estado` | `en_vivo` \| `proximo` \| `pasado` | — | Filtra por estado actual. |
| `fecha_desde` | `YYYY-MM-DD` | — | `Fecha >= valor`. |
| `fecha_hasta` | `YYYY-MM-DD` | — | `Fecha <= valor`. |
| `limit` | int (1–200) | `50` | Tamaño de página. |
| `offset` | int (≥0) | `0` | Offset para paginar. |

**Response**

```json
{
  "data": [
    {
      "id": 12,
      "evento": { "id": 2057, "titulo": "Expo Nacional 2026" },
      "titulo": "Aparte vacuno — Mañana",
      "descripcion": "Pruebas de aparte campero",
      "link_pagina": "https://transmision.example.com/expo",
      "link_youtube": "https://youtube.com/watch?v=xxx",
      "fecha": "2026-04-10",
      "hora_inicio": "09:00",
      "hora_fin": "11:00",
      "estado": "en_vivo"
    }
  ],
  "meta": { "count": 1, "limit": 50, "offset": 0, "total": 1 }
}
```

Orden: `Fecha ASC, HoraInicio ASC`.

#### `GET /vivos/{id}`

Detalle de un vivo. Mismo shape que un item del listing. `404` si no existe.

#### `GET /eventos/{id}/vivos`

Todos los vivos de un evento, ordenados cronológicamente.

**Response**

```json
{
  "id_evento": 2057,
  "data": [ /* vivos sin el campo "evento" (se entiende por contexto) */ ],
  "meta": { "count": 5 }
}
```

#### Vivo actual en el detalle del evento

`GET /eventos/{id}` ahora incluye un campo `vivo_actual` con el vivo que esté `en_vivo` ahora para ese evento, o `null` si no hay ninguno corriendo. Útil para mostrar el botón de "Ver transmisión" sin tener que hacer una segunda request.

#### ABM (admin)

La carga, edición y borrado de vivos se hace desde el admin web (`src/web/admin/eventosvivos.php`, en el menú **Eventos → Transmisiones en vivo**). Patrón JSON-RPC clásico del admin:

- `GET  /web/admin/eventosvivos.php` — listado paginado con filtros (jsGrid).
- `POST /web/admin/json-eventosvivos-add.php` — alta.
- `POST /web/admin/json-eventosvivos-mod.php` — modificación.
- `POST /web/admin/json-eventosvivos-del.php` — baja.
- `GET  /web/admin/json-eventosvivos-get.php?IdEventoVivo=N` — detalle (para formularios).

Requiere `Session::CheckPerm(Modulo::Eventos)`, igual permiso que los eventos.

#### Migración requerida

La tabla `tblEventoVivos` (DB `caballos_web`) se crea con el script `docker/db/migrations/2026-06-02_evento_vivos.sql`. En producción hay que aplicarlo a mano antes de desplegar este endpoint:

```bash
mysql -uUSER -p caballos_web < docker/db/migrations/2026-06-02_evento_vivos.sql
```

```json
{
  "id": 2057,
  "titulo": "Expo Nacional 2026",
  "...": "...",
  "vivo_actual": {
    "id": 12,
    "titulo": "Aparte vacuno — Mañana",
    "link_pagina": "https://...",
    "link_youtube": "https://youtube.com/watch?v=xxx",
    "fecha": "2026-04-10",
    "hora_inicio": "09:00",
    "hora_fin": "11:00",
    "estado": "en_vivo"
  }
}
```

---

## Cache

Resumen de los `Cache-Control` que envía la API:

| Endpoint | max-age |
|---|---|
| `/animales/{id}/pedigree` | `3600` (1 h) |
| `/noticias` | `300` (5 min) |
| `/noticias/{id}` | `300` (5 min) |
| `/vivos`, `/vivos/{id}`, `/eventos/{id}/vivos` | `60` (1 min — `estado` cambia) |
| resto | sin header (no cacheable por default) |

## Ejemplos rápidos (cURL)

```bash
# Listing de animales por nombre
curl "https://caballoscriollos.com/api/animales?nombre=cardal&limit=10"

# Pedigree (el ":" puede ir literal o URL-encoded)
curl "https://caballoscriollos.com/api/animales/pdre:1000/pedigree"

# Noticias destacadas del último mes
curl "https://caballoscriollos.com/api/noticias?destacado=1&fecha_desde=2026-05-01"

# Catálogo + resultados de un evento
curl "https://caballoscriollos.com/api/eventos/2057/catalogo"
curl "https://caballoscriollos.com/api/eventos/2057/resultados"

# ¿Qué hay en vivo ahora?
curl "https://caballoscriollos.com/api/vivos?estado=en_vivo"

# Vivos de un evento puntual
curl "https://caballoscriollos.com/api/eventos/2057/vivos"
```
