# API Caballos Criollos

API REST de solo lectura para alimentar el sitio público, la app mobile y otros consumidores. Lee de dos bases (`caballos_web` para sitio público y noticias, `caballos_bd` para inscripciones / catálogos / resultados / pedigrees).

## Base URL

```
https://caballoscriollos.com/api
```

En desarrollo local con Docker: `http://localhost:8090/api`.

## Convenciones generales

- **Formato**: JSON con `Content-Type: application/json; charset=utf-8`. Strings UTF-8.
- **Métodos**: mayormente `GET` (lectura). Algunos endpoints específicos aceptan `POST` para escritura puntual (ej. registro de push tokens) — ver cada endpoint.
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
| `columnista` | int | — | Filtra por `IdColumnista`. |
| `destacado` | `1` \| `0` | — | Filtra noticias marcadas como destacadas. |
| `fijo` | `1` \| `0` | — | Filtra noticias fijas. |
| `fecha_desde` | `YYYY-MM-DD` | — | `Fecha >= valor`. Si el formato es inválido, se ignora. |
| `fecha_hasta` | `YYYY-MM-DD` | — | `Fecha <= valor`. Si el formato es inválido, se ignora. |
| `sort` | `fecha_asc` \| `fecha_desc` \| `columnista` | `fecha_desc` | Orden. Default: fijo arriba, fecha DESC. `fecha_asc`: fijo arriba, fecha ASC, desempate por categoría y título (replica el listado público legacy). `columnista`: agrupa por nombre de columnista. |
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
      "categoria": { "id": 7, "nombre": "Eventos" },
      "destacado": false,
      "fijo": true,
      "video": "",
      "imagen": {
        "big":        "https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2026051904563230832.png",
        "thumb":      "https://caballoscriollos.com/web/_recursos/noticias/imagenes/thumb/2026051904563230832.png",
        "optimizada": "https://caballoscriollos.com/api/img/noticias/2026051904563230832.png"
      }
    }
  ],
  "meta": { "count": 20, "limit": 20, "offset": 0, "total": 1373 }
}
```

Cada item incluye además `columnista` (`{id, nombre}` o `null`) — el columnista asociado a la noticia; en la categoría Reglamentos es la "Prueba" (ver [Reglamentos](#reglamentos)).

`imagen` puede ser `null` si la noticia no tiene imagen asociada. `big`/`thumb` apuntan al original tal cual se subió; `optimizada` pasa por `/api/img` (resize + recompresión WebP/JPEG + cache) y es la que conviene consumir desde la app — ver [Imágenes optimizadas](#imágenes-optimizadas). Orden: `Fijo DESC, Fecha DESC, IdNoticia DESC`.

#### `GET /noticias/categorias`

Listado plano de categorías de noticias activas. Útil para poblar el filtro de categoría del cliente sin tener que paginar (son pocas decenas como máximo). **Cache**: `Cache-Control: public, max-age=3600` (1 h).

**Response**

```json
{
  "data": [
    { "id": 10, "nombre": "Institucional" },
    { "id": 11, "nombre": "Reglamentos" },
    { "id": 13, "nombre": "Remates" }
  ]
}
```

Orden: `Orden ASC, Nombre ASC` (el campo `Orden` lo configura el admin; si está vacío se ordena alfabéticamente).

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
        "big":        "https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/foo.jpg",
        "thumb":      "https://caballoscriollos.com/web/_recursos/noticias/imagenes/thumb/foo.jpg",
        "optimizada": "https://caballoscriollos.com/api/img/noticias/foo.jpg"
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

### Reglamentos

Los reglamentos son noticias de una categoría fija (la misma que usa `web/reglamentos.php`) que se filtran por **Prueba** (el columnista). Es un alias semántico sobre noticias: mismo shape de item que `GET /noticias`, pero con la categoría ya aplicada, ordenado por prueba, y con el columnista expuesto como `prueba`.

El detalle (con el HTML del cuerpo y el PDF) se obtiene con `GET /reglamentos/{id}` — ver abajo. (Como un reglamento es una noticia, `GET /noticias/{id}` devuelve lo mismo, sin el framing de reglamento.)

#### `GET /reglamentos`

Listado paginado de reglamentos vigentes, ordenado por prueba (y fecha DESC dentro de cada una). **Cache**: `Cache-Control: public, max-age=300`.

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `prueba` | int | — | Filtra por `IdColumnista` (la prueba). |
| `q` | string | — | Búsqueda libre `LIKE %valor%` en `Titulo`, `Copete`, `Cuerpo`. |
| `limit` | int (1–100) | `20` | Tamaño de página. |
| `offset` | int (≥0) | `0` | Offset para paginar. |

**Response**

```json
{
  "data": [
    {
      "id": 1234,
      "titulo": "Reglamento Freno de Oro 2026",
      "copete": "",
      "fecha": "2026-03-01",
      "categoria": { "id": 11, "nombre": "Reglamentos" },
      "prueba":    { "id": 5,  "nombre": "Freno de Oro" },
      "destacado": false,
      "fijo": false,
      "video": "",
      "imagen": { "big": "...", "thumb": "...", "optimizada": "..." }
    }
  ],
  "meta": { "count": 20, "limit": 20, "offset": 0, "total": 37 }
}
```

`prueba` puede ser `null` (reglamento sin columnista asignado). Mismo shape de item que `/noticias` salvo que el columnista se llama `prueba`.

#### `GET /reglamentos/pruebas`

Lista de pruebas (columnistas) que tienen al menos un reglamento vigente — para poblar el filtro sin opciones vacías. **Cache**: `Cache-Control: public, max-age=3600`.

**Response**

```json
{
  "data": [
    { "id": 5, "nombre": "Freno de Oro" },
    { "id": 8, "nombre": "Paleteada" }
  ]
}
```

Orden alfabético por nombre.

#### `GET /reglamentos/{id}`

Detalle de un reglamento: el **HTML del cuerpo** + el **PDF** + la prueba. **Cache**: `300`.

```json
{
  "id": 1072,
  "titulo": "Reglamento Copa Incentivo de Oro 2026",
  "copete": "",
  "cuerpo": "<p>...</p>",
  "fecha": "2026-02-27",
  "fuente": "",
  "video": "",
  "destacado": false,
  "fijo": false,
  "categoria": { "id": 11, "nombre": "Reglamentos" },
  "prueba": { "id": 2, "nombre": "Copa Incentivo de Oro" },
  "imagenes": [ ... ],
  "archivos": [
    { "id": 1414, "nombre": "REGLAMENTO ... .pdf",
      "url": "https://caballoscriollos.com/web/_recursos/noticias/archivos/2026022709574460118.pdf" }
  ],
  "pdf": "https://caballoscriollos.com/web/_recursos/noticias/archivos/2026022709574460118.pdf"
}
```

- `cuerpo` es HTML crudo (con las URLs `../_recursos/...` ya reescritas a absolutas).
- `pdf` es una conveniencia: la URL del primer adjunto `.pdf` (o el primer archivo si no hay `.pdf`), o `null`. El array `archivos` completo también viene.
- `prueba` = el columnista (o `null`).
- `404` si el id no existe o no es un reglamento (otra categoría).

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
| `sort` | `fecha_asc` \| `fecha_desc` | `fecha_desc` | Orden por `Fecha`. Usar `fecha_asc` para listar próximos primero; default sirve para listar pasados. |
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
      "imagen": "foto_evento.jpg",
      "imagen_optimizada": "https://caballoscriollos.com/api/img/eventos/foto_evento.jpg",
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

`imagen` es el nombre de archivo crudo (puede venir vacío). `imagen_optimizada` es la URL ya armada al endpoint `/api/img` (resize + recompresión + cache) — `null` si no hay imagen. Ver [Imágenes optimizadas](#imágenes-optimizadas).

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
          "clasificacion": "Clasificatoria",
          "cantidad_clasificatoria": 12,
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
- `clasificacion` y `cantidad_clasificatoria` (a nivel de categoría) salen de `tblEventosFuncionalesPruebasEventos`. `clasificacion` es el tipo de ronda — valores típicos: `Clasificatoria`, `Final`, `TercioFinal`, `CopaEspecial`. `cantidad_clasificatoria` es la cantidad de yuntas / animales que pasan a la siguiente ronda. Ambos pueden ser `null` si la prueba no tiene el row en `efpe` cargado (raro).

**Orden de pruebas funcionales** (replica `_adminexpo_/catalogo_pdf/catalogo_html_mini.php`):

| Posición | `IdEventosFuncionalesPrueba` | Nombre |
|---|---|---|
| 1 | 1  | Aparte Vacuno (Felipe Z. Ballester) |
| 2 | 4  | RJ Dowdall |
| 3 | 2  | Rodeos |
| 4 | 3  | Corral de Aparte |
| 5 | 6  | Aparte Campero |
| 6 | 11 | Aparte Campero (variante) |
| 7 | 5  | Freno de Oro |
| 8 | 8  | Enduro |
| 9 | 7  | Marcha |

Pruebas con `IdEventosFuncionalesPrueba` no listado (pruebas nuevas que se agreguen) caen al final, ordenadas por id ascendente. Dentro de cada prueba, las categorías van por `IdEventosFuncionalesPruebasCategoria` ascendente.

**Orden de animales dentro de cada prueba**:

| Prueba | Orden |
|---|---|
| Rodeos (2) | `iapf.Posicion` ASC — el orden real de salida de la yunta (el que setea `SetRodeosPosiciones`). Como los dos animales de una yunta comparten la misma `Posicion`, cada par queda consecutivo de forma natural. Si por carga incompleta una yunta tiene los animales con posiciones distintas, el handler los junta usando `iapf.YuntaIdAnimal`. |
| Resto | `iapf.Posicion` ASC |

**Shape especial de rodeos**

La categoría de rodeo no usa `animales[]` como las demás — usa `yuntas[]`, donde cada yunta lista a los dos animales (con su jinete cada uno) que corrieron juntos:

```json
{
  "id": 2,
  "nombre": "Rodeos",
  "categorias": [
    {
      "id": 312,
      "nombre": "Categ. 19 - Final Adulta",
      "clasificacion": "Final",
      "cantidad_clasificatoria": 6,
      "yuntas": [
        {
          "orden": 1,
          "animales": [
            {
              "id": "pdre:12345", "box": "A-15", "nombre": "...",
              "sba": "...", "rp": "...", "sexo": "M",
              "fecha_nacimiento": "2018-08-10", "pelaje": "...", "cabania": "...",
              "propietario": { "numero": "...", "nombre": "..." },
              "jinete": { "id": 123, "nombre": "Juan", "apellido": "Pérez" },
              "id_evento_inscripcion": 2785
            },
            { "id": "exis:9999", "box": "A-22", "...": "..." }
          ]
        }
      ]
    }
  ]
}
```

- `orden` de la yunta = `iapf.Posicion` del primer animal del par.
- `animales[]` siempre trae 2 (los dos miembros de la yunta), salvo que haya quedado coja por carga incompleta — en ese caso, un solo animal.
- `jinete` viene de `iapf.IdJinete` (jinete que asignó el expositor para la prueba), no del jinete de morfología / tipo y aptitud.

Si el evento no tiene inscripciones, devuelve el shape vacío con arrays vacíos.

#### `GET /eventos/{id}/resultados`

Premios y puntajes cargados para el evento, agrupados por disciplina (morfología, tipo y aptitud, rodeos) y dentro de cada una por nivel de premio o por prueba/categoría.

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
    "categorias": [
      {
        "id": 95,
        "nombre": "Categ. 17 - Caballo Menor - Montado",
        "tipo_aptitud": false,
        "premios": [ /* entries — Campeón / 1er Premio / Mención / etc. */ ]
      }
    ]
  },
  "tipo_aptitud": {
    "campeonato": [
      { "sexo": "H", "resultados": [ /* ... */ ] }
    ],
    "categorias": [ /* idem morfología */ ]
  },
  "rodeos": {
    "pruebas": [ /* ver shape más abajo */ ]
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

| `tipo_id` | `tipo_nombre` | Va a (morfología) | Va a (tipo y aptitud) |
|---|---|---|---|
| 1 | Gran Campeonato | `gran_campeonato` | — |
| 2 | Campeonato | `categorias[].premios` | `campeonato` |
| 3 | Premios | `categorias[].premios` | `categorias[].premios` |
| 4 | Menciones | `categorias[].premios` | `categorias[].premios` |
| 5 | Sin Premio | `categorias[].premios` | `categorias[].premios` |

**Importante (morfología)**: el "campeonato" (Campeón / Reservado Campeón) es en realidad un sub-resultado de la categoría a la que pertenece el animal, así que sale dentro de `categorias[].premios[]`, no como key aparte. Además, si un animal tiene varios premios en la misma categoría (ej. Campeón + 1er Premio), solo se devuelve el de mayor jerarquía (menor `tipo_id` gana: Campeón > 1er Premio > Mención > Sin Premio). El `tipo_id` / `tipo_nombre` del entry indica cuál de los premios ganó. `gran_campeonato` queda aparte porque es un premio cross-categorías (campeón entre todas las categorías de un sexo).

En tipo y aptitud el campeonato sigue como key separada — ahí la lógica es distinta (la columna `Campeonato` de `tblInscripcionResultadosTipoAptitud` marca rows que son específicamente de campeonato cross-categoría).

Dentro de cada grupo, los entries vienen ordenados por puntaje descendente. El orden de sexos dentro de `campeonato` / `gran_campeonato` es estable: primero `M`, luego `H`, luego `C`, después cualquier otro.

Si el evento no tiene resultados, devuelve el shape vacío con los arrays vacíos en cada disciplina.

**Rodeos**

La key `rodeos.pruebas[]` agrupa por prueba + categoría. Cada prueba expone su `clasificacion` (`Clasificatoria` / `Final` / `TercioFinal` / `CopaEspecial`) y un array de `yuntas`. Cada yunta (par de animales) consolida los dos rows de `tblInscripcionResultadosRodeos` que la componen (dedupe por `IdEquipo`; fallback al par `(IdAnimal, YuntaIdAnimal)` cuando el equipo no está cargado).

```json
"rodeos": {
  "pruebas": [
    {
      "prueba":    { "id": 2, "nombre": "Rodeos" },
      "categoria": { "id": 312, "nombre": "Categ. 19 - Final Adulta" },
      "clasificacion": "Final",
      "cantidad_clasificatoria": 6,
      "yuntas": [
        {
          "puesto":      { "general": 1, "handicap": 1, "c": 2 },
          "puesto_dia2": { "general": 1, "handicap": 1, "c": 2 },
          "totales": {
            "dia1": 88, "dia2": 86,
            "total_handicap_1": 78, "total_handicap_2": 76,
            "total_c_1": 78, "total_c_2": 76,
            "desempate_dia1": 8, "desempate_dia2": 7
          },
          "handicaps": {
            "h1_dia1": 5, "h2_dia1": 5,
            "h1_dia2": 5, "h2_dia2": 5,
            "morfologia_1": 0.0, "morfologia_2": 0.0
          },
          "vacas": {
            "dia1":        [10, 9, 8, 7, 6, 10, 9, 8, 7, 6, 4, 4],
            "dia2":        [10, 9, 8, 7, null, null, null, null, null, null, null, null],
            "ultima_dia1": 12,
            "ultima_dia2": 4,
            "extras":      { "vaca25": 8, "vaca26": null, "vaca27": null }
          },
          "animales": [
            {
              "id": "pdre:12345", "box": "A-15", "nombre": "...",
              "sba": "...", "rp": "...", "sexo": "M",
              "fecha_nacimiento": "2018-08-10", "pelaje": "...", "cabania": "...",
              "jinete": { "id": 123, "nombre": "Juan", "apellido": "Pérez" },
              "id_evento_inscripcion": 2785
            },
            { "id": "exis:9999", "...": "..." }
          ],
          "equipo":  {
            "id": 42,
            "animales": [
              {
                "id": "pdre:12345", "box": "A-15", "nombre": "...",
                "sba": "...", "rp": "...", "sexo": "M",
                "jinete": { "id": 123, "nombre": "Juan", "apellido": "Pérez" }
              }
            ]
          },
          "equipo2": { "id": 51, "animales": [ /* mismo shape que equipo.animales */ ] }
        }
      ]
    }
  ]
}
```

**Reglas**:

- Una **yunta** = par de animales que corrieron juntos. La tabla guarda un row por animal con los mismos puntajes copiados; el endpoint consolida en una sola yunta. `animales` siempre trae los dos (en el orden estable del par; un solo animal si la yunta quedó coja por carga incompleta).
- **Vacas**: array de 12 `(int|null)` por día (`dia1` = Vaca1..Vaca12, `dia2` = Vaca13..Vaca24). `null` significa "vaca todavía no procesada"; `0` es una vaca corrida con cero puntos. Los desempates van en `extras` (`vaca25` = primer desempate, `vaca26` y `vaca27` = adicionales) y también pueden ser `null`.
- **`ultima_dia1` / `ultima_dia2`**: número de la última vaca **del día** (1..12) con dato no-null. Por ej. `ultima_dia2 = 4` significa que el día 2 se procesaron hasta la Vaca16 (la 4ta del día). `null` si todavía no se cargó ninguna en ese día. No incluye los desempates (vaca25/26/27).
- **CopaEspecial**: solo un día, sin handicap ni Total C. En esas yuntas, los campos `dia2`, `total_handicap_*`, `total_c_*`, `desempate_dia2`, `vacas.dia2`, `vacas.extras.vaca26`, `vacas.extras.vaca27`, `puesto_dia2` y `puesto.handicap` / `puesto.c` salen en `null`. La key `handicaps` también queda `null`. El cliente discrimina por `clasificacion === "CopaEspecial"`.
- **Equipo** vs **Equipo2**: `equipo` es el equipo del jinete principal (`IdJinete`), `equipo2` el del jinete secundario (`IdJinete2`). Cualquiera puede ser `null` si la inscripción no tiene equipo cargado.
- **Orden** de las yuntas dentro de la categoría: por `puesto.general` ASC (los `null` al final), desempate por total descendente (`dia1 + dia2`). Para CopaEspecial, sin puesto, sale por `dia1` descendente.
- Solo se incluyen pruebas con resultados cargados (`iapf.IdEventosFuncionalesPrueba = 2`). Pruebas dadas de alta sin yuntas no aparecen.

---

### Imágenes optimizadas

Sirve versiones **redimensionadas y recomprimidas** de las imágenes que ya viven en disco bajo `_recursos/`. Pensado para que la app baje imágenes livianas en vez del original pesado que se subió por el admin. La reducción típica es del **85–97%** (un PNG de ~1 MB queda en ~40–130 KB según ancho y formato).

#### `GET /img/{coleccion}/{archivo}`

- `coleccion`: `noticias` | `eventos` (whitelist — cualquier otra devuelve `404`).
- `archivo`: el nombre de archivo tal como aparece en los campos de imagen de la API (ej. `2026062403064981243.png`). El endpoint resuelve internamente la carpeta `big/` de esa colección. Se valida el nombre (sin path traversal, solo extensiones de imagen).

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `w` | int (64–2560) | `1280` | Ancho máximo en px. **Nunca agranda** (si el original es más chico, se respeta su ancho). El alto se calcula manteniendo proporción. |
| `q` | int (40–92) | `82` (jpg) / `80` (webp) | Calidad de compresión. |
| `fmt` | `auto` \| `jpg` \| `webp` | `auto` | Formato de salida. `auto` negocia: devuelve **WebP** si el cliente lo acepta (header `Accept: image/webp` o `?fmt=webp`) y el server tiene soporte GD-WebP; si no, **JPEG**. |

**Response**: la imagen **binaria** (`Content-Type: image/webp` o `image/jpeg`), no JSON.

**Headers**

- `Cache-Control: public, max-age=31536000, immutable` + `ETag` + `Last-Modified` — cacheable agresivamente. Soporta `304 Not Modified` (vía `If-None-Match` / `If-Modified-Since`).
- `Vary: Accept` — la salida depende de si el cliente acepta WebP.

**Comportamiento**

- El resultado se cachea en disco en `_recursos/_cache/img/<2 chars>/<hash>.<ext>` (sharded por los 2 primeros caracteres del hash), con clave por `archivo + mtime + params`. Reprocesa solo si cambió el original o algún parámetro.
- **Degrada con elegancia**: sin GD, imagen > 40 MP, o formato no decodificable → sirve el original sin transcodificar. Si `_recursos/` no es escribible por el usuario web, sirve igual pero sin persistir el cache (re-procesa en cada request).

**De dónde sale el `archivo`**

Las respuestas de noticias y eventos ya incluyen la URL armada a este endpoint:

- Noticias: `imagen.optimizada` (listing) y `imagenes[].urls.optimizada` (detalle).
- Eventos: `imagen_optimizada`.

**Ejemplos**

```bash
# Optimizada con defaults (máx 1280px, WebP si el cliente lo acepta)
curl "https://caballoscriollos.com/api/img/noticias/2026062403064981243.png"

# Thumbnail chico para un listado
curl "https://caballoscriollos.com/api/img/noticias/2026062403064981243.png?w=400&q=70"

# Forzar JPEG (cliente sin soporte WebP)
curl "https://caballoscriollos.com/api/img/eventos/foto_evento.jpg?fmt=jpg"
```

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

### Notificaciones

Notificaciones que alimentan la **campanita** de la app: un log centralizado de los avisos que se quieren mostrar al usuario (y que eventualmente se envían por push). Hoy son **broadcast** (todas las notifs van a todos los dispositivos); cuando se sume login a la app, la misma tabla soporta notifs per-user vía el campo `IdUsuario`.

**Modelo cliente (recomendado)**

1. La app guarda en `AsyncStorage` un único valor: `lastSeenAt` (timestamp).
2. Al cargar la home: `GET /api/notificaciones?since={lastSeenAt}` — el badge de la campanita es `meta.total`.
3. Al abrir la campanita: `GET /api/notificaciones?limit=20`, mostrar lista. Al cerrar (o al primer scroll): setear `lastSeenAt = now` localmente.
4. Al tocar una notif: navegar usando `target.tipo + target.id` (deeplink interno) o `target.url` (link externo). Si `target` es `null`, no hace nada al tocarla.

#### `GET /notificaciones`

Listado paginado, orden por **momento de envío** descendente (`FechaEnvio DESC, IdNotificacion DESC`). **Cache**: `Cache-Control: public, max-age=30` (corto para no atrasar el badge).

**Solo se devuelven notificaciones efectivamente enviadas** (`EstadoEnvio = enviado`). Las que están programadas para el futuro o todavía pendientes de envío **no aparecen** hasta que el push sale; las anuladas y las que fallaron tampoco. En consecuencia, el campo `fecha` de cada notif es el **instante del envío real** (no el de creación ni el de programación), y tanto el orden como el filtro `since` se basan en ese instante.

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `since` | `YYYY-MM-DD HH:MM:SS` o ISO 8601 | — | Solo notifs **enviadas** después de `valor` (compara contra el momento de envío). Útil para "traeme lo nuevo desde mi último check" (poll del badge). Strings sin TZ se interpretan como Argentina. |
| `tipo` | `generico` \| `vivo` \| `evento` \| `noticia` | — | Filtra por tipo. |
| `limit` | int (1–200) | `50` | Tamaño de página. |
| `offset` | int (≥0) | `0` | Offset para paginar. |

**Response**

```json
{
  "data": [
    {
      "id": 1,
      "titulo": "Empezó la transmisión",
      "cuerpo": "Aparte vacuno está al aire ahora",
      "tipo": "vivo",
      "target": {
        "tipo": "vivo",
        "id": "2",
        "url": null
      },
      "imagen_url": null,
      "fecha": "2026-06-08 13:11:58"
    }
  ],
  "meta": { "count": 1, "limit": 50, "offset": 0, "total": 1 }
}
```

- `target` puede ser `null` (notif sin deeplink) o un objeto con uno de los dos modos:
  - `{ tipo, id, url:null }` — deeplink interno a un recurso de la app (vivo/evento/noticia + id).
  - `{ tipo:null, id:null, url }` — link externo (browser).
- `fecha` se devuelve en horario Argentina sin offset (consistente con el resto de la API) y corresponde al **momento del envío real** del push.

**Caso especial `target.tipo = "vivo"`**

El operador del admin elige un vivo puntual del listado (`tblEventoVivos`), pero el cliente normalmente quiere abrir la pantalla del **evento** padre (donde se ve el vivo y el resto del catálogo). Por eso:

- `target.tipo` queda en `"vivo"` para que la app pueda mostrar un ícono o copy distinto al `"evento"` genérico si quiere ("ESTÁ EN VIVO" vs "Evento próximo").
- `target.id` se devuelve **resuelto al `IdEvento` del evento padre**, no al `IdEventoVivo`. La app navega a `/eventos/{target.id}` sin tener que hacer otro lookup.
- Si el vivo fue eliminado entre el momento del envío y el de consumo de la notif, el endpoint deja `target.id` como el id original del vivo (fallback). La app puede usar eso para detectar "vivo borrado" o simplemente no navegar.

Para los otros tipos (`"evento"`, `"noticia"`), `target.id` es el id directo del recurso.

#### `GET /notificaciones/{id}`

Detalle de una notificación. Mismo shape que un item del listing. `404` si no existe / está eliminada.

#### ABM (admin)

La carga, edición y baja se hace desde el admin web (`src/web/admin/notificaciones.php`, en el menú **Notificaciones**). Soft delete: el botón eliminar deja la fila con `IdEstado = 0` para mantener el log.

#### Migración requerida

`docker/db/migrations/2026-06-08_notificaciones.sql` crea la tabla `tblNotificaciones` en `caballos_web`. Aplicar a mano en producción:

```bash
mysql -uUSER -p caballos_web < docker/db/migrations/2026-06-08_notificaciones.sql
```

#### Envío y programación (push real)

El admin permite **enviar al instante** o **programar** una notif para una fecha/hora (Argentina, granularidad minuto). El push real lo despacha un **cron** que recorre las pendientes vencidas y las manda vía Expo (ver `docs/push-notifications-api.md` para el contrato de envío). Como solo se exponen las ya enviadas (ver arriba), para el cliente esto es transparente: una notif programada simplemente aparece en la campanita en el momento en que efectivamente sale.

Detalle del log de envíos (estado por notif, resultado por token, receipts de entrega) es interno del backend y no se expone en este endpoint.

---

### Push notifications

Endpoint para que la app mobile registre su push token. Único endpoint de escritura por ahora.

#### `POST /push/register`

Registra (o re-registra) un push token. Idempotente: re-enviar el mismo `token` actualiza `plataforma`/`device_id` sin crear duplicado, gracias a un `UNIQUE INDEX` en la columna `Token`.

**Request body** (`application/json` o `application/x-www-form-urlencoded`)

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `token` | string (1–500) | sí | Token del dispositivo (APNs / FCM / Web Push). |
| `plataforma` | `ios` \| `android` \| `web` | sí | Whitelist estricta — otros valores devuelven 400. |
| `device_id` | string (1–256) | no | Identificador opcional del dispositivo. Útil para asociar el token con el device y, a futuro, invalidar tokens viejos del mismo dispositivo. |

**Response 200**

```json
{
  "ok": true,
  "id": 123,
  "created": true
}
```

- `id`: PK de la fila en `tblPushTokens`.
- `created`: `true` si era un token nuevo; `false` si ya existía (actualizado).

**Errores**

- `400` — `token` faltante / demasiado largo, `plataforma` inválida, body no-JSON con `Content-Type: application/json`.
- `405` — método ≠ POST.

**Ejemplos**

```bash
# JSON (típico desde React Native / fetch)
curl -X POST -H 'Content-Type: application/json' \
     -d '{"token":"abc123","plataforma":"ios","device_id":"iphone-juan"}' \
     https://caballoscriollos.com/api/push/register

# Form-urlencoded (fallback)
curl -X POST -d 'token=xyz&plataforma=android' \
     https://caballoscriollos.com/api/push/register
```

**Migración requerida**

La tabla `tblPushTokens` (DB `caballos_bd`) se crea con `docker/db/migrations/2026-06-05_push_tokens.sql`. Aplicar a mano en producción antes de desplegar.

---

### Rankings

Rankings del sitio. Todos comparten un mismo shape de **tabla genérica** (`columnas` + `filas`) para que el cliente los renderice con un único componente. Los datos NO se calculan en la API: reusa los mismos endpoints JSON del admin que ya alimentan los reportes (mismo SQL testeado), y los normaliza.

Hay dos familias de rankings:
- **Individuales / propietario** (una fila por animal o propietario): `solanet`, `freno`, `cio`, `fzb`, `corral_analitico`, `corral_general`. La fila es plana.
- **De equipo** (`familia: "equipo"`): `rodeos`, `apartes_analitico`, `apartes_general`. Además de las `columnas` escalares, cada fila trae un array `animales` con los miembros del equipo (cada uno con su `animalId` para el pedigree). Ver [Rankings de equipo](#rankings-de-equipo).

#### `GET /rankings`

Catálogo: qué rankings hay y qué filtros acepta cada uno (con sus opciones, para poblar los selects). **Cache**: `3600`.

```json
{
  "data": [
    {
      "slug": "freno",
      "nombre": "Freno de Oro — Ranking General",
      "familia": "individual",
      "filtros": [
        { "param": "anio", "label": "Año", "tipo": "anio", "default": 2026,
          "opciones": [ { "value": 2026, "label": "2026" }, { "value": 2025, "label": "2025" } ] },
        { "param": "categoria", "label": "Categoría", "tipo": "select", "default": 23,
          "opciones": [ { "value": 23, "label": "Adultos" } ] }
      ]
    }
  ]
}
```

- `familia`: `propietario` (Solanet) | `individual` (por animal) | `equipo` (rodeos, apartes).
- Cada `filtro` trae `param` (el query param a mandar), `default` y `opciones` (`{value,label}`).
- Filtros por ranking: `solanet` → `premio`; `rodeos` → `calendario` + `tipo`; el resto → `anio` + `categoria`.

#### `GET /rankings/{slug}`

Datos de un ranking como tabla genérica. Los filtros van como query params (ver el catálogo); si se omiten, se usa el default. **Cache**: `300`.

Ej: `GET /rankings/freno?anio=2026&categoria=23`

```json
{
  "slug": "freno",
  "titulo": "Freno de Oro — Ranking General",
  "subtitulo": "Adultos Montado",
  "familia": "individual",
  "columnas": [
    { "key": "position", "label": "#" },
    { "key": "sba", "label": "SBA" },
    { "key": "animal", "label": "Animal" },
    { "key": "inspection", "label": "AF" },
    { "key": "rider", "label": "Jinete" },
    { "key": "ownet", "label": "Propietario" },
    { "key": "event", "label": "Evento" },
    { "key": "date", "label": "Fecha" },
    { "key": "points", "label": "Puntaje" }
  ],
  "filas": [
    { "position": 1, "idAnimal": 1000, "tabla": "IdPdre", "animalId": "pdre:1000",
      "sba": "3501 D", "animal": "CARDAL X", "inspection": "Si",
      "rider": "Juan", "ownet": "Cabaña Z", "event": "Expo Nacional", "date": "01/03/2026", "points": 87.5 }
  ],
  "meta": { "count": 1, "filtros": { "anio": 2026, "categoria": 23 } }
}
```

- **Renderizado**: recorrer `columnas` en orden y, por cada fila, mostrar `fila[columna.key]`. Las `columnas` varían por ranking (ej. Solanet: `propertyNumber`/`name`/`cabin`/`points`; Corral: agrega `rp`).
- **Pedigree**: en los rankings por animal (`freno`, `cio`, `fzb`, `corral_analitico`, `corral_general`), cada fila trae además `idAnimal`, `tabla` y `animalId` (id compuesto ya armado, ej. `"pdre:1000"`). Estos campos **no** están en `columnas` (no se muestran); son para linkear a `GET /animales/{animalId}/pedigree`. El ranking `solanet` es por propietario (sin animal por fila); su detalle está abajo.
- `subtitulo` es la categoría/premio resuelto (o `null`).
- `404` si el `slug` no existe.

#### `GET /rankings/solanet/detalle`

Detalle de un propietario en el Premio Solanet: los méritos (por animal) que le suman puntos. Es el drill-down de una fila de `/rankings/solanet`. **Cache**: `300`.

**Query params**: `premio` (IdPremioSolanet, default `1`) y `propietario` (NumeroPropietario, **requerido** — `400` si falta).

Ej: `GET /rankings/solanet/detalle?premio=1&propietario=221`

```json
{
  "slug": "solanet",
  "titulo": "Premio Emilio Solanet — Detalle",
  "propietario": { "numero": "221", "nombre": "MATHO GARAT, RICARDO D." },
  "columnas": [
    { "key": "animal", "label": "Animal" }, { "key": "sba", "label": "SBA" },
    { "key": "rp", "label": "RP" }, { "key": "event", "label": "Evento" },
    { "key": "date", "label": "Fecha" }, { "key": "test", "label": "Prueba" },
    { "key": "category", "label": "Categoría" }, { "key": "achievement", "label": "Logro" },
    { "key": "points", "label": "Puntos" }
  ],
  "filas": [
    { "sba": "98015", "rp": "5047", "animal": "CHAKE VIROLA E PLATA 5047",
      "event": "Final Nacional Freno de Oro 2025", "date": "25-03-2025",
      "test": "Freno de Oro", "category": "Hembras", "achievement": "Finalista", "points": "19.00",
      "idAnimal": null, "tabla": null, "animalId": null }
  ],
  "meta": { "count": 7, "filtros": { "premio": 1, "propietario": "221" } }
}
```

> **Pedigree en el detalle Solanet**: acá `animalId` viene **`null`** — `tblMeritosSolanet` no guarda `IdAnimal`/`Tabla` (Solanet identifica al animal por SBA/RP). Para el pedigree desde el detalle, resolvé por SBA: `GET /animales?sba={sba}` → tomá `data[0].id` → `GET /animales/{id}/pedigree`. (Se puede resolver server-side para que `animalId` venga listo — ver nota al pie.)

> Nota de encoding: algunos nombres pueden traer la entidad HTML `&Ntilde;` (heredado de los wrappers del admin). Si el cliente no renderiza HTML, conviene reemplazarla por `Ñ` al mostrar.

#### Rankings de equipo

`rodeos`, `apartes_analitico` y `apartes_general` tienen `familia: "equipo"`. Se consumen igual (`GET /rankings/{slug}`), pero además de las `columnas` escalares, **cada fila trae un array con los miembros del equipo**, cada uno con su `animalId` para el pedigree. La app renderiza esos animales dentro de la fila (como en el reporte del admin).

**Apartes** (`apartes_analitico`, `apartes_general`) — la fila trae `animales[]`:

```json
{
  "position": 1,
  "equipo": "La Invernada",
  "animales": [
    { "sba": "100", "nombre": "CARDAL A", "jinete": "Juan", "animalId": "pdre:1", "idAnimal": "1", "tabla": "IdPdre" }
  ],
  "tiempo1": "01:20", "tiempo2": "01:25", "total": "02:45", "evento1": "...", "evento2": "..."
}
```
(`apartes_general` agrega `inspection` por animal; `apartes_analitico` usa `tiempo` + `encierro` en vez de `tiempo1/2/total`.)

**Rodeos** — es una matriz (yunta × eventos). La fila trae dos arrays: `animals[]` (la yunta, con `animalId`) y `rankings[]` (los mejores eventos):

```json
{
  "position": 1,
  "animals": [
    { "sba": "100", "name": "CARDAL A", "rider": "Juan", "handicap": 5, "functionalApproval": true, "animalId": "pdre:1" }
  ],
  "rankings": [
    { "pointsObtained": 30, "handicap": 5, "position": 2, "date": "...", "event": "...", "participanCount": 12, "pointsRanking": 10 }
  ],
  "totalPointsObtained": 30, "totalPointsRanking": 28
}
```
(rodeos usa las claves legacy `animals`/`rankings` en inglés porque el mismo wrapper alimenta `web/rodeos_ranking.php`. El `subtitulo` del endpoint es el título del calendario/campeonato.)

---

## Cache

Resumen de los `Cache-Control` que envía la API:

| Endpoint | max-age |
|---|---|
| `/animales/{id}/pedigree` | `3600` (1 h) |
| `/noticias` | `300` (5 min) |
| `/noticias/{id}` | `300` (5 min) |
| `/noticias/categorias` | `3600` (1 h) |
| `/vivos`, `/vivos/{id}`, `/eventos/{id}/vivos` | `60` (1 min — `estado` cambia) |
| `/notificaciones` | `30` (badge cambia rápido) |
| `/notificaciones/{id}` | `300` (5 min) |
| `/img/{coleccion}/{archivo}` | `31536000` (1 año, `immutable` + `ETag` + `304`) |
| `/rankings` | `3600` (1 h) |
| `/rankings/{slug}` | `300` (5 min) |
| `/rankings/solanet/detalle` | `300` (5 min) |
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

# Próximos eventos ordenados por fecha ascendente
curl "https://caballoscriollos.com/api/eventos?fecha_desde=2026-06-02&sort=fecha_asc"

# ¿Qué hay en vivo ahora?
curl "https://caballoscriollos.com/api/vivos?estado=en_vivo"

# Vivos de un evento puntual
curl "https://caballoscriollos.com/api/eventos/2057/vivos"

# Registrar push token de la app
curl -X POST -H 'Content-Type: application/json' \
     -d '{"token":"abc123","plataforma":"ios","device_id":"iphone-juan"}' \
     "https://caballoscriollos.com/api/push/register"

# Notificaciones nuevas desde el último check (para el badge de la campanita)
curl "https://caballoscriollos.com/api/notificaciones?since=2026-06-08%2010:00:00"

# Imagen optimizada de una noticia (máx 800px, WebP si el cliente lo acepta)
curl -H 'Accept: image/webp' \
     "https://caballoscriollos.com/api/img/noticias/2026062403064981243.png?w=800"

# Reglamentos: pruebas disponibles + reglamentos de una prueba
curl "https://caballoscriollos.com/api/reglamentos/pruebas"
curl "https://caballoscriollos.com/api/reglamentos?prueba=5"
```
