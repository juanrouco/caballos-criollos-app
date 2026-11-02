# API Caballos Criollos

> **Este README es el contrato con el equipo de la app.** Reemplaza a `src/api/README.md`, cuyo contrato
> queda congelado mientras las dos APIs convivan. Lo que difiere respecto de `/api` está al final, en
> [Cambios respecto de `/api`](#cambios-respecto-de-api).

API REST de solo lectura para alimentar el sitio público, la app mobile y otros consumidores. Lee de dos bases (`caballos_web` para sitio público y noticias, `caballos_bd` para inscripciones / catálogos / resultados / pedigrees).

## Base URL

```
https://api.caballoscriollos.com
```

Los paths son los mismos de `/api`, sin el prefijo: `GET /eventos`, `GET /animales/pdre:1000/pedigree`, etc.
(El nombre del subdominio todavía no está confirmado.)

En desarrollo local con Docker (`docker-compose.php8.yml`, contenedor `caballos-api8`): `http://localhost:8081`.
Ese puerto no se publica al host, así que se consulta desde adentro: `docker exec caballos-api8 curl localhost:8081/health`.

## Convenciones generales

- **Formato**: JSON con `Content-Type: application/json; charset=utf-8`. Strings UTF-8.
- **Métodos**: mayormente `GET` (lectura). Algunos endpoints específicos aceptan `POST` para escritura puntual (ej. registro de push tokens) — ver cada endpoint.
- **CORS**: `Access-Control-Allow-Origin: *`. Métodos: `GET, POST, PUT, PATCH, DELETE, OPTIONS`. Preflight (`OPTIONS`) devuelve `204`.
- **Autenticación**: los endpoints de datos son públicos. El login de la app (`/auth/*`) y los endpoints protegidos usan un token `Bearer`: ver [Autenticación](#autenticación).
- **Fechas**: siempre `YYYY-MM-DD` (sin hora). En filtros también se acepta `DD-MM-YYYY` solo en `/eventos` (legado).
- **IDs de animales**: compuestos, formato `"<fuente>:<id_local>"` — fuente es `pdre` (machos nacionales), `exis` (hembras nacionales) o `extr` (extranjeros). Ejemplos: `pdre:1000`, `exis:142493`, `extr:6703`. El `:` puede ir literal o URL-encoded (`%3A`).
- **Sexo**: `"M"` (macho), `"H"` (hembra), `"C"` (castrado), `""` (desconocido).
- **Enteros del request** (ids de la URL, `limit`, `offset`, filtros numéricos): se leen como el `(int)` de PHP 5.6, el de `/api`. Espacios iniciales, signo, los dígitos del principio, y el resto se descarta. **Sin exponente ni decimales**: `2e1` ⇒ `2`, `2057.9` ⇒ `2057`, `12abc` ⇒ `12`, `abc` ⇒ `0`.
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

Algunos errores de `/auth/*` agregan un campo **`code`** (un string estable) para que la app elija qué pantalla mostrar sin parsear el `message`: `email_no_verificado` (`403`) y `cuenta_duplicada` (`409`). Ver [Autenticación](#autenticación). Todos los errores de `POST /inscripciones` llevan `code` (y los `422`, además, `errores`): ver [Inscripciones](#inscripciones).

Códigos usados:

| Status | Cuándo |
|--------|--------|
| `400` | Input inválido (id mal formado, fecha en formato no soportado, etc.) |
| `401` | Sin sesión: credenciales incorrectas, o token ausente, vencido o inválido (sólo `/auth/*` y los endpoints protegidos) |
| `403` | Credenciales correctas, pero la cuenta no puede entrar todavía (`code: email_no_verificado`); o el usuario no puede inscribir por la app (`usuario_no_habilitado`, `usuario_solo_web`) |
| `404` | Recurso no encontrado o ruta no registrada |
| `405` | Método HTTP no permitido en una ruta existente |
| `409` | Cuenta duplicada (`code: cuenta_duplicada`; sólo `POST /auth/login`); el animal ya inscripto en el evento (`code: Duplicado`, `POST /inscripciones`) |
| `422` | La inscripción no cumple una regla (`code: inscripcion_invalida`, con `errores`; sólo `POST /inscripciones`) |
| `500` | Error interno (en `dev` el `message` incluye el detalle; en `prod` es genérico) |
| `503` | DB degradada (`/health/db`), o la autenticación no está configurada en el servidor (`/auth/*` y los endpoints protegidos); en `POST /inscripciones`, `base_no_disponible` o `mantenimiento` |

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
| `nombre` | string | — | Busca por `NOMB LIKE %valor%`. **Mínimo 3 caracteres** (tras recortar espacios y sin contar `%`/`_`); si no, `400` (#100). |
| `sba` | string | — | Match exacto contra `HBAE` (y `HBEX` en extranjeros). |
| `rp` | string | — | Match exacto contra `RPEX`. |
| `sexo` | `M` \| `H` | — | Se toma la **primera letra en mayúscula** (`m`, `macho` ⇒ `M`; `hembra` ⇒ `H`). Cualquier otra letra se ignora (sin filtro). |
| `numero_criador` | string | — | Match exacto contra `PROP`, en las tres tablas (los extranjeros **también** entran). Es una búsqueda lenta (~1 min en el stud book completo). |
| `limit` | int (1–200) | `50` | Tamaño de página. Fuera de rango se **clampea**, nunca da `400`; `meta.limit` devuelve el valor efectivo. |
| `offset` | int (≥0) | `0` | Offset para paginar. Negativo ⇒ `0`; `meta.offset` devuelve el valor efectivo. |

Los filtros de texto vacíos o `"0"` se **ignoran** (`?sba=0` lista todo). Un valor no numérico en `limit`/`offset` vale `0` (y se clampea).

**#100**: el filtro del request se evalúa **antes** de excluir las absorbidas (`NOT EXISTS` sobre `tblAnimalesUnificados`); mismo resultado. Medido el 2026-10-28: en MySQL 5.7 local la búsqueda por nombre baja de ~14 s a ~4 s; en MariaDB 10.11 (scratch con las tablas de prod) ya tardaba ~2 s antes y después (el reorden no se nota); en prod, antes del deploy, `ENTABLADO` y `LUNA` tardaban ~9,5 s en las dos APIs, y el después está pendiente de medir. Lo que mueve el costo es el mínimo de 3: en MariaDB `AN` tardaba 7 s y `A` 18 s, y ahora dan `400` en < 0,25 s. `nombre` tiene un **mínimo de 3 caracteres** (tras recortar espacios y sin contar `%`/`_`); si no, `400` `{"error":true,"status":400,"message":"El parámetro nombre necesita al menos 3 caracteres (sin contar espacios en los extremos ni los comodines % y _)"}`. `nombre` vacío o `0` sigue siendo "sin filtro". Un `nombre[]=` (array) también es `400`.

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
      "de_baja": false,
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

**Tipos**: salen tal cual vienen de la base, y **varían por tabla y por endpoint**. En el listado `sba` es string (`"119914"`, por el `UNION`) y en `GET /animales/{id}` es número para machos y hembras (`119914`) y string para extranjeros; `propietario.numero` es string en machos (`"1421"`) y número en hembras (`3018`); `raza` es número en machos/hembras y string en extranjeros. No conviertas en el cliente asumiendo un tipo fijo.

Los animales **absorbidos** por una unificación del stud book no aparecen en el listado: aparece el superviviente.

**Dados de baja** (`de_baja`): los animales con `CBAJ` seteado en el stud book se marcan con `de_baja: true`. Se **ocultan en el listado general** (sin filtros) pero se **incluyen cuando hay un filtro selectivo** (`nombre`, `sba`, `rp` o `numero_criador`) — o sea, aparecen si los buscás puntualmente. En `GET /animales/{id}` y en el raíz del pedigree el flag sale siempre (esos endpoints nunca ocultaron las bajas). Los extranjeros (`extr`) no tienen baja: siempre `de_baja: false`.

#### `GET /animales/{id}`

Detalle de un animal. El id es compuesto (`pdre:N`, `exis:N`, `extr:N`).

**Response**: mismo shape que un item del listing (con los tipos de la tabla, ver arriba). El prefijo del id no distingue mayúsculas (`PDRE:161518` vale) y puede venir URL-encoded (`pdre%3A161518`).

- `400` `ID inválido (esperado formato 'pdre:N' / 'exis:N' / 'extr:N'): <id>` si el id está mal formado (`xyz:1`, `161518`).
- `404` `Animal no encontrado` si está bien formado y no existe (incluido `pdre:0`).
- Un id **absorbido** por una unificación responde `200` con los datos **y el `id` del superviviente** (no hay redirect HTTP): el cliente tiene que leer `id` de la respuesta.
- Los dados de baja se devuelven (`de_baja: true`); este endpoint nunca los ocultó.

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
    "fecha_nacimiento": "1985-09-12",
    "pelaje": "Gateado",
    "propietario": { "numero": "376", "nombre": "HERMANAS BUSQUET" },
    "criador": { "numero": "1963", "nombre": "LOS POTRERITOS" }
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

- El `animal` raíz trae `propietario` **y** `criador` (`{numero, nombre}` o `null`). El criador sale del campo `CRIA` del stud book, resuelto contra `tblPropietarios` (criadores y propietarios son socios de la misma tabla). Sólo va en el raíz, no en los ancestros.
- El `animal` raíz también trae `fecha_nacimiento` (`YYYY-MM-DD` o `null`, desde `FNAC`) y `pelaje` (nombre del color o `null`, resuelto contra `tblPelos` por el código `CPEL`). Sólo van en el raíz, no en los ancestros.
- Cada nodo del árbol (`padre` / `madre`) tiene shape mínimo: `id`, `fuente`, `nombre`, `sba`, `rp`, `sexo`, `raza` + sus propios `padre`/`madre`.
- Ancestros desconocidos: `null`.
- Los nodos del último nivel (tatarabuelos) traen `padre: null` y `madre: null` sin recurse más profundo.
- Un ancestro puede aparecer múltiples veces en distintas ramas (consanguinidad / ancestros compartidos). Es esperado, no está deduplicado.
- `400` con el mismo mensaje de `GET /animales/{id}` si el id está mal formado; `404` `Animal no encontrado` si el animal raíz no existe. Un id absorbido responde con el árbol del superviviente.
- La primera consulta de un animal puede tardar unos segundos (resuelve los ancestros por SBA y los deja cacheados en el stud book); las siguientes son rápidas.

---

### Noticias

Noticias del sitio público. Solo expone las **vivas**: activas (`IdEstado = 1`) y dentro de su rango de publicación (`FechaDesde` / `FechaHasta`, comparadas con `CURDATE()` de MySQL, o sea la fecha del server de base). Los textos vienen con `stripslashes` aplicado.

#### `GET /noticias`

Listado paginado. **Cache**: `Cache-Control: public, max-age=300` (5 min).

**Query params** (ninguno da `400`: lo inválido se ignora o se acota)

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `q` | string | — | Búsqueda libre `LIKE %valor%` en `Titulo`, `Copete` y `Cuerpo`. |
| `categoria` | int | — | Filtra por `IdCategoria`. `0` o vacío: sin filtro. Un valor no numérico (`abc`) se toma como `0` **y filtra**: no devuelve nada. |
| `columnista` | int | — | Filtra por `IdColumnista`. Mismas reglas que `categoria`. |
| `destacado` | `1` \| `0` | — | Filtra por destacadas. Vacío: sin filtro. Se interpreta como booleano de PHP: `0` y `"0"` son falso, **cualquier otro texto es verdadero** (`destacado=false` ⇒ destacadas). |
| `fijo` | `1` \| `0` | — | Filtra por fijas. Mismas reglas que `destacado`. |
| `fecha_desde` | `YYYY-MM-DD` | — | `Fecha >= valor`. Formato estricto: una fecha imposible (`2026-02-30`) u otro formato (`31/07/2026`) se ignora. |
| `fecha_hasta` | `YYYY-MM-DD` | — | `Fecha <= valor`. Mismas reglas. |
| `sort` | `fecha_desc` \| `fecha_asc` \| `columnista` | `fecha_desc` | Exacto (en minúsculas); cualquier otro valor usa el default. `fecha_desc`: `Fijo DESC, Fecha DESC, IdNoticia DESC`. `fecha_asc`: `Fijo DESC, Fecha ASC`, desempate por nombre de categoría y título (el listado público legacy). `columnista`: nombre de columnista ASC, después `Fecha DESC, IdNoticia DESC`. |
| `limit` | int | `20` | Se acota a `1..100`. Un valor no numérico vale `0` y se acota a `1`. |
| `offset` | int | `0` | Negativo ⇒ `0`. |

Un param mandado como array (`x[]=...`): `q`, `fecha_desde` y `fecha_hasta` dan `500`. El resto se toma como en PHP: `categoria`, `columnista`, `limit` y `offset` valen `1` (filtran o acotan con `1`), `destacado` y `fijo` valen verdadero (aunque el valor sea `0`), y `sort` se ignora.

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
      "columnista": null,
      "destacado": false,
      "fijo": true,
      "video": "",
      "imagen": {
        "big":        "https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2026051904563230832.png",
        "thumb":      "https://caballoscriollos.com/web/_recursos/noticias/imagenes/thumb/2026051904563230832.png",
        "optimizada": "https://api.caballoscriollos.com/img/noticias/2026051904563230832.png"
      }
    }
  ],
  "meta": { "count": 20, "limit": 20, "offset": 0, "total": 1373 }
}
```

- `meta.limit` y `meta.offset` devuelven los valores **ya acotados**; `meta.total` cuenta con los mismos filtros.
- `categoria` y `columnista`: `{id, nombre}` o `null` (sin asignar). Si la categoría o el columnista fueron borrados, `nombre` viene `null`. En la categoría Reglamentos el columnista es la "Prueba" (ver [Reglamentos](#reglamentos)).
- `imagen`: la de menor `Orden` de la noticia, o `null` si no tiene. `big`/`thumb` apuntan al original tal cual se subió; `optimizada` pasa por `/img` (resize + recompresión WebP/JPEG + cache) y es la que conviene consumir desde la app — ver [Imágenes optimizadas](#imágenes-optimizadas).

#### `GET /noticias/categorias`

Listado plano de categorías activas del tipo Noticias (`IdTipo = 2`, `IdEstado = 1`), para poblar el filtro del cliente sin paginar. **Cache**: `Cache-Control: public, max-age=3600` (1 h).

**Response**

```json
{
  "data": [
    { "id": 2, "nombre": "Aparte campero" },
    { "id": 6, "nombre": "Corral de aparte" }
  ]
}
```

Orden: `Orden ASC` (las que no tienen `Orden` van al final), después `Nombre ASC`, después `id`.

#### `GET /noticias/{id}`

Detalle de una noticia viva. **Cache**: `Cache-Control: public, max-age=300` (sólo en el `200`).

`{id}` se toma como entero, igual que en PHP: `2040abc` ⇒ `2040`.

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
  "categoria": { "id": 10, "nombre": "Institucional" },
  "columnista": null,
  "imagenes": [
    {
      "id": 4985,
      "epigrafe": "FICCC: servicios para expositores",
      "orden": 0,
      "urls": {
        "big":        "https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/foo.jpg",
        "thumb":      "https://caballoscriollos.com/web/_recursos/noticias/imagenes/thumb/foo.jpg",
        "optimizada": "https://api.caballoscriollos.com/img/noticias/foo.jpg"
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

- `cuerpo` viene como HTML crudo. Las referencias `../_recursos/...` dentro del HTML se reescriben a URLs absolutas, así las imágenes embebidas funcionan desde cualquier cliente.
- `imagenes` ordenadas por `orden` ASC (desempate por `id`); `urls` es `null` si la imagen no tiene archivo. `archivos` ordenados por `id`; `url` es `null` si el adjunto no tiene archivo.
- `categoria` y `columnista`: como en el listado.

**Errores**

- `400` `"ID inválido"` si el id no es un entero positivo (`0`, `-1`, `abc`).
- `404` `"Noticia no encontrada"` si no existe o no está viva (inactiva o fuera de rango de fechas).

---

### Reglamentos

Los reglamentos son noticias de una categoría fija (`IdCategoria = 11`, la misma que usa `web/reglamentos.php`) que se filtran por **Prueba** (el columnista). Es un alias semántico sobre noticias: mismo shape de item que `GET /noticias`, con la categoría ya aplicada, ordenado por prueba, y con el columnista expuesto como `prueba`.

El detalle (con el HTML del cuerpo y el PDF) se obtiene con `GET /reglamentos/{id}` — ver abajo. (Como un reglamento es una noticia, `GET /noticias/{id}` devuelve lo mismo, sin el framing de reglamento.)

#### `GET /reglamentos`

Listado paginado de reglamentos vivos. Orden: nombre de la prueba ASC, después `Fecha DESC, IdNoticia DESC`. **Cache**: `Cache-Control: public, max-age=300`.

**Query params** (los demás params de `/noticias`, como `categoria` o `sort`, se ignoran)

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `prueba` | int | — | Filtra por `IdColumnista` (la prueba). `0`, vacío o no numérico (`abc`): sin filtro. |
| `q` | string | — | Búsqueda libre `LIKE %valor%` en `Titulo`, `Copete`, `Cuerpo`. |
| `limit` | int | `20` | Se acota a `1..100` (no numérico ⇒ `1`). |
| `offset` | int | `0` | Negativo ⇒ `0`. |

Un param mandado como array (`x[]=...`): `q` da `500`; `prueba`, `limit` y `offset` valen `1` (`prueba[]` filtra por la prueba `1`).

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
      "destacado": false,
      "fijo": false,
      "video": "",
      "imagen": { "big": "...", "thumb": "...", "optimizada": "..." },
      "prueba":    { "id": 5,  "nombre": "Freno de Oro" }
    }
  ],
  "meta": { "count": 20, "limit": 20, "offset": 0, "total": 37 }
}
```

Mismo item que `/noticias`, salvo que no trae `columnista`: lo trae como `prueba`, **al final** del objeto. `prueba` puede ser `null` (reglamento sin columnista asignado).

#### `GET /reglamentos/pruebas`

Pruebas (columnistas activos) que tienen al menos un reglamento vivo, para poblar el filtro sin opciones vacías. **Cache**: `Cache-Control: public, max-age=3600`.

**Response**

```json
{
  "data": [
    { "id": 1, "nombre": "Aparte Campero" },
    { "id": 2, "nombre": "Copa Incentivo de Oro" }
  ]
}
```

Orden alfabético por nombre.

#### `GET /reglamentos/{id}`

Detalle de un reglamento: el **HTML del cuerpo** + el **PDF** + la prueba. **Cache**: `Cache-Control: public, max-age=300` (sólo en el `200`). `{id}` se toma como entero, como en `/noticias/{id}`.

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
  "imagenes": [ ... ],
  "archivos": [
    { "id": 1414, "nombre": "REGLAMENTO ... .pdf",
      "url": "https://caballoscriollos.com/web/_recursos/noticias/archivos/2026022709574460118.pdf" }
  ],
  "prueba": { "id": 2, "nombre": "Copa Incentivo de Oro" },
  "pdf": "https://caballoscriollos.com/web/_recursos/noticias/archivos/2026022709574460118.pdf"
}
```

- Las claves son las del detalle de noticia, sin `columnista` y con `prueba` y `pdf` al final.
- `cuerpo` es HTML crudo (con las URLs `../_recursos/...` ya reescritas a absolutas).
- `pdf` es una conveniencia: la URL del primer adjunto cuya URL termina en `.pdf` (sin importar mayúsculas, con o sin `?…`); si no hay, la del primer archivo; si no hay adjuntos, `null`. El array `archivos` completo también viene.
- `prueba` = el columnista (o `null`).

**Errores**

- `400` `"ID inválido"` si el id no es un entero positivo.
- `404` `"Reglamento no encontrado"` si no existe, no está vivo, o es una noticia de otra categoría.

---

### Eventos

Eventos del sitio público (`caballos_web.tblEventos`), con categorías asociadas y, opcionalmente, su catálogo y resultados desde el sistema de inscripciones (`caballos_bd`). Sólo se exponen los eventos activos (`IdEstado = 1`). Los endpoints de eventos **no** envían `Cache-Control`.

#### `GET /eventos`

Listado paginado.

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `titulo` | string | — | `LIKE %valor%` sobre `Titulo`. |
| `id_region` | int | — | Filtra por región. `0`, vacío o no numérico: sin filtro. |
| `id_provincia` | int | — | Filtra por provincia. Mismas reglas. |
| `suspendido` | bool | — | `1`, `true`, `yes`, `si`, `sí` (sin importar mayúsculas) ⇒ sólo suspendidos. **Cualquier otro valor** (`0`, `no`, `false`…) ⇒ sólo **no** suspendidos. Vacío: sin filtro. |
| `fecha_desde` | `YYYY-MM-DD` o `DD-MM-YYYY` | — | Pasa el evento si `Fecha >= valor` **o** `FechaHasta >= valor`. |
| `fecha_hasta` | `YYYY-MM-DD` o `DD-MM-YYYY` | — | Pasa el evento si `Fecha <= valor` **o** `FechaHasta <= valor`. |
| `id_categorias` | CSV de ints | — | Ej. `1,5,9`: eventos con **cualquiera** de esas categorías. Las entradas no numéricas o `0` se descartan; si no queda ninguna, sin filtro. |
| `sort` | `fecha_desc` \| `fecha_asc` | `fecha_desc` | `fecha_desc`: `Fecha DESC, id DESC` (sirve para listar pasados). `fecha_asc`: `Fecha ASC, id ASC` (próximos primero). Cualquier otro valor usa el default. |
| `limit` | int | `50` | Se acota a `1..200` (no numérico ⇒ `1`). |
| `offset` | int | `0` | Negativo ⇒ `0`. |

Las dos fechas se validan **sólo por formato** (`\d{4}-\d{2}-\d{2}` o `\d{2}-\d{2}-\d{4}`, `DD-MM-YYYY` se da vuelta). Cualquier otro formato da `400` con `"Formato de fecha inválido para '<param>' (esperado YYYY-MM-DD): <valor>"`.

Params mandados como array (`x[]=...`): `titulo`, `suspendido`, `fecha_desde`, `fecha_hasta` e `id_categorias` dan `500`; `id_region`, `id_provincia`, `limit` y `offset` valen `1`; `sort` se ignora.

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
      "imagen_optimizada": "https://api.caballoscriollos.com/img/eventos/foto_evento.jpg",
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

- `meta` no trae `total`.
- Las fechas salen como `YYYY-MM-DD`, o `null` si están vacías o en `0000-00-00`. `latitud` y `longitud` son **strings** tal como están cargados (pueden venir `""`).
- `region` y `provincia`: `{id, nombre}` o `null` si el evento no la tiene. `id_delegado`: int o `null`.
- `categorias`: puede venir vacío; **sin orden garantizado**.
- `imagen` es el nombre de archivo crudo (puede venir vacío). `imagen_optimizada` es la URL ya armada al endpoint `/img` (resize + recompresión + cache), o `null` si no hay imagen o el nombre no es válido. Ver [Imágenes optimizadas](#imágenes-optimizadas).
- `observaciones`, `descripcion_tarifas` e `informacion_adicional` vienen como HTML. Las `<img src="data:image/...;base64,...">` embebidas por el editor del admin viejo se quitan (ahorran decenas de KB por respuesta).

#### `GET /eventos/{id}`

Detalle: el mismo item del listado, más `vivo_actual` al final (ver [Vivo actual en el detalle del evento](#vivo-actual-en-el-detalle-del-evento)).

`{id}` se toma como entero con las reglas de las convenciones generales (`2057abc` ⇒ `2057`, `2057.9` ⇒ `2057`, `1e3` ⇒ `1`). Un id no numérico, `0` o negativo **no** da `400`: da `404` `"Evento no encontrado"`, igual que un evento inexistente o inactivo.

#### `GET /eventos/{id}/catalogo`

Catálogo de animales inscriptos para el evento. Recibe el `IdEvento` del lado web y resuelve los eventos de inscripción vinculados (puede haber varios). `{id}` sigue la regla de enteros de las convenciones (`2057e1` ⇒ `2057`, `abc` ⇒ `0`). **Nunca da `404`**: un evento inexistente o sin inscripciones devuelve el shape vacío. No envía `Cache-Control`.

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

**Pruebas que se reportan separadas** — dos `IdEventosFuncionalesPrueba` se parten en más de una entrada de `pruebas_funcionales`, según el nombre de la categoría:

| Prueba real | Se separa en | Criterio (por nombre de categoría) |
|---|---|---|
| Freno de Oro (5) | `"Freno de Oro"` y `"Copa Incentivo de Oro"` | categoría contiene "Incentivo" → Copa Incentivo |
| Rodeos (2) | `"Rodeos"` y `"Paleteada"` | categoría contiene "Paleteada" → Paleteada |

Cada parte es una entrada propia de `pruebas_funcionales` (con su `nombre` distinto y sus `categorias`), y aparece inmediatamente después de la prueba de la que se separó. **El `id` es el de la prueba subyacente** (5 para Freno/Copa Incentivo; 2 para Rodeos/Paleteada), así que dos entradas pueden compartir `id` — hay que distinguirlas por `nombre`. Paleteada usa el mismo `yuntas[]` que Rodeos; Copa Incentivo el mismo `animales[]` que las pruebas individuales.

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

**Aparte campero** (prueba `id = 6`): igual que rodeos, no usa `animales[]` sino **`equipos[]`** (es una prueba por equipo). Cada equipo trae su `{ id, nombre }` (de `tblEquipos`, vía `iapf.IdEquipo`) y sus `animales[]` (cada uno con su `jinete`, tomado de `iapf.IdJinete`):

```json
{
  "id": 6,
  "nombre": "Aparte Campero",
  "categorias": [
    {
      "id": 15, "nombre": "A", "clasificacion": "Clasificatoria", "cantidad_clasificatoria": null,
      "equipos": [
        {
          "equipo": { "id": 138, "nombre": "Los Frasqueados" },
          "animales": [
            { "id": "pdre:...", "nombre": "...", "sexo": "M",
              "jinete": { "id": ..., "nombre": "...", "apellido": "..." }, "...": "..." }
          ]
        }
      ]
    }
  ]
}
```

Las demás pruebas funcionales (corral de aparte, freno de oro, FZB, R.J. Dowdall) usan `animales[]` (lista individual), cada animal con su `jinete` de `iapf.IdJinete`.

Si el evento no tiene inscripciones, devuelve el shape vacío con arrays vacíos.

#### `GET /eventos/{id}/resultados`

Premios y puntajes cargados para el evento, agrupados por disciplina (morfología, tipo y aptitud, rodeos). `{id}` sigue la regla de enteros de las convenciones; **nunca da `404`** (un evento inexistente o sin inscripciones devuelve el shape vacío). No envía `Cache-Control`. Las categorías reportan además los animales que **no asistieron** (`ausentes`) y los que fueron **rechazados** (`rechazados`), y parten a los que compitieron en **subcategorías de 6** ordenadas por box.

> **Contrato de orden**: entre entradas o equipos empatados (mismo puntaje o tiempo, o que no corrieron), el orden y el `puesto` **no están garantizados**. Vale para todas las disciplinas de este endpoint, salvo el desempate que una disciplina declare (morfología: por box). En `/api` tampoco lo estaban: variaban entre llamadas.

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
      {
        "categoria": "Categ. Padrillo - 3 años",
        "resultados": [ /* entries — Campeón / Reservado, categorías unificadas */ ]
      }
    ],
    // NOTA: en eventos de categoría B/C/D el "campeonato" no viene por
    // categoría sino por sexo, con el mismo shape que "gran_campeonato":
    //   "campeonato": [ { "sexo": "M", "resultados": [...] }, { "sexo": "H", ... } ]
    "categorias": [
      {
        "id": 95,
        "nombre": "Categ. 17 - Caballo Menor - Montado",
        "tipo_aptitud": false,
        "subcategorias": [
          { "numero": 1, "premios": [ /* ≤6 entries, ordenados por premio */ ] },
          { "numero": 2, "premios": [ /* ... */ ] }
        ],
        "ausentes": [ { "animal": { /* ... */ } } ],
        "rechazados": [
          {
            "animal": { /* ... */ },
            "rechazo": { "tipo": "2", "condicion": "1", "observaciones": "Cojera" }
          }
        ]
      }
    ]
  },
  "tipo_aptitud": {
    "campeonato": [
      { "sexo": "H", "resultados": [ /* ... */ ] }
    ],
    "categorias": [ /* mismo shape: subcategorias / ausentes / rechazados */ ]
  },
  "rodeos": {
    "pruebas": [ /* ver shape más abajo */ ]
  },
  "paleteada": {
    "pruebas": [ /* mismo shape que rodeos (yuntas) */ ]
  },
  "corral_aparte": {
    "pruebas": [ /* ver shape más abajo */ ]
  },
  "aparte_campero": {
    "pruebas": [ /* ver shape más abajo */ ]
  },
  "fzb": {
    "pruebas": [ /* mismo shape que corral_aparte (individual) */ ]
  },
  "freno_oro": {
    "pruebas": [ /* mismo shape que corral_aparte (individual) */ ]
  },
  "copa_incentivo": {
    "pruebas": [ /* mismo shape que corral_aparte (individual) */ ]
  }
}
```

Cada **entry** (dentro de `subcategorias[].premios`, `gran_campeonato[].resultados` y `campeonato[].resultados`) tiene este shape:

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
    "medidas": { "talla": 1.52, "torax": 1.80, "cania": 0.19 },
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

Dentro de `subcategorias[].premios` puede haber entries con **`premio` y `puntaje` en `null`**: son animales que asistieron y no fueron rechazados pero no tienen premio de categoría cargado (ej. su resultado se cargó sólo a nivel campeonato). Se incluyen igual en la subcategoría (ordenados al final, después de los premiados) y el `animal` viene completo.

Un entry de **ausente/rechazado** no lleva `premio` ni `puntaje` — sólo `animal` (mismo shape que arriba). El rechazado agrega `rechazo` con `tipo` / `condicion` / `observaciones` (los códigos crudos del importador, cualquiera puede venir `null`).

**`animal.medidas`** (talla / tórax / caña, tal como se cargan — normalmente en metros, ej. `1.52`) son las de la **inspección** del animal (`tblInspecciones`, la que cargan los importadores de morfología y tipo y aptitud). Es por animal, no por evento; se resuelve por `(Tabla, IdAnimal)` tomando la última inspección aprobada. Si el animal no tiene inspección, los tres campos vienen en `null`. Presente tanto en morfología como en tipo y aptitud (y en los ausentes/rechazados).

Mapeo de `premio.tipo_id`:

| `tipo_id` | `tipo_nombre` | Va a (morfología) | Va a (tipo y aptitud) |
|---|---|---|---|
| 1 | Gran Campeonato | `gran_campeonato` (por sexo) | — |
| 2 | Campeonato | `campeonato` (cat. A: categorías unificadas / cat. B,C,D: por sexo) | `campeonato` (por sexo) |
| 3 | Premios | `categorias[].subcategorias[].premios` | `categorias[].subcategorias[].premios` |
| 4 | Menciones | `categorias[].subcategorias[].premios` | `categorias[].subcategorias[].premios` |
| 5 | Sin Premio | `categorias[].subcategorias[].premios` | `categorias[].subcategorias[].premios` |

**Subcategorías**: no se guardan, se calculan. Por cada categoría se toman **todos** los animales que asistieron y no fueron rechazados — tengan premio de categoría (tipos 3/4/5) o no (esos salen con `premio: null`) — se ordenan por **box ascendente** y se parten en subcategorías lo más **parejas** posible, con un máximo de 6 por subcategoría. La cantidad de subcategorías es `ceil(n/6)` y los animales se reparten equilibradamente; si no divide exacto, las primeras subcategorías tienen un animal más. Ej: 8 → `[4,4]`; 9 → `[5,4]`; 13 → `[5,4,4]`; 12 → `[6,6]`; 23 → `[6,6,6,5]`. Los animales sin box quedan al final. A **igual box** (o sin box), el reparto sigue el orden en que llegan de la base (en `/api`, PHP 5.6, ese empate no tenía un orden garantizado). **La membresía de cada subcategoría se define por box, pero adentro los `premios` vienen ordenados por premio**: primero por tipo (Premios < Menciones < Sin Premio, y los sin premio al final), después por jerarquía dentro del tipo (1° < 2° < 3° < … vía `IdPremio`), puntaje, y a igual logro el **número de box ascendente** como desempate final. Si un animal tiene el mismo resultado cargado más de una vez (fila duplicada) o varios premios en la misma categoría, sólo se devuelve uno (el de mayor jerarquía: menor `tipo_id` gana).

**Campeonato de morfología** (`tipo_id` = 2): el shape depende de la **categoría del evento** (`tblEventosMorfologicosAutoridades.Categoria`, expuesta por fila como `EventoCategoria`):

- **Categoría `A`** (Nacional): las categorías que sólo difieren en la modalidad (Montado/Cabestro) compiten **unificadas**. Se agrupan por (`Desde`, `Hasta`, `Sexo`, `RestaDesde`, `RestaHasta`) y se exponen como `{ categoria, resultados }`, donde `categoria` es el nombre unificado (sin el número ni la modalidad, ej. `"Categ. 4 - Padrillo - 3 años Montado"` + `"Categ. 5 - Padrillo - 3 años Cabestro"` → `"Categ. Padrillo - 3 años"`).
- **Categorías `B`, `C`, `D`** (incluye promocional): el campeonato se muestra **como el gran campeonato**, agrupado por sexo → `{ sexo, resultados }`.

El `gran_campeonato` queda siempre agrupado por sexo (premio cross-categorías), en cualquier categoría.

**Campeonato de tipo y aptitud**: se agrupa por sexo (sin cambios). La columna `Campeonato` de `tblInscripcionResultadosTipoAptitud` marca las rows de campeonato cross-categoría. Sólo las `categorias` de TyA usan el tratamiento de subcategorías/ausentes/rechazados.

Los ausentes/rechazados salen de una query aparte (`findAsistencia`, best-effort: si falla, las categorías salen igual sólo con sus premiados). Se rutean a morfología o TyA según el `TipoAptitud` de su categoría. El orden de sexos dentro de `campeonato` / `gran_campeonato` es estable: primero `M`, luego `H`, luego `C`. Dentro de cada grupo los resultados van por logro (premio/puntaje) y, **a igual logro, por número de box ascendente** (los sin box, al final).

Si el evento no tiene resultados, devuelve el shape vacío con los arrays vacíos en cada disciplina.

**Rodeos**

La key `rodeos.pruebas[]` agrupa por prueba + categoría. Cada prueba expone su `clasificacion` (`Clasificatoria` / `Final` / `TercioFinal` / `CopaEspecial`) y un array de `yuntas`. Cada yunta (par de animales) consolida los dos rows de `tblInscripcionResultadosRodeos` que la componen (dedupe por `IdEquipo`; fallback al par `(IdAnimal, YuntaIdAnimal)` cuando el equipo no está cargado).

**`paleteada`**: las categorías de **Paleteada** (nombre contiene "Paleteada", ej. "Paleteada Brasilera", "Paleteada Campera") pertenecen a la prueba Rodeos (`IdEventosFuncionalesPrueba = 2`) y se puntúan igual (misma tabla, mismo shape de `yuntas`), pero se informan en una **key aparte** `paleteada`, fuera de `rodeos`. Mismo shape que `rodeos.pruebas[]`; el `prueba.nombre` anidado se expone como `"Paleteada"` (aunque el `prueba.id` subyacente sigue siendo `2`).

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
            "dia1": 88.5, "dia2": 86,
            "total_handicap_1": 78.5, "total_handicap_2": 76,
            "total_c_1": 78.5, "total_c_2": 76,
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
- **Totales** (`totales.dia1`, `dia2`, `total_handicap_*`, `total_c_*`): `(float|null)`. Pueden traer decimales porque la morfología (paso 0.25) suma al total. Los puestos, handicaps (`h*`) y desempates son enteros; `morfologia_1` / `morfologia_2` son float.
- **`ultima_dia1` / `ultima_dia2`**: número de la última vaca **del día** (1..12) con dato no-null. Por ej. `ultima_dia2 = 4` significa que el día 2 se procesaron hasta la Vaca16 (la 4ta del día). `null` si todavía no se cargó ninguna en ese día. No incluye los desempates (vaca25/26/27).
- **CopaEspecial**: solo un día, sin handicap ni Total C. En esas yuntas, los campos `dia2`, `total_handicap_*`, `total_c_*`, `desempate_dia2`, `vacas.dia2`, `vacas.extras.vaca26`, `vacas.extras.vaca27`, `puesto_dia2`, `puesto.handicap` / `puesto.c` y los `handicaps.h*` salen en `null`. `handicaps` **siempre viene como objeto** (nunca `null`): en CopaEspecial los `h*` van en `null` pero `morfologia_1` / `morfologia_2` traen valor, porque la morfología sí se puntúa. El cliente discrimina por `clasificacion === "CopaEspecial"`.
- **Morfología sin vacas**: si de una yunta solo se cargó la planilla de morfología (ninguna vaca todavía), `totales.dia1` es igual al puntaje de morfología (`morfologia_1 + morfologia_2`) y `vacas.dia1` viene todo en `null`. El día 2 solo suma la morfología si tiene alguna vaca cargada.
- **Equipo** vs **Equipo2**: `equipo` es el equipo del jinete principal (`IdJinete`), `equipo2` el del jinete secundario (`IdJinete2`). Cualquiera puede ser `null` si la inscripción no tiene equipo cargado.
- **Orden** de las yuntas dentro de la categoría:
  - Si `clasificacion === "Clasificatoria"`: por **número de yunta** (orden de salida, `iapf.Posicion`) ascendente — **no** por puntaje. Las yuntas sin número van al final.
  - En el resto (`Final`, `SemiFinal`, `CopaEspecial`, …): por `puesto.general` ASC (los `null` al final), desempate por total descendente (`dia1 + dia2`). Para CopaEspecial, sin puesto, sale por `dia1` descendente.
  - (Este orden aplica solo al listado de resultados del evento; el endpoint de detalle por equipo no ordena.)
- Solo se incluyen pruebas con resultados cargados (`iapf.IdEventosFuncionalesPrueba = 2`). Pruebas dadas de alta sin yuntas no aparecen.

**Shape de `corral_aparte`** (prueba funcional `IdEventosFuncionalesPrueba = 3`), **de `fzb`** (`IdEventosFuncionalesPrueba = 1`) **y de `freno_oro`** (`IdEventosFuncionalesPrueba = 5`): las tres son pruebas funcionales **individuales** (un animal/jinete por resultado, sin yuntas ni equipos) y comparten exactamente el mismo shape. Agrupa por prueba + categoría, y dentro de cada categoría los resultados vienen ordenados por `total` descendente.

```json
"corral_aparte": {
  "pruebas": [
    {
      "prueba":    { "id": 3, "nombre": "Corral de aparte" },
      "categoria": { "id": 9, "nombre": "A" },
      "clasificacion": "Final",
      "cantidad_clasificatoria": null,
      "resultados": [
        {
          "puesto": 1,
          "total": 35.5,
          "animal": {
            "id": "pdre:...", "box": ..., "nombre": "...", "sba": ..., "rp": ...,
            "sexo": "M", "fecha_nacimiento": "YYYY-MM-DD", "pelaje": "...", "cabania": "...",
            "jinete": { "id": ..., "nombre": "...", "apellido": "..." },
            "id_evento_inscripcion": 3041
          }
        }
      ]
    }
  ]
}
```

**Reglas**:
- `puesto`: posición 1-based por `total` descendente dentro de la categoría (la columna `Puesto` de la base no se calcula, se deriva del orden).
- `total`: `(float|null)`. El jinete va dentro de `animal.jinete` (igual que en rodeos).
- Solo se incluyen categorías con resultados cargados (`iapf.IdEventosFuncionalesPrueba = 3` para corral, `= 1` para fzb, `= 5` para freno_oro). `fzb` y `freno_oro` usan el mismo objeto por resultado (`{ puesto, total, animal }`).

**Shape de `copa_incentivo`** (Copa Incentivo de Oro, "CIO"): es una **categoría de la prueba Freno de Oro** (`IdEventosFuncionalesPrueba = 5`, categorías cuyo nombre contiene "Incentivo": 30/31/32/34/35/36) pero con **carga de resultados propia**, en `tblInscripcionResultadosCio` (no en la tabla del freno clásico). Por eso va en una clave aparte, aunque comparte exactamente el mismo shape individual que `freno_oro` (`{ puesto, total, animal }`, agrupado por categoría, ordenado por `total` descendente). No hay solapamiento con `freno_oro`: `copa_incentivo` lee la tabla CIO y `freno_oro` lee la tabla del freno **excluyendo además** las categorías "Incentivo" (por si hubiera datos legacy en la tabla del freno), así que las categorías CIO **no** aparecen en `freno_oro` ni viceversa.

**Shape de `aparte_campero`** (prueba funcional `IdEventosFuncionalesPrueba = 6`): es **por equipo** (una tropilla de animales que aparta junta; la tabla guarda una fila por animal con los datos del equipo copiados). El puntaje es **TIEMPO** (segundos), no puntos: gana el de **menor** tiempo. Agrupa por prueba + categoría, y dentro de cada categoría los equipos vienen ordenados por `tiempo` ascendente (los que no corrieron van al final).

```json
"aparte_campero": {
  "pruebas": [
    {
      "prueba":    { "id": 6, "nombre": "Aparte Campero" },
      "categoria": { "id": 15, "nombre": "A" },
      "clasificacion": "Clasificatoria",
      "cantidad_clasificatoria": null,
      "equipos": [
        {
          "puesto": 1,
          "equipo": { "id": 138, "nombre": "Los Frasqueados" },
          "tiempo": 52,
          "rondas": [
            { "tiempo": 52, "encerradas": 6 },
            { "tiempo": 0,  "encerradas": 0 }
          ],
          "animales": [
            { "id": "pdre:...", "nombre": "...", "sba": ..., "rp": ..., "sexo": "M",
              "jinete": { "id": ..., "nombre": "...", "apellido": "..." }, "...": "..." }
          ]
        }
      ]
    }
  ]
}
```

**Reglas**:
- `tiempo`: tiempo total en segundos = `Total1 + Total2` (`int|null`); `null` solo si ambas rondas son null. **Gana el menor tiempo**: los equipos se ordenan por `tiempo` ascendente.
- `puesto`: posición 1-based en ese orden. Los equipos que **no corrieron** (tiempo `0` o `null`) van al final y con `puesto: null`.
- ⚠️ **Empates**: entre equipos con el **mismo tiempo** (y entre los que no corrieron), el orden, y con él el `puesto` de los empatados, **no está garantizado** (ver el contrato de orden de [`GET /eventos/{id}/resultados`](#get-eventosidresultados)).
- `rondas`: siempre 2 entradas (ronda 1 y 2), cada una con su `tiempo` (`Total1`/`Total2`) y las vacas `encerradas` (`TotalEncerradas1`/`TotalEncerradas2`).
- `equipo`: `{ id, nombre }` del equipo (`tblEquipos`); `nombre` puede ser `null` si el equipo no está cargado.
- `animales`: los animales del equipo (`IdEquipo`), cada uno con su `jinete` dentro (igual que en rodeos/corral).
- Solo se incluyen categorías con resultados cargados (`iapf.IdEventosFuncionalesPrueba = 6`).

#### `GET /eventos/{id}/resultados/{prueba}/{target}`

Desagregado (detalle) de **un** resultado: muestra los sub-puntajes que suman el
`total`. Pensado para el detalle al hacer clic en un resultado del endpoint de
resultados. **No** envía `Cache-Control`.

- `{id}`: el `IdEvento` del lado web, con la regla de enteros de las convenciones.
- `{prueba}`: `fzb` | `corral_aparte` | `copa_incentivo` | `rodeos`, sin importar mayúsculas.
- `{target}` (se acepta URL-encoded, ej. `pdre%3A1`):
  - para `fzb`, `corral_aparte` y `copa_incentivo` → **id de animal** (mismo
    formato compuesto que el resto de la API: `pdre:12345`, `exis:9999`,
    `extr:777`; el prefijo sin importar mayúsculas; el número, sólo dígitos).
  - para `rodeos` → **`IdEquipo`**: sólo dígitos y mayor que 0 (`0770` vale como `770`; `7e2` no).

**Errores** (en este orden):

- `404` `"No hay inscripciones para el evento <id>."` — se chequea primero, antes que la prueba y el target.
- `400` `"Prueba no soportada: \"<prueba>\". Válidas: fzb, corral_aparte, copa_incentivo, rodeos."`
- `400` `"Target inválido para <prueba>: se espera un id de animal (ej. exis:131826)."` (fzb, corral_aparte, copa_incentivo)
- `400` `"Target inválido para rodeos: se espera el IdEquipo (entero)."`
- `404` `"Sin resultado de <prueba> para <target> en el evento."` (fzb, corral_aparte, copa_incentivo)
- `404` `"Sin resultados de rodeos en el evento."` / `"Sin resultado de rodeos para el equipo <IdEquipo> en el evento."`

**`fzb`** — los 9 rubros del reglamento suman el `total`:

```json
{
  "prueba":    { "id": 1, "nombre": "F.Z.B." },
  "categoria": { "id": 7, "nombre": "B" },
  "clasificacion": "Final",
  "cantidad_clasificatoria": null,
  "animal": { "id": "pdre:121734", "nombre": "...", "jinete": { "...": "..." }, "...": "..." },
  "total": 43.5,
  "puesto": null,
  "detalle": {
    "rubros": {
      "morfologia": 0, "andares": 6, "rayada": 8, "troya": 6, "ocho": 5.5,
      "volapie": 8.5, "vuelta": 0, "desmontar": 4, "retroceso": 5.5
    },
    "total": 43.5
  }
}
```

**`corral_aparte`** — dos rondas; cada ronda con sus 3 apartes (`aparte` + 2
`apretadas` = `subtotal`), la `morfologia` y el `total` de ronda. La suma de los
`total` de ronda da el `total` general:

```json
{
  "prueba":    { "id": 3, "nombre": "Corral de aparte" },
  "categoria": { "id": 10, "nombre": "B" },
  "animal": { "id": "pdre:88846", "...": "..." },
  "total": 31, "puesto": null,
  "detalle": {
    "rondas": [
      {
        "ronda": 1,
        "apartes": [
          { "aparte": 8,   "apretadas": [2.5, 1.5], "subtotal": 12 },
          { "aparte": 7.5, "apretadas": [0.5, 0.5], "subtotal": 8.5 },
          { "aparte": 9,   "apretadas": [0.5, 1],   "subtotal": 10.5 }
        ],
        "morfologia": 0, "total": 31, "puesto": null
      },
      { "ronda": 2, "apartes": [ /* ... */ ], "morfologia": null, "total": 0, "puesto": null }
    ],
    "total": 31
  }
}
```

**`copa_incentivo`** (Copa Incentivo de Oro) — la planilla se organiza en
**bloques**; cada rubro tiene sus dos vueltas (`v1`, `v2`) y un `total`
ponderado. Los `parciales` (`total1..4`) son los promedios acumulados que se van
sumando bloque a bloque, y `total` es el promedio final (÷7):

```json
{
  "prueba":    { "id": 5, "nombre": "Freno de Oro" },
  "categoria": { "id": 35, "nombre": "Copa Incentivo de Oro – Jinetes amateur" },
  "clasificacion": "Clasificatoria",
  "animal": { "id": "pdre:120174", "...": "..." },
  "total": 10.55, "puesto": null,
  "detalle": {
    "bloques": {
      "morfologia": { "v1": 8, "v2": null, "total": 8 },
      "andares": {
        "tranco": { "v1": 7,   "v2": null, "total": 2.8 },
        "trote":  { "v1": 6.5, "v2": null, "total": 4.55 },
        "galope": { "v1": 7.5, "v2": null, "total": 3 },
        "total": 10.35
      },
      "figura": { "v1": 8, "v2": null, "total": 12 },
      "esb": {
        "vsp":     { "v1": 7,   "v2": null, "total": 3.5 },
        "rayada1": { "v1": 6,   "v2": null, "total": 3 },
        "rayada2": { "v1": 6.5, "v2": null, "total": 3.25 },
        "total": 9.75
      },
      "escaramuza": { "v1": 8.5, "v2": null, "total": 12.75 },
      "bayard":     { "v1": 7.5, "v2": null, "total": 11.25 },
      "campo": {
        "paleteada1": { "v1": 6, "v2": null, "total": 4.5 },
        "paleteada2": { "v1": 7, "v2": null, "total": 5.25 },
        "total": 9.75
      }
    },
    "parciales": { "total1": 10.117, "total2": 10.025, "total3": 10.57, "total4": 10.68 },
    "total": 10.55
  }
}
```

- `v2` trae la segunda vuelta solo en instancias `Final` (en clasificatoria queda
  en `null`). Cada `total` de rubro ya viene ponderado (los coeficientes del
  reglamento) y los de bloque (`andares`, `esb`, `campo`) son la suma de sus
  rubros. Los `parciales` acumulan Morfología+Andares+Figura (`total1`, ÷3), +ESB
  (`total2`, ÷4), +Escaramuza (`total3`, ÷5), +Bayard (`total4`, ÷6), y `total`
  suma Campo (÷7).

**`rodeos`** — devuelve la yunta donde participa el equipo, con el desagregado
**vaca por vaca** por día, handicaps, morfología y totales. El `detalle` es el
mismo objeto `yunta` del shape de `rodeos` del endpoint de resultados (`vacas`,
`handicaps`, `totales`, `puesto`, `animales`, `equipo`/`equipo2`):

```json
{
  "prueba":    { "id": 2, "nombre": "Rodeos" },
  "categoria": { "id": 1, "nombre": "A" },
  "clasificacion": "CopaEspecial",
  "equipo": { "id": 223, "animales": [ /* ... */ ] },
  "detalle": {
    "totales":   { "dia1": 50.5, "dia2": null, "total_handicap_1": null, "...": "..." },
    "puesto":    { "general": 8, "handicap": null, "c": null },
    "handicaps": { "morfologia_1": 6, "morfologia_2": 8.5, "...": "..." },
    "vacas":     { "dia1": [0, 0, 15, 10, 3, 8, 0, 0, null, null, null, null], "dia2": null, "extras": { "...": "..." } },
    "animales":  [ /* ... */ ],
    "equipo": { "...": "..." }, "equipo2": { "...": "..." }
  }
}
```

Notas:
- El match del equipo se hace contra el `IdEquipo`/`IdEquipo2` **crudo** de las
  filas; si `tblEquiposRodeosAnimales` no tiene los animales cargados,
  `equipo.animales` sale vacío pero el resto del desagregado igual se informa.
- Solo yuntas con `IdEquipo` cargado son consultables por este endpoint (las que
  se parean por `YuntaIdAnimal` sin equipo no tienen id de equipo).

---

### Imágenes optimizadas

Sirve versiones **redimensionadas y recomprimidas** de las imágenes que ya viven en disco bajo `_recursos/`. Pensado para que la app baje imágenes livianas en vez del original pesado que se subió por el admin. La reducción típica es del **85–97%** (un PNG de ~1 MB queda en ~40–130 KB según ancho y formato).

#### `GET /img/{coleccion}/{archivo}`

- `coleccion`: `noticias` | `eventos` (whitelist).
- `archivo`: el nombre de archivo tal como aparece en los campos de imagen de la API (ej. `2026062403064981243.png`). El endpoint resuelve internamente la carpeta `big/` de esa colección. Tiene que ser `[A-Za-z0-9._-]+` con extensión `jpg`, `jpeg`, `png`, `gif` o `webp` (sin importar mayúsculas); el archivo resuelto tiene que quedar dentro de esa carpeta.

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `w` | int | `1280` | Ancho máximo en px. Se acota a `64..2560`: un valor menor sube a `64`, uno mayor baja a `2560`; `0`, vacío o no numérico ⇒ `1280` (enteros con las reglas de las convenciones: `2e3` ⇒ `2` ⇒ `64`). **Nunca agranda**: si el original es más angosto, sale con su ancho. El alto mantiene la proporción. |
| `q` | int | `82` (jpg) / `80` (webp) | Calidad. Se acota a `40..92`; `0`, vacío o no numérico ⇒ el default. |
| `fmt` | `auto` \| `jpg` \| `jpeg` \| `webp` | `auto` | Sin importar mayúsculas. `jpg`/`jpeg` ⇒ JPEG. `webp` ⇒ WebP si el server tiene GD con WebP (si no, JPEG). `auto`, o cualquier otro valor, negocia: WebP si el header `Accept` contiene `image/webp` y el server lo soporta; si no, JPEG. Mandado como array (`fmt[]=`) da `500`. |

**Response**: la imagen **binaria** (`Content-Type: image/webp` o `image/jpeg`), no JSON. La salida es siempre JPEG o WebP, sea cual sea el original: un PNG con transparencia que sale como JPEG se aplana sobre blanco (en WebP se conserva el alfa).

**Errores** (JSON, con el envelope estándar)

- `404` `"Colección de imágenes desconocida"`
- `404` `"Nombre de archivo inválido"`
- `404` `"Imagen no encontrada"` (no existe, o cae fuera de la carpeta de la colección)

**Headers**

- `Cache-Control: public, max-age=31536000, immutable` + `ETag` + `Last-Modified` — cacheable agresivamente. Soporta `304 Not Modified` sin body: `If-None-Match` igual al `ETag`, o `If-Modified-Since` igual o posterior a la fecha del original. El `ETag` cambia con el original y con cada parámetro (`w`, `q`, formato resultante).
- `Vary: Accept` — la salida depende de si el cliente acepta WebP.

**Comportamiento**

- El resultado se cachea en disco en `apiv2/var/img/<2 chars>/<hash>.<ext>` (separado de la cache de `/api`), con clave por `archivo + mtime + params`. Reprocesa solo si cambió el original o algún parámetro.
- **Degrada con elegancia**: sin GD, imagen > 40 MP, o formato no decodificable ⇒ sirve el original sin transcodificar, con su `Content-Type` real (`application/octet-stream` si no se reconoce). Si `var/` no es escribible, sirve igual pero sin persistir el cache (re-procesa en cada request).

**De dónde sale el `archivo`**

Las respuestas de noticias y eventos ya incluyen la URL armada a este endpoint:

- Noticias: `imagen.optimizada` (listing) y `imagenes[].urls.optimizada` (detalle).
- Eventos: `imagen_optimizada`.

**Ejemplos**

```bash
# Optimizada con defaults (máx 1280px, WebP si el cliente lo acepta)
curl "https://api.caballoscriollos.com/img/noticias/2026062403064981243.png"

# Thumbnail chico para un listado
curl "https://api.caballoscriollos.com/img/noticias/2026062403064981243.png?w=400&q=70"

# Forzar JPEG (cliente sin soporte WebP)
curl "https://api.caballoscriollos.com/img/eventos/foto_evento.jpg?fmt=jpg"
```

---

### Vivos (transmisiones en vivo)

Transmisiones en vivo asociadas a eventos. Cada vivo es un rango horario único `{fecha, hora_inicio, hora_fin}` con título, descripción, link a la página que transmite y/o link de YouTube. Un evento puede tener N vivos (varios días, varios bloques por día). Las horas se interpretan como **Argentina (UTC-3)** y se devuelven sin offset. **Cache** de los tres endpoints: `Cache-Control: public, max-age=60` (sólo en el `200`; el `estado` se invalida cada minuto).

Cada vivo trae un campo `estado` calculado contra la hora actual de Argentina:

| `estado` | Cuándo |
|---|---|
| `proximo` | todavía no empezó: ahora `<` `fecha hora_inicio` |
| `pasado`  | ya terminó: ahora `>=` `fecha hora_fin` |
| `en_vivo` | en el medio: `hora_inicio <= ahora < hora_fin` del día del vivo |

#### `GET /vivos`

Listado global con filtros.

**Query params** (ninguno da `400`: lo inválido se ignora)

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `evento_id` | int | — | Filtra por evento. `0`, vacío o no numérico: sin filtro. |
| `estado` | `en_vivo` \| `proximo` \| `pasado` | — | Filtra por estado actual (mismas reglas que la tabla de arriba). Otro valor: sin filtro. |
| `fecha_desde` | `YYYY-MM-DD` | — | `Fecha >= valor`. Formato estricto; inválida ⇒ se ignora. |
| `fecha_hasta` | `YYYY-MM-DD` | — | `Fecha <= valor`. Mismas reglas. |
| `limit` | int | `50` | Se acota a `1..200` (no numérico ⇒ `1`). |
| `offset` | int | `0` | Negativo ⇒ `0`. |

Params mandados como array: `fecha_desde` y `fecha_hasta` dan `500`; `evento_id`, `limit` y `offset` valen `1`; `estado` se ignora.

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

Orden: `Fecha ASC, HoraInicio ASC, id ASC`. `hora_inicio` / `hora_fin` vienen como `HH:MM` (o `null`). `evento.titulo` es `null` si el evento ya no existe.

#### `GET /vivos/{id}`

Detalle de un vivo: el mismo item del listado.

- `400` `"ID inválido"` si el id no es un entero positivo.
- `404` `"Vivo no encontrado"` si no existe.

#### `GET /eventos/{id}/vivos`

Todos los vivos de un evento (hasta 200), en el mismo orden que el listado. **Nunca da `404`**: un evento sin vivos, o inexistente, devuelve `data: []`.

**Response**

```json
{
  "id_evento": 2057,
  "data": [ /* items como los de GET /vivos, incluido "evento" */ ],
  "meta": { "count": 5 }
}
```

- `400` `"ID de evento inválido"` si el id no es un entero positivo.

#### Vivo actual en el detalle del evento

`GET /eventos/{id}` incluye un campo `vivo_actual` con el vivo que está `en_vivo` ahora para ese evento (si hay varios solapados, el que empieza primero), o `null` si no hay ninguno corriendo. Sirve para mostrar el botón de "Ver transmisión" sin una segunda request. Es el item de `/vivos` **sin** `evento`:

```json
{
  "id": 2057,
  "titulo": "Expo Nacional 2026",
  "...": "...",
  "vivo_actual": {
    "id": 12,
    "titulo": "Aparte vacuno — Mañana",
    "descripcion": "Pruebas de aparte campero",
    "link_pagina": "https://...",
    "link_youtube": "https://youtube.com/watch?v=xxx",
    "fecha": "2026-04-10",
    "hora_inicio": "09:00",
    "hora_fin": "11:00",
    "estado": "en_vivo"
  }
}
```

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

---

### Notificaciones

Notificaciones que alimentan la **campanita** de la app: un log centralizado de los avisos que se quieren mostrar al usuario (y que eventualmente se envían por push). Hoy son **broadcast** (todas las notifs van a todos los dispositivos); cuando se sume login a la app, la misma tabla soporta notifs per-user vía el campo `IdUsuario`.

**Modelo cliente (recomendado)**

1. La app guarda en `AsyncStorage` un único valor: `lastSeenAt` (timestamp).
2. Al cargar la home: `GET /notificaciones?since={lastSeenAt}` — el badge de la campanita es `meta.total`.
3. Al abrir la campanita: `GET /notificaciones?limit=20`, mostrar lista. Al cerrar (o al primer scroll): setear `lastSeenAt = now` localmente.
4. Al tocar una notif: navegar usando `target.tipo + target.id` (deeplink interno) o `target.url` (link externo). Si `target` es `null`, no hace nada al tocarla.

#### `GET /notificaciones`

Listado paginado, orden por **momento de envío** descendente (`FechaEnvio DESC, IdNotificacion DESC`). **Cache**: `Cache-Control: public, max-age=30` (corto para no atrasar el badge).

**Solo se devuelven notificaciones efectivamente enviadas** (`EstadoEnvio = enviado`). Las que están programadas para el futuro o todavía pendientes de envío **no aparecen** hasta que el push sale; las anuladas y las que fallaron tampoco. En consecuencia, el campo `fecha` de cada notif es el **instante del envío real** (no el de creación ni el de programación), y tanto el orden como el filtro `since` se basan en ese instante.

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `since` | `YYYY-MM-DD HH:MM:SS` o ISO 8601 | — | Sólo notifs **enviadas** estrictamente después de `valor` (`FechaEnvio > valor`). Útil para "traeme lo nuevo desde mi último check" (poll del badge). Acepta lo que entienda el parser de fechas de **PHP 8**, incluidos relativos como `yesterday`. Ese parser no es idéntico al de `/api` (PHP 5.6): ver [Cambios respecto de `/api`](#cambios-respecto-de-api). Sin TZ se interpreta como Argentina; con TZ (`…Z`, `-03:00`) se convierte a Argentina. Lo que no se pueda leer se ignora (sin `400`). |
| `tipo` | string | — | Filtra por tipo exacto (`generico`, `vivo`, `evento`, `noticia`). No se valida: un tipo desconocido da `data: []`. |
| `limit` | int | `50` | Se acota a `1..200` (no numérico ⇒ `1`). |
| `offset` | int | `0` | Negativo ⇒ `0`. |

Params mandados como array: `tipo` da `500`; `since` se ignora; `limit` y `offset` valen `1`.

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

- `target` es `null` si la notif no tiene `TargetTipo`, `TargetId` ni `TargetUrl`. Si no, es `{tipo, id, url}`: `tipo` e `id` vienen si hay tipo o id cargado (`null` si no), y `url` si hay URL (`null` si no). En la práctica:
  - `{ tipo, id, url:null }` — deeplink interno a un recurso de la app (vivo/evento/noticia + id).
  - `{ tipo:null, id:null, url }` — link externo (browser).
- `target.id` es **string**.
- `fecha` se devuelve en horario Argentina sin offset (consistente con el resto de la API) y corresponde al **momento del envío real** del push.

**Caso especial `target.tipo = "vivo"`**

El operador del admin elige un vivo puntual del listado (`tblEventoVivos`), pero el cliente normalmente quiere abrir la pantalla del **evento** padre (donde se ve el vivo y el resto del catálogo). Por eso:

- `target.tipo` queda en `"vivo"` para que la app pueda mostrar un ícono o copy distinto al `"evento"` genérico si quiere ("ESTÁ EN VIVO" vs "Evento próximo").
- `target.id` se devuelve **resuelto al `IdEvento` del evento padre**, no al `IdEventoVivo`. La app navega a `/eventos/{target.id}` sin tener que hacer otro lookup.
- Si el vivo fue eliminado entre el momento del envío y el de consumo de la notif, el endpoint deja `target.id` como el id original del vivo (fallback). La app puede usar eso para detectar "vivo borrado" o simplemente no navegar.

Para los otros tipos (`"evento"`, `"noticia"`), `target.id` es el id directo del recurso.

#### `GET /notificaciones/{id}`

Detalle de una notificación: el mismo item del listado (con la misma resolución de `target` para vivos). **Cache**: `Cache-Control: public, max-age=300` (sólo en el `200`).

- `400` `"ID inválido"` si el id no es un entero positivo.
- `404` `"Notificación no encontrada"` si no existe, está eliminada (`IdEstado = 0`) o todavía no se envió.

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
| `token` | string (1–500 **bytes**) | sí | Token del dispositivo (APNs / FCM / Web Push). Se le hace `trim`. |
| `plataforma` | `ios` \| `android` \| `web` | sí | Whitelist estricta y en minúsculas (`IOS` da 400). Se le hace `trim`. |
| `device_id` | string (hasta 256 bytes) | no | Identificador opcional del dispositivo. Vacío o ausente se guarda como `null`. |

Con `Content-Type: application/json` (sin importar mayúsculas, con o sin `; charset=…`) el body tiene que ser JSON. Con cualquier otro `Content-Type` se leen los campos del form (`x-www-form-urlencoded` o `multipart`).

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
- Re-registrar un token que el backend había dado de **baja** (Expo respondió `DeviceNotRegistered`) lo **reactiva**: vuelve a recibir pushes. La respuesta es la de un re-registro (`created: false`). (#83)

**Errores**

- `400` con uno de estos `message`:
  - `"Body inválido (esperado JSON object)"`: con `Content-Type: application/json`, el body no es un objeto ni un array JSON (JSON roto, un string, un número).
  - `"Falta el campo 'token'"`: falta, o queda vacío después del `trim`.
  - `"El campo 'token' excede 500 caracteres"`: el límite se cuenta en **bytes**.
  - `"Campo 'plataforma' inválido (esperado: ios | android | web)"`.
  - `"El campo 'device_id' excede 256 caracteres"`: en bytes.
- `500` si `token`, `plataforma` o `device_id` llegan como array (`token[]=…`).
- `405` — método ≠ POST (`GET`, `HEAD`…). `OPTIONS` da `204` (preflight CORS).

**Ejemplos**

```bash
# JSON (típico desde React Native / fetch)
curl -X POST -H 'Content-Type: application/json' \
     -d '{"token":"abc123","plataforma":"ios","device_id":"iphone-juan"}' \
     https://api.caballoscriollos.com/push/register

# Form-urlencoded (fallback)
curl -X POST -d 'token=xyz&plataforma=android' \
     https://api.caballoscriollos.com/push/register
```

**Migración requerida**

La tabla `tblPushTokens` (DB `caballos_bd`) se crea con `docker/db/migrations/2026-06-05_push_tokens.sql`. Aplicar a mano en producción antes de desplegar.

---

### Rankings

Rankings del sitio. Todos comparten un mismo shape de **tabla genérica** (`columnas` + `filas`) para que el cliente los renderice con un único componente. Los datos NO se calculan en la API: reusa los mismos endpoints JSON del admin que ya alimentan los reportes (mismo SQL testeado), y los normaliza.

Hay dos familias de rankings:
- **Individuales / propietario** (una fila por animal o propietario): `solanet`, `freno`, `cio`, `fzb`, `corral_analitico`, `corral_general`. La fila es plana.
- **De equipo** (`familia: "equipo"`): `rodeos`, `apartes_analitico`, `apartes_general`. Además de las `columnas` escalares, cada fila trae un array `animales` con los miembros del equipo (cada uno con su `animalId` para el pedigree). Ver [Rankings de equipo](#rankings-de-equipo).

Además, `paleteada` (Paleteada Campera) figura en el catálogo pero **no tiene cálculo propio**: `GET /rankings/paleteada` acepta sólo el filtro `anio` y responde según `rankings_pdf.json`: `modo: "pdf"` para los años con PDF cargado y `modo: "not_available"` para los demás (el default de `anio` es el año corriente); nunca `ranking` ni `filas`.

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

Datos de un ranking como tabla genérica. Los filtros van como query params (ver el catálogo); si se omiten o vienen vacíos, se usa el default. **Los valores no se validan**: se pasan al cálculo tal cual (`anio=abc` no da 400), y `meta.filtros` los devuelve como llegaron (string si vinieron por query, número si es el default). **Cache**: `300`.

Ej: `GET /rankings/freno?anio=2026&categoria=23`

```json
{
  "slug": "freno",
  "titulo": "Freno de Oro — Ranking General",
  "subtitulo": "Adultos Montado",
  "familia": "individual",
  "modo": "ranking",
  "pdf_url": null,
  "columnas": [
    { "key": "position", "label": "#" },
    { "key": "sba", "label": "SBA" },
    { "key": "animal", "label": "Animal" },
    { "key": "rider", "label": "Jinete" },
    { "key": "ownet", "label": "Propietario" },
    { "key": "event", "label": "Evento" },
    { "key": "date", "label": "Fecha" },
    { "key": "points", "label": "Puntaje" }
  ],
  "filas": [
    { "position": 1, "idAnimal": 1000, "tabla": "IdPdre", "animalId": "pdre:1000",
      "sba": "3501 D", "animal": "CARDAL X",
      "rider": "Juan", "ownet": "Cabaña Z", "event": "Expo Nacional", "date": "01/03/2026", "points": 87.5 }
  ],
  "meta": { "count": 1, "filtros": { "anio": 2026, "categoria": 23 } }
}
```

- **Renderizado**: recorrer `columnas` en orden y, por cada fila, mostrar `fila[columna.key]`. Las `columnas` varían por ranking (ej. Solanet: `propertyNumber`/`name`/`cabin`/`points`; Corral: agrega `rp`).
- **Pedigree**: en los rankings por animal (`freno`, `cio`, `fzb`, `corral_analitico`, `corral_general`), cada fila trae además `idAnimal`, `tabla` y `animalId` (id compuesto ya armado, ej. `"pdre:1000"`). Estos campos **no** están en `columnas` (no se muestran); son para linkear a `GET /animales/{animalId}/pedigree`. El ranking `solanet` es por propietario (sin animal por fila); su detalle está abajo.
- `subtitulo` es la categoría/premio resuelto (o `null`; con `modo` ≠ `ranking` siempre `null`).
- **E3 (la web consume esta ruta)**: `origen` trae, con `modo` = `ranking`, lo que el cálculo devuelve además de las filas (`category` en los individuales; `title`, `subtitle` y `updated` en rodeos; `{}` si nada), tal cual, y `null` con `modo` ≠ `ranking`; en `solanet` además `premio` (`name`, `subtitle`, `subtitle2` del encabezado del premio, o `null` si no se pudo leer). Y el query `calculado=1` **saltea los overrides** de abajo (`pdf`/`not_available`) y devuelve el ranking calculado: lo usa la web para mostrar lo mismo que hoy; sin el parámetro la respuesta no cambia. La app no necesita nada de esto.
- `404` `Ranking desconocido: <slug>` si el `slug` no existe.
- Los datos se consultan al admin con un cache de 30 s; en el primer acceso tras ese tiempo la respuesta puede tardar unos segundos, y si el admin no responde la API devuelve `500`.

**`modo`** indica qué trae la respuesta (según la config `src/apiv2/config/rankings_pdf.json`, por ranking + filtros):

| `modo` | Qué mostrar | Campos relevantes |
|---|---|---|
| `ranking` | La tabla calculada (comportamiento normal) | `columnas` + `filas` |
| `pdf` | Un botón/enlace "Ver ranking" que abre el PDF | `pdf_url` (string) |
| `not_available` | Un aviso "no disponible" para esa combinación de filtros | — (`filas` vacío, `pdf_url` null) |

El `modo` depende de la combinación de filtros elegida (mismos filtros de siempre: año, categoría, etc.), así que un mismo ranking puede devolver `ranking` para un año/categoría y `pdf` o `not_available` para otro. Cuando `modo` ≠ `ranking`, `filas` viene vacío y no se consulta el cálculo. La app debe rutear por `modo` (mostrar tabla / botón de PDF / aviso).

Los overrides se configuran en **`src/apiv2/config/rankings_pdf.json`**:

```json
{
  "freno": {
    "2026|23": { "pdf": "https://drive.google.com/file/d/XXX/view" },
    "2026|24": { "not_available": true }
  },
  "rodeos": {
    "22|1": { "pdf": "https://..." }
  }
}
```

La clave de primer nivel es el `slug` del ranking; la de segundo nivel son los valores de **todos los filtros en orden unidos por `|`** (incluye el año — ej. freno `"año|categoria"`, rodeos `"calendario|tipo"`). Lo que no esté en el archivo devuelve el ranking calculado. Si el archivo falta o el JSON es inválido, no se aplica ningún override (best-effort).

Además, la clave global `"_anios_not_available": [2027]` marca años enteros como `not_available` para **todos** los rankings que tengan filtro de año (freno/cio/fzb/corral/apartes), salvo que haya un override específico para esa (ranking, año, categoría). No afecta a rodeos (filtro por calendario) ni a solanet (por premio). Sirve para "abrir" un año nuevo sin datos. Los años ofrecidos van de `ANIO_MIN` hasta `max(año del sistema, ANIO_MAX)` (constantes del `RankingHandler`), así que un año futuro se puede ofrecer antes de que corra el calendario.

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
      "idAnimal": "132977", "tabla": "IdExis", "animalId": "exis:132977" }
  ],
  "meta": { "count": 7, "filtros": { "premio": 1, "propietario": "221" } }
}
```

> **Pedigree en el detalle Solanet**: `tblMeritosSolanet` no guarda `IdAnimal`/`Tabla` (identifica al animal por **SBA + RP**), así que la API **resuelve `animalId` server-side por SBA + RP** contra el stud book y completa `idAnimal`/`tabla`/`animalId`.
>
> La SBA **no identifica un animal**: la misma SBA está en `tblPdre`, `tblExis` y `tblExtr` apuntando a animales distintos, así que el RP del mérito es el que elige. La regla es:
>
> - **un solo candidato** para la SBA ⇒ ése, **sin mirar el RP** (la SBA no es ambigua, así que el RP no tiene nada que elegir). Medido sobre los tres premios (2605 méritos, 2026-10-30): este camino se recorre 383 veces y el RP difiere en 2, las dos con el nombre idéntico y el RP corrido en uno — un tipeo, no otro animal — y 0 animales equivocados por el oráculo del nombre. Exigir el match ahí convertiría 2 resoluciones correctas en `null` sin evitar ningún error medido;
> - **varios candidatos** ⇒ el único cuyo RP coincide (normalizado: espacios de relleno, ceros a la izquierda y mayúsculas, a los dos lados);
> - **ninguno coincide, coincide más de uno, o el mérito no trae RP** ⇒ `idAnimal`, `tabla` y `animalId` quedan **los tres en `null`**: una SBA ambigua no se adivina, porque un id equivocado abre el pedigree de otro caballo.
>
> El SBA que no está en el stud book, y cualquier error de la resolución, también quedan en `null` (best-effort). Con `animalId: null` el cliente puede caer a `GET /animales?sba={sba}` y elegir por RP él mismo (es lo que hace la app).
>
> Medido el 2026-10-30 sobre los 1133 méritos del detalle de premio 2, con un oráculo independiente del RP (el `NOMB` del animal contra el `Nombre` que el mérito guarda): resolviendo **por SBA sola** con prioridad de tabla, **525 de 1133 apuntaban a otro animal** (46%); **por SBA + RP**, 1116 correctos, 16 en `null` y 1 con el nombre distinto (un mérito que guarda un nombre viejo). Esos 16 `null` son SBAs donde más de un candidato coincide con el RP — casi siempre el mismo animal anotado en dos tablas.
>
> `premio` se convierte a entero (`1abc` ⇒ `1`); `propietario` se usa tal cual (`trim`), y vacío o sólo espacios da `400`.

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

### Delegados

Delegados por delegación/región (la misma info que muestra `web/delegados.php`). La lista está en la API para que el cliente no la hardcodee: si cambia un delegado, se actualiza acá y el front no se toca.

#### `GET /delegados`

**Cache**: `Cache-Control: public, max-age=86400` (1 día — cambian muy de vez en cuando). Sin params; la lista es fija en el código (14 delegaciones).

```json
{
  "mapa": "https://caballoscriollos.com/web/assets/images/mapa_delegados_2.png",
  "data": [
    { "delegacion": "DELEGACIÓN I - NOA", "nombre": "María Lourdes Arias Figueroa", "email": "lulyaf84@hotmail.com" },
    { "delegacion": "DELEGACIÓN V - a - CENTRO NORTE", "nombre": "Pablo Agüero", "email": null }
  ]
}
```

- `data`: lista ordenada de delegaciones, cada una con `delegacion` (nombre de la delegación/región), `nombre` (el delegado) y `email` (o `null` si no tiene).
- `mapa`: URL del mapa de delegaciones.

---

### Autenticación

Login de la app para los socios, con su **usuario o email y la clave del sitio** (las mismas credenciales con las que entran a caballoscriollos.com), y el cambio de clave desde la app. Estos endpoints existen **sólo** en esta API (`/api` no los tiene). Son la puerta de entrada de los endpoints protegidos que vienen (inscripciones, certificados, datos del socio, carnet).

**El flujo**:

1. `POST /auth/login` con usuario y clave ⇒ un **access token** y un **refresh token**.
2. Cada request a un endpoint protegido lleva el access en el header `Authorization: Bearer <access_token>`.
3. Cuando un endpoint protegido responde `401` (el access venció), `POST /auth/refresh` con el refresh ⇒ un access **y un refresh nuevos**.
4. Al cerrar sesión, `POST /auth/logout` con el refresh.

**Vidas**:

| token | vida | qué es |
|---|---|---|
| access | **60 minutos** (`expires_in: 3600`) | JWT firmado. Se valida sin consultar la base: no se puede revocar antes de que venza |
| refresh | **90 días** (`refresh_expires_in: 7776000`), **deslizante** | opaco. Cada refresh emite uno nuevo con 90 días: la sesión vive mientras la app se use al menos una vez cada 90 días |

⚠️ **El refresh rota**: cada `POST /auth/refresh` **invalida** el refresh usado y devuelve uno nuevo. La app tiene que **guardar el nuevo cada vez**. Si vuelve a mandar uno ya usado, el servidor lo toma como un token robado y **cierra la sesión entera** (ese refresh y todos los que salieron de él): el próximo refresh da `401` y hay que volver al login.

**Reglas de las credenciales**:

- `usuario` puede ser el **usuario** o el **email** de la cuenta. Sin distinguir mayúsculas; se le hace `trim`.
- **No** se aceptan claves alternativas: sólo la clave de la cuenta. (El sitio viejo las aceptaba hasta #57; desde #57 web y app deciden igual.)
- **Mayúsculas en la clave**: mientras la clave sea la del sitio, la app acepta **exactamente lo mismo que el sitio** (que en la mayoría de las cuentas no distingue mayúsculas). Cuando el socio la cambia **desde la app** (`POST /auth/clave`) o por el **link de recupero**, en la app pasa a **distinguir mayúsculas**; el sitio sigue aceptando lo de siempre. Si después la cambia desde el sitio o se la pone la asociación, la app vuelve a aceptar exactamente lo mismo que el sitio.
- **Cuenta pendiente de aprobación**: una cuenta registrada pero todavía no aprobada por la Asociación **no entra a la app** (`403 cuenta_pendiente`, sólo con la clave correcta), aunque sí entre al sitio. Cuando la aprueban, entra con la misma clave.
- **Recuperar la clave** no se hace por la API: la app abre en el navegador la página del sitio `https://caballoscriollos.com/espanol/expositores_olvidoclave.php` (el botón "¿Olvidaste tu clave?"). El socio recibe por mail un link de **un solo uso que vence en 60 minutos** y elige la clave nueva en la web; con esa clave entra a la app y al sitio. Desde #57 el sitio ya no acepta claves alternativas (`Clave2` ni llaves maestras), así que un cambio o recupero de clave sí cierra la cuenta en los dos lados.
- **Cada intento de login queda registrado**, exitoso o no, para soporte y seguridad. El email y la IP **no** se guardan en claro.
- No hay bloqueo por intentos fallidos.

#### `POST /auth/login`

**Request body** (`application/json`)

```json
{ "usuario": "socio@ejemplo.com", "clave": "su clave" }
```

**Response 200**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "kq3V…",
  "refresh_expires_in": 7776000,
  "usuario": { "id": 1234 }
}
```

- `access_token`: JWT (HS256). No lleva datos personales: sólo el id del usuario. La app **no** necesita leerlo: lo manda tal cual.
- `usuario.id`: el id de la cuenta.

**Errores**

| status | cuándo | cuerpo |
|---|---|---|
| `400` | falta `usuario` o `clave`, o el body no es un objeto JSON | envelope de siempre |
| `401` | usuario inexistente, clave incorrecta **o** cuenta deshabilitada | **el mismo cuerpo** en los tres casos: la respuesta no dice cuál fue |
| `403` | la clave es **correcta**, pero el email de la cuenta no está verificado | `{"error":true,"status":403,"message":"Tenés que verificar tu email antes de entrar a la app","code":"email_no_verificado"}`. Sólo sale con la clave correcta: con una incorrecta, es el `401` de siempre. No hay sesión. La app muestra "verificá tu email" (reenviar el mail de verificación todavía no está disponible) |
| `403` | la clave es **correcta** y el email está verificado, pero la cuenta está **pendiente de aprobación** (o en consulta) por la Asociación | `{"error":true,"status":403,"message":"Tu cuenta está pendiente de aprobación por la Asociación","code":"cuenta_pendiente"}`. Sólo con la clave correcta. No hay sesión. La app muestra "tu cuenta está pendiente de aprobación; te avisamos por mail". **Precedencia**: si además el email no está verificado, sale `email_no_verificado` (es lo que la persona puede resolver sola). Una cuenta rechazada da el `401` de siempre |
| `409` | la clave es correcta para **más de una** cuenta con ese usuario | `{"error":true,"status":409,"message":"Cuenta duplicada: contactá a la asociación","code":"cuenta_duplicada"}`. **Provisorio**: hay socios con cuentas repetidas en el sitio, y la API no elige una por ellos. No hay sesión |
| `503` | la autenticación no está configurada en el servidor | `{"error":true,"status":503,"message":"Autenticación no configurada"}` |

#### `POST /auth/refresh`

**Request body** (`application/json`): `{ "refresh_token": "…" }`

**Response 200**: el **mismo** shape que `POST /auth/login`, con un `refresh_token` **nuevo**. El anterior deja de servir.

**Errores**: `400` (falta `refresh_token` o el body no es JSON) · `401` (refresh vencido, revocado, ya usado, la clave se cambió, o la cuenta fue dada de baja, quedó sin email verificado o dejó de estar aprobada: en todos los casos la app vuelve al login) · `503`.

#### `POST /auth/logout`

**Request body** (`application/json`): `{ "refresh_token": "…" }`

**Response 204**, sin body. Cierra la sesión: ese refresh y todos los de su familia dejan de servir. Un refresh inválido o ya cerrado **también** da `204` (es idempotente y no confirma nada).

**Errores**: `400` · `503`.

#### `GET /auth/sesion`

**Protegido**: `Authorization: Bearer <access_token>`.

**Response 200**

```json
{ "usuario": { "id": 1234 }, "expira": 1760000000 }
```

- `expira`: epoch (segundos) en que vence el access.

**Errores**: `401` si falta el header, o el access venció o no es válido (sin Bearer, `WWW-Authenticate: Bearer`; con un Bearer que no sirve, `WWW-Authenticate: Bearer error="invalid_token"`): la app hace `POST /auth/refresh` · `503`.

Es también el endpoint protegido mínimo: la misma regla de `401` vale para todo endpoint protegido.

#### `POST /auth/clave`

**Protegido**: `Authorization: Bearer <access_token>`. Cambia la clave de la cuenta del access, para el sitio y para la app.

**Request body** (`application/json`)

```json
{ "clave_actual": "la de hoy", "clave_nueva": "Nueva-Clave-1" }
```

**Response 200**: **una sesión nueva**, con el **mismo shape que `POST /auth/login`**. El cambio **cierra todas las sesiones de la app** de esa cuenta, **incluida la del teléfono que cambia la clave**: la app descarta su par anterior y guarda el `access_token` y el `refresh_token` de esta respuesta. Lo que **no** se corta: un access ya emitido sigue sirviendo hasta que venza (≤ 60 min), y las sesiones abiertas en el **sitio web** siguen (el sitio no tiene registro de sesiones).

**Reglas de la clave nueva** (se rechaza, no se corrige): al menos **6 caracteres** · sin espacios al principio ni al final · hasta 72 bytes · sólo caracteres que el sitio acepta (letras con acento y `ñ` sí; emojis no). Queda guardada **tal cual**: desde ese momento la app **distingue mayúsculas**; el sitio sigue con su regla de siempre (exacta si la clave mezcla mayúsculas y minúsculas; cualquier casing si es toda minúscula o toda mayúscula). Poner la misma clave que ya tenía se acepta (igual cierra las otras sesiones).

**Errores**

| status | cuándo | cuerpo |
|---|---|---|
| `400` | falta `clave_actual` o `clave_nueva`, o el body no es un objeto JSON | envelope de siempre, sin `code` |
| `400` | la clave nueva no cumple una regla | `{"error":true,"status":400,"message":"<la regla que falla, para mostrar>","code":"clave_invalida"}` |
| `401` | sin access, vencido o inválido (sin Bearer, `WWW-Authenticate: Bearer`; con un Bearer que no sirve, `WWW-Authenticate: Bearer error="invalid_token"`): la app refresca · la cuenta ya no está aprobada, habilitada y verificada | envelope de siempre |
| `403` | `clave_actual` incorrecta | `{"error":true,"status":403,"message":"La clave actual no es correcta","code":"clave_actual_incorrecta"}`. **No** es `401`: la sesión sigue válida, no hay que refrescar |
| `409` | la clave cambió en otro lado entre la verificación y la escritura | `{"error":true,"status":409,"message":"La clave cambió en otro lado: volvé a entrar","code":"clave_cambiada"}`. No se escribió nada; la app vuelve al login |
| `503` | la autenticación no está configurada | como en `/auth/login` |

Cada verificación de la clave actual queda registrada (`ok` o incorrecta), con la cuenta. No hay bloqueo por intentos.

**Migraciones requeridas**: `docker/db/migrations/2026-10-10_auth_app.sql` (tablas `tblApiRefreshTokens` y `tblApiIntentos`, y tres columnas nuevas en `tblUsuarios`). Aplicar a mano en producción antes de desplegar. El recupero de clave del sitio trae la suya (`tblClaveRecuperos`), en el runbook de #76.

---

### Inscripciones

`POST /inscripciones` **inscribe un animal a un evento** en nombre del socio logueado, por **el mismo camino que la web**
(`expositores_inscripcion_paso7.php`): las mismas reglas, las mismas 5 tablas, el mismo log. Es el único endpoint que **escribe**
`caballos_bd`. Protegido: `Authorization: Bearer <access_token>` (ver [Autenticación](#autenticación)). Plan:
`docs/plan-59-alta-inscripcion-app.md`.

**Principio (D-59-1)**: el payload trae **sólo lo que el socio elige** en la web (evento, animal, sexo, presentación, condición,
cabaña, ubicación, Renspa, Otoño/FICCC, morfología y T&A con su jinete, y las pruebas con jinete, domador, yunta y equipo). Todo
lo demás lo **deriva el servidor** y **no se acepta** en el payload: la condición (Titular), el expositor (es el dueño del animal), la fecha de nacimiento,
las categorías morfológicas (se calculan por fecha, sexo y presentación), los nombres de jinete, domador y equipo, el precio, el
número y tipo de socio, y el usuario (sale del token).

⚠️ **`evento` es el `IdEvento` de las inscripciones (`caballos_bd`)**, no el id que devuelve `GET /eventos` (que lista los eventos
de la web, `caballos_web`). El puente es `tblEventoEventoInscripcion`. Hasta que exista el endpoint de lecturas para armar el
formulario (U-59-6, issue aparte), la app **no expone** este alta.

#### `POST /inscripciones`

**Request body** (`application/json`, un objeto; claves en snake_case)

```json
{
  "evento": 9059001,
  "animal": {"tabla": "IdExis", "id": 9059010},
  "sexo": 2, "presentacion": "C",
  "cabania": "La Ñandú", "renspa": "", "provincia": "Córdoba", "localidad": "Jesús María",
  "otonio": 0, "ficcc": 0,
  "morfologia": {"jinete": 9059030},
  "tipo_aptitud": null,
  "pruebas": [
    {"prueba": 1, "categoria": 12, "jinete": 9059030, "domador": null},
    {"prueba": 2, "categoria": 7, "jinete": 9059031, "yunta": {"tabla": "IdExis", "id": 9059011, "sexo": 2}},
    {"prueba": 6, "categoria": 9, "yunta": {"tabla": "IdPdre", "id": 9059012, "sexo": 1}, "yunta2": {"tabla": "IdExis", "id": 9059013, "sexo": 2}, "equipo": 9059040}
  ]
}
```

| campo | tipo | qué |
|---|---|---|
| `evento` | entero | `IdEvento` de `caballos_bd` |
| `animal` | `{tabla, id}` | `tabla` ∈ `IdPdre` (machos nacionales), `IdExis` (hembras nacionales), `IdExtr` (extranjeros). Si el animal fue unificado, se inscribe su **superviviente** |
| `sexo` | `0` castrado, `1` macho, `2` hembra | por número; el nombre da `400` |
| `presentacion` | `"C"` cabestro, `"M"` montado | |
| `cabania`, `provincia`, `localidad`, `renspa` | texto UTF-8 | se guardan en latin1 (Windows-1252): un carácter que no existe ahí (un emoji) o más de 255 bytes ⇒ `400`. `cabania` se guarda tal cual (con sus espacios); los otros tres, recortados. `renspa` vacío si el evento no lo pide |
| `otonio`, `ficcc` | `0` / `1` | las casillas de la web |
| `morfologia`, `tipo_aptitud` | `null` o `{jinete}` | participa en morfología / en tipo y aptitud; `jinete` puede ser `null` (el validador decide) |
| `pruebas` | lista (puede faltar o ir vacía) | cada una: `prueba`, `categoria` (enteros), y opcionales `jinete`, `domador`, `equipo` (enteros o `null`), `yunta` y `yunta2` (`{tabla, id, sexo}`, `sexo` ∈ `1`/`2`, o `null`). **`tabla` y `sexo` tienen que ser coherentes** (#126): `IdExis` ⇔ `2`, `IdPdre` ⇔ `1`, `IdExtr` admite los dos; un par incoherente ⇒ `400` con campo `pruebas[i].yunta.sexo` (también en `yunta2` y en el equipo). Es la tabla del compañero la que se guarda (`YuntaTabla`), y viaja al núcleo en el sexo o en la `'e'` de `IdExtr`, como en la web. **La misma `prueba` dos veces ⇒ `400`**; dos pruebas con `yunta` (o con `yunta2`) en la misma `categoria` ⇒ `400` |

Los enteros van como número JSON o como string de dígitos (`"12"`); un float, `"1e3"`, `" 1"`, un booleano o un negativo dan
`400`. `null` vale sólo donde la tabla lo dice. Las claves que no figuran se ignoran, **salvo `condicion`**, que da `400`: la
condición (Titular/Suplente) **no se elige**; la web sólo la ofrecía en los eventos 61/62 (2011/2012, cerrados) y en todos los
demás el alta queda Titular por default. La API hace lo mismo.

**Response 201**

```json
{
  "inscripcion": {
    "id": 185901, "estado": 1, "estado_nombre": "Definitiva", "rechazo_funcional": 0, "precio": 2151,
    "pruebas": [{"prueba": 1, "categoria": 12, "lista_espera": false, "precio": 151}]
  }
}
```

- `estado`: uno de los 7 de `InscripcionEstados` (`0` Cancelada, `1` Aprobada/«Definitiva», `2` Pendiente/«Condicional», `3`
  Rechazada, `4` y `5` Observada por propietario, `6` Observada funcional). **En la práctica el alta da siempre `1`**: los demás
  los pone el admin después, o ya no se producen (el expositor es siempre el dueño).
- `rechazo_funcional`: `1` si participa en funcionales sin inspección aprobada (la web lo marca igual y la inscripción queda).
- `precio`: el total que la web calcula en `paso6`; puede ser `null` con un tipo de socio raro (#117). `pruebas[].precio` es el de
  cada prueba para ese socio; `lista_espera`, si entró en lista de espera.
- **Un `201` es un alta confirmada**, siempre. Si después de confirmarla la base no deja leer las pruebas escritas, la respuesta
  sigue siendo `201` con **`pruebas: null`** (y queda una línea en el log de errores de la API): no hay que reintentar, porque
  daría `409`.

**Errores** (siempre con `code`):

| status | `code` | cuándo |
|---|---|---|
| `400` | `entrada_invalida` | el body no es un objeto JSON o un campo no tiene la forma de la tabla. Trae `campo` (`"pruebas[1].yunta.sexo"`), o `null` si falló el body entero |
| `401` | — | sin token o token vencido/inválido (el de siempre, con `WWW-Authenticate`) |
| `403` | `usuario_solo_web` | los usuarios 1278 y 1610 (cuentas operativas) inscriben sólo por la web |
| `403` | `usuario_no_habilitado` | el usuario ya no pasa el predicado del login (`Estado` y `Habilitado`): el access vale 60 min sin tocar la base, y acá se re-chequea antes de escribir |
| `409` | `Duplicado` | el animal ya está inscripto en ese evento, también con una inscripción **rechazada** (Estado 3): el rechazo es definitivo para ese evento (#189) |
| `422` | `inscripcion_invalida` | una regla no se cumple. `errores: [{codigo, campo, prueba, categoria}]`, sin texto (la app traduce el `codigo`). Los códigos: los del validador de la web (`VentanaCerrada`, `EventoInvalido`, `ParticipacionVacia`, `JineteFaltante`, `JineteMorfologia`, `JineteImpago`, `CupoLleno`, `YuntaIncompleta`, `YuntaInvalida`, `YuntaOcupada`, `EquipoFaltante`, `EquipoOcupado`, `AnimalEnOtroEquipo`, `PruebaNoHabilitada`, `MorfologiaNoHabilitada`, `OtonioRegla`, `Pertenencia`) y los de lo que la web decide por la UI (`AnimalInexistente`, `TablaSexo`, `SexoCastrado`, `ExpositorInexistente`, `CabaniaFaltante`, `UbicacionFaltante`, `RenspaFaltante`, `RenspaInvalido`, `CategoriaSinCalcular`, `JineteNoDisponible`, `EquipoInexistente`, `PruebaNoOfrecida`). `campo` nombra el campo del payload cuando la regla es de uno; `prueba`/`categoria`, cuando es de una prueba |
| `503` | `mantenimiento` | la inscripción de la web está cerrada por mantenimiento (`Config::Mantenimiento_Inscripciones` del sitio: un solo interruptor para los dos lados) |
| `503` | `base_no_disponible` | la base no responde o una escritura falló: no se inscribió nada (la transacción se deshizo). Salvedad heredada de la web: si la falla (de escritura o de lectura) ocurrió **después** de la línea del log, puede quedar **1 línea huérfana** en `tblInscripcionesLogs` (es MyISAM, fuera de la transacción) sin inscripción, y el `AUTO_INCREMENT` de `tblInscripcionAnimales` avanza igual aunque la fila se deshizo |

Un `422` o un `409` **no escribe nada** (`Pertenencia` incluido: un animal que no es del socio no se inscribe). Con `201` quedan
la inscripción, sus pruebas y una línea en el log de inscripciones, como en la web; el mail del alta llega con la pieza T3 de #59.

#### `GET /inscripciones`

**Mis inscripciones**: las del socio logueado, con **la misma regla que la web** (`expositores_inscripciones.php`; las dos leen
por el mismo núcleo, plan `docs/plan-60-consulta-inscripciones.md`). Una inscripción es del socio si **la cargó él**, si su
propietario **está vinculado a su usuario** (`tblSociosAcccPropietarios`) o si ese propietario es del **socio ACCC con su número de
socio** (el `NroSocio` de su usuario). Protegido; sin precios.

Los cuatro campos de actor de `tblInscripcionAnimales`, y cuáles habilitan (es el predicado
`SqlConsultaInscripciones::CondicionPertenencia`, el mismo texto que la web):

- `IdUsuario`: el usuario de la inscripción. **Habilita** (vínculo 1: `A.IdUsuario` = el usuario del token).
- `IdPropietario`: el propietario (expositor) de la inscripción. **Habilita**, por dos vínculos: el 2, si en
  `tblSociosAcccPropietarios` ese propietario está vinculado al usuario (`sp.IdUsuario`), y el 3, si ese propietario es de un socio
  ACCC cuyo `NumeroSocio` es el `NroSocio` del usuario (`s.NumeroSocio`).
- `IdUsuarioCarga`: lo graban las altas (pública, API y rodeos del admin) con el mismo valor que `IdUsuario`. **No habilita** (no
  está en el predicado).
- `IdCriador`: el propietario criador del animal. **No habilita.**

- `abiertas`: un elemento por evento con la inscripción abierta hoy (como la web, aunque el socio no tenga inscripciones ahí: lista
  vacía), con sus inscripciones de más nueva a más vieja.
- `cerradas`: las de eventos cerrados desde 2020, del evento más nuevo al más viejo (incluye eventos dados de baja, como la web).
- Las dos excluyen las inscripciones `Rechazada` (`3`) y `Cancelada` (`0`). **Cada inscripción aparece una vez** (la web la
  repetía cuando el propietario tenía más de un socio vinculado; desde #60 tampoco).

```json
{
  "abiertas": [
    {"evento": {"id": 1201, "nombre": "Expo Palermo 2026", "inscripcion_hasta": "2026-07-01"},
     "inscripciones": [{"id": 185901, "...": "la inscripción, abajo"}]}
  ],
  "cerradas": [
    {"id": 180001,
     "evento": {"id": 1180, "nombre": "Nacional 2025", "fecha": "2025-05-10"},
     "animal": {"id": "exis:9059010", "nombre": "LA ÑANDÚ", "sba": "123456", "rp": "45"},
     "estado": 1, "estado_nombre": "Definitiva", "cria_ajena": false,
     "sexo": 2, "sexo_nombre": "Hembra", "presentacion": "C", "presentacion_nombre": "Cabestro",
     "condicion": 1, "condicion_nombre": "Titular",
     "morfologia": {"id": 12, "categoria": "Potrancas"}, "tipo_aptitud": null,
     "pruebas": [{"prueba": {"id": 1, "nombre": "Rienda"}, "categoria": {"id": 12, "nombre": "Mayor"}, "lista_espera": false}],
     "expositor": "Juan Pérez", "cabania": "La Ñandú",
     "puede_baja": false, "puede_rehacer": false}
  ]
}
```

- `animal.id`: `pdre:N` / `exis:N` / `extr:N`, el del animal **superviviente** si fue unificado (el que muestra `GET /animales/{id}`).
- `morfologia` / `tipo_aptitud`: `null` es «No Participa», como en la web.
- `pruebas`: todas las filas de pruebas funcionales de la inscripción, como en la web.
- `puede_baja`: lo que `DELETE /inscripciones/{id}` va a aceptar, con el mismo predicado (#150): `true` en todo evento abierto (la web
  siempre ofrece Eliminar ahí); en uno cerrado, sólo si `puede_rehacer`. Una inscripción `Cancelada` (0) o `Rechazada` (3) nunca (los
  listados no las traen; en el detalle salen con `false`).
- `puede_rehacer`: la ACCC habilitó **rehacer** esa inscripción (una habilitación vigente), el socio es propietario del animal y la
  inscripción no tiene resultados cargados. Son las tres condiciones de la web. La baja misma es otro endpoint (#150).
- Sin inscripciones: `200` con `{"abiertas": [], "cerradas": []}` (o con los eventos abiertos y listas vacías).

#### `GET /inscripciones/{id:[0-9]+}`

**El detalle** de una inscripción del socio (`expositores_inscripcion_view.php`), con la misma regla de pertenencia. `{id}` es un
entero (otra cosa da `404` de ruta). **Una inscripción de otro socio da `404` `no_encontrada`, igual que un id que no existe.** A
diferencia del listado, el detalle **no** filtra el `estado`: una inscripción rechazada o cancelada del socio se ve, como en la web.

```json
{
  "inscripcion": {
    "id": 185901, "evento": {"id": 1201, "nombre": "Expo Palermo 2026", "fecha": "2026-07-20", "inscripcion_hasta": "2026-07-01"},
    "animal": {"...": "como en el listado"}, "estado": 1, "...": "los campos del listado",
    "pruebas": [
      {"prueba": {"id": 2, "nombre": "Paleteada"}, "categoria": {"id": 7, "nombre": "Mayor"}, "lista_espera": false,
       "jinete": "PÉREZ JUAN", "yunta": {"id": "exis:9059011", "nombre": "LA TROPILLA"}}
    ],
    "unidades_relacionadas": [
      {"inscripcion": 185950, "animal": {"id": "exis:9059011", "nombre": "LA TROPILLA", "sba": "123999"}, "expositor": "Ana Gómez",
       "cabania": "El Ombú", "prueba": {"id": 2, "nombre": "Paleteada"}, "categoria": {"id": 7, "nombre": "Mayor"},
       "equipo": null, "direccion": "declarado"}
    ]
  }
}
```

- `pruebas[].yunta`: el compañero, sólo en las pruebas de yunta; si no, `null`.
- `puede_baja`: con el plazo de inscripción del evento abierto, `true`. Cerrado, sólo si `puede_rehacer`. Con `estado` 0 o 3, `false`
  aunque el plazo esté abierto. Es la regla de la baja de la web, la misma que responde `DELETE /inscripciones/{id}` (#150).
- `unidades_relacionadas`: las yuntas y los equipos en los que participa el animal, en las dos direcciones. `declarado` es un
  compañero que nombra esta inscripción; `declarante` es otra inscripción del evento que nombra a este animal. `inscripcion` es la
  inscripción viva del compañero en el evento, o `null` si no la tiene. Son las que perderían la prueba si esta inscripción se da de
  baja. `animal.id` es `pdre:N` / `exis:N` / `extr:N` con el superviviente, como en el resto del contrato. **El compañero se
  identifica por (número, tabla)** (#153): el mismo número en dos tablas son dos animales y dos unidades. Para un `declarado`, la
  tabla es la que la fila de la prueba registró (`YuntaTabla`) o, si no la registró (filas viejas), la del sexo; su inscripción viva
  se busca sólo en esa tabla. Para un `declarante`, sólo cuenta la fila que nombra este número con la tabla de esta inscripción, y la
  tabla sale de la suya.

**Errores de los dos** (con `code`): `401` sin token; `403` `usuario_no_habilitado` (como el alta); `404` `no_encontrada` (sólo el
detalle); `503` `base_no_disponible`.

#### `DELETE /inscripciones/{id:[0-9]+}`

**La baja** de una inscripción del socio (#150, plan `docs/plan-150-baja-app.md`), por **el mismo camino que la web**
(`expositores_inscripcion_del.php`): las dos escriben por el núcleo `BajaInscripcion`. Es el segundo endpoint que **escribe**
`caballos_bd`. Protegido; sin body de entrada. La regla es la que la app ya ve en `puede_baja`: con el plazo del evento abierto se puede;
cerrado, sólo si la ACCC habilitó **rehacer** (habilitación vigente, socio propietario del animal, sin resultados), y esa habilitación
queda **usada** en la misma transacción. Una inscripción `Cancelada` (0) o `Rechazada` (3) no se da de baja (la web no lo ofrece).

Lo que escribe, en **una transacción, todo o nada**: `Estado = 0` en la inscripción y en todas sus filas de pruebas funcionales, la
habilitación de rehacer marcada usada (si la hubo) y una línea `Baja` en el log de inscripciones (con el usuario del token). No toca
cupos ni promueve la lista de espera (tampoco la web). Si algo falla, no queda nada (salvedad heredada del alta: el log es MyISAM; sólo
un `COMMIT` fallido puede dejarlo huérfano).

```json
{
  "inscripcion": {"id": 185901, "estado": 0},
  "rehacer": true,
  "unidades_relacionadas": [{"...": "como en el detalle"}]
}
```

- `rehacer`: `true` si la baja fue por una habilitación de rehacer (que quedó usada): el socio puede volver a inscribir ese animal.
- `unidades_relacionadas`: **sólo si `rehacer`** (como la alerta de la web), las yuntas y los equipos del animal en el evento, leídas
  antes de la baja, con el formato del detalle. Si no, `[]`.

Después del `200` se manda el **certificado de baja** por mail (al socio, a `inscripciones@` y a `expo-funcional@`), el mismo que manda
la web, si el evento es del año en curso. Un problema con el mail no cambia el `200`.

| status | `code` | cuándo |
|---|---|---|
| `401` | — | sin token |
| `403` | `usuario_solo_web` | los usuarios operativos 1278 y 1610 (siguen en la web) |
| `403` | `usuario_no_habilitado` | el usuario del token no está habilitado |
| `404` | `no_encontrada` | no existe **o no es del socio** (el mismo body) |
| `409` | `estado_no_permite_baja` | ya estaba `Cancelada` (0) o `Rechazada` (3); también si otra baja la ganó un instante antes. No escribe nada |
| `409` | `habilitacion_usada` | la habilitación de rehacer se usó o venció entre la lectura y la escritura. No escribe nada |
| `422` | `baja_no_permitida` | con `motivo`: `plazo_cerrado` (cerrado y sin habilitación de rehacer), `no_propietario`, `con_resultados`, `piso_no_medible`, `sin_evento`. No escribe nada |
| `503` | `mantenimiento` | la inscripción de la web está cerrada por mantenimiento (el mismo interruptor que el alta) |
| `503` | `base_no_disponible` | la base no responde o una escritura falló: la transacción se deshizo |


#### `GET /inscripciones/{id:[0-9]+}/certificado` y `GET /inscripciones/{id:[0-9]+}/certificado.pdf`

**El Certificado de Inscripción** de una inscripción del socio (#61, plan `docs/plan-61-certificado.md`): el mismo contenido que el
certificado que la web manda por mail al hacer el alta (`expositores_inscripcion_paso7.php`), rearmado **desde la base** para una
inscripción existente. Protegidos, con **la misma regla de pertenencia que el detalle**: una inscripción de otro socio da `404`
`no_encontrada`, igual que un id que no existe. `/certificado` devuelve el dato en JSON (la app lo muestra); `/certificado.pdf` el mismo
dato renderizado (`application/pdf`, `Content-Disposition: inline; filename="certificado-{id}.pdf"`, `Cache-Control: private, no-store`):
**la app lo baja con su token y lo comparte como archivo**; no hay URL pública ni link firmado (D-61-6). El PDF no puede decir nada que
el JSON no diga: el render recibe exactamente ese array.

```json
{
  "certificado": {
    "numero": 185901, "tipo": "Definitiva", "lugar": "Buenos Aires", "fecha": "2026-07-14",
    "estado": 1, "estado_nombre": "Aprobada",
    "evento": {"id": 3287, "nombre": "Exposición Nacional Palermo 2026"},
    "animal": {"id": "exis:9059101", "nombre": "LA TROPILLA", "sba": "9059101", "rp": "M1", "nacimiento": "01-03-2015", "sexo": "Hembra",
               "presentacion": "Cabestro", "gen": "SRA", "pelo": "Gateado", "talla": null, "torax": null, "cania": null},
    "pedigri": {"padre": {"nombre": "...", "sba": "...", "gen": "...", "pelo": "..."}, "madre": {"...": "..."},
                "abuelo_paterno": null, "abuela_paterna": null, "abuelo_materno": null, "abuela_materna": null},
    "condicion": "Titular", "criador": "CABAÑA EL OMBÚ S.A.", "propietario": "CABAÑA EL OMBÚ S.A.", "expositor": "PÉREZ, JUAN MANUEL", "cabania": "El Ombú",
    "ubicacion": {"provincia": "Buenos Aires", "localidad": "Luján"},
    "morfologia": {"categoria": "Categ. 13 - Hembras - Adulto Mayor Cabestro", "jinete": null}, "tipo_aptitud": null,
    "pruebas": [{"prueba": "Rodeos", "categoria": "Mayor", "lista_espera": false, "jinete": "GÓMEZ, ANA", "domador": "",
                 "yunta": {"nombre": "LA YUNTA"}, "equipo": null}],
    "no_inspeccionado": false,
    "textos": {"intro": "La ACCC expide el presente Certificado...", "observada": [], "importante": [{"marca": "1.", "nivel": 0, "texto": "..."}],
               "cierre": "...", "recordamos": [{"marca": "1.", "texto": "..."}], "gracias": "...", "contacto": "...", "no_inspeccionado": "..."}
  }
}
```

- `tipo`: `Definitiva`; `Provisoria` si el evento es el 61 o el 62 (como el encabezado de paso7); `Observada` si `estado` es 4 o 5 (la rama
  Observada de paso7, con sus dos párrafos en `textos.observada` y el jinete de morfología / TyA, que la rama general no imprime).
- `fecha` es la de la inscripción (`FInscripcion`, D-61-2), no el día del pedido: el documento es reproducible. `lugar` es siempre Buenos Aires.
- `expositor` es el propietario declarado en el alta (`tblPropietarios` por `IdPropietario`), como en paso7; difiere del `expositor` del
  listado y el detalle, que es el nombre del usuario (D-61-7). `criador` y `propietario` son los del animal (por número de socio).
- `ubicacion` es la `Ubicacion` persistida (`Provincia - Localidad`) partida en el primer ` - `; sin separador, todo en `provincia`.
- `pruebas[]`: las filas persistidas de la inscripción. `lista_espera` es el valor guardado al inscribir; `jinete` y `domador` son los
  nombres tipeados (pueden ser `""`); `yunta` {`nombre`} sólo en las pruebas de yunta; `equipo` [{`nombre`}, {`nombre`}] sólo en las de
  equipo (los otros dos integrantes, como el «En trío con» del mail).
- `no_inspeccionado`: participa en funcionales y el animal quedó con `RechazoFuncional = 1`; el texto va en `textos.no_inspeccionado`.
- `textos`: los textos legales de paso7 (`TextosCertificado`, el núcleo), decodificados y sin etiquetas. `importante[].nivel` es la
  sangría (0: `1.`…; 1: `a.`/`b.`; 2: `i.`…`vi.`); la variante de los eventos 61/62 trae `1.`…`5.`, la general `1.`…`3.` + `a.`/`b.`.
- `talla`, `torax`, `cania`: siempre `null` (en paso7 son celdas en blanco para completar a mano). Sin precios (R-7).
- Los strings salen por la misma regla de encoding que el resto de la API (#174 §8): un nombre legacy en CP850 se ve como en
  `/inscripciones/{id}` (`LOBIZàN`), no se corrige acá.

| status | `code` | cuándo |
|---|---|---|
| `401` | — | sin token |
| `403` | `usuario_no_habilitado` | el usuario del token no está habilitado |
| `404` | `no_encontrada` | no existe **o no es del socio** (el mismo body) |
| `409` | `sin_certificado` | con `motivo`: `cancelada` (estado 0) o `rechazada` (estado 3). Una baja o una rechazada no tienen certificado (D-61-1) |
| `503` | `base_no_disponible` | la base no responde |

### Lecturas para armar el alta (#149)

Las 7 lecturas con que la app arma el payload de `POST /inscripciones`, **por el mismo núcleo que la web** (`LecturasAlta`,
`src/espanol/library`): `paso1` y `expositores_seleccion_eventos.php` usan la misma función para la lista de eventos. Todas
protegidas (`Authorization: Bearer <access_token>`), ninguna escribe. Plan: `docs/plan-149-lecturas-alta.md`. Errores comunes:
`401` sin token · `403` `usuario_solo_web` (1278/1610) y `usuario_no_habilitado` · `400` `entrada_invalida` con `campo` · `404`
`evento_inexistente` / `animal_inexistente` (A3, A4, A7) · `503` `base_no_disponible`. Los textos salen en UTF-8; los filtros entran en
UTF-8 (lo que no existe en Windows-1252, p. ej. un emoji, da `400`). `animal` es el id de `GET /animales` (`pdre:N` | `exis:N` | `extr:N`),
resuelto al superviviente como el POST. **Sin precios** (R-7): el `201` del POST los devuelve.

#### `GET /inscripciones/eventos`

A1. Parámetros: —. Devuelve `[{id, nombre, inscripcion_desde, inscripcion_hasta, evento_desde, por_rehacer, pide_renspa, alerta2, alerta3, alertas: [{titulo, texto}]}]`: los eventos donde el usuario puede inscribir **hoy** (ventana abierta, más los cerrados con una habilitación de «rehacer» pendiente que el validador acepta: no eliminados y ya cerrados). `id` es el `evento` del POST (`caballos_bd`). Los textos de alerta son HTML tal como están guardados.

#### `GET /inscripciones/alertas`

Parámetros: —. Devuelve `{terminos, alertas: [{titulo, texto}]}`: lo que la web muestra en `expositores_alerta1.php` **antes** de elegir el evento. `alertas` son las alertas generales vigentes hoy (visibles, sin evento o con evento `0`, y con `FechaDesde`/`FechaHasta` vacías o que incluyen hoy: los dos bordes son **inclusivos**, en la hora de Buenos Aires), en el orden de la web: la primera es el primer popup. Usa las mismas claves que las `alertas` de `GET /inscripciones/eventos`. Los textos son HTML crudo, tal como están guardados (como A1).

`terminos` es el texto que la web muestra hoy bajo «TÉRMINOS Y CONDICIONES GENERALES», que **no** es necesariamente la alerta fija:
- si `alertas` no está vacía, es el texto de la **última** alerta de `alertas` (el mismo que su `texto`). La página lo muestra así por un defecto (imprime el cuerpo con la variable que reasignó el bucle de los popups), y la API lo replica **a propósito**, para que la app y la web muestren lo mismo;
- si `alertas` está vacía, es el texto de la alerta fija (la 1);
- es `null` sólo cuando no hay nada que mostrar.

La app no puede suponer que `terminos` son los términos generales. **Sin alertas** (`{"terminos": null, "alertas": []}`, con **200**) es el caso en que la web redirige directo al paso 1: la app saltea la pantalla.

#### `GET /inscripciones/cabanias`

Parámetros: —. Devuelve `["LA ESTANCIA", "LA SOÑADA"]`: las cabañas que **este usuario** (el del token) ya usó en sus inscripciones, las del `<select>` del paso 4 de la web. No es un catálogo de cabañas. La lista de la web, **recortada, sin vacías y sin repetidos** (sin distinguir mayúsculas; sí acentos): de cada repetido queda la **primera aparición**, con su grafía recortada, y el orden es el de la web, sin reordenar. Sin cabañas: `[]` con 200, y la app ofrece sólo «nueva», como la web. Se omiten las cabañas que el alta rechazaría (por ejemplo, las que tienen el carácter de reemplazo U+FFFD guardado): el usuario puede tipearla de nuevo.

El valor elegido se manda tal cual en `cabania` del `POST /inscripciones`; la web también guarda recortada la cabaña elegida de la lista. Un valor que en la base estaba con bytes UTF-8 dentro de la columna latin1 se guarda en latin1 **correcto**, así que la fila nueva queda con otros bytes que la vieja (aceptado: D-3 del plan).

#### `GET /inscripciones/animales`

A2. Parámetros: `sba` y/o `rp` (al menos uno), `sexo` 0/1/2, `evento` (opcional). Devuelve `[{id, nombre, sba, rp, sexo, fecha_nacimiento, pelo, propio, ya_inscripto}]`: los candidatos de paso3 (macho/castrado en Pdre + Extr, hembra en Extr + Exis), sin absorbidos. `ya_inscripto` es `null` sin `evento`. `ya_inscripto` es `true` también con una inscripción rechazada en el evento (#189).

#### `GET /inscripciones/eventos/{id}/opciones`

A3. Parámetros: `animal`, `sexo` 0/1/2, `presentacion` C/M. Devuelve `{morfologia: {categoria: {id, nombre} | null, habilitada}, tipo_aptitud: {…}, pruebas: [{prueba: {id, nombre}, modalidad: individual | yunta | equipo, categorias: [{id, nombre, habilitada, cupo, ocupacion, lista_espera}]}]}`: lo que paso5 ofrece para ese animal. No reemplaza al POST: «habilitada» acá y un `422` después pueden coexistir (otoño, concurrencia del cupo).

#### `GET /jinetes`

A4. Parámetros: `nombre`, `apellido`, `documento` (al menos uno; `LIKE %x%` en AND), `evento`. Devuelve `[{id, nombre, apellido, documento, tiene_deuda}]`: jinetes `Disponible = 1` y `Validado = 1`, como el popup de la web; `tiene_deuda` a la fecha del evento.

#### `GET /domadores`

A5. Parámetros: `nombre`, `apellido`, `documento` (al menos uno; en OR). Devuelve `[{id, nombre, apellido, documento}]`.

#### `GET /inscripciones/yunta-candidatos`

A6. Parámetros: `sba`, `sexo` 1/2; opcionales `evento`, `prueba`, `categoria`, `animal` (el que se inscribe). Devuelve `[{id, nombre, sba, rp, sexo, permitido}]`: los compañeros de yunta por SBA (Exis si `sexo` = 2, si no Pdre; más Extr). `permitido` se evalúa sólo con evento, prueba de yunta y categoría, como la web: `false` si otra inscripción ya lo eligió de compañero en esa categoría.

#### `GET /equipos`

A7. Parámetros: `animal`, `evento`; opcionales `prueba`, `categoria`. Devuelve `[{id, nombre, anio, animales: [{id, nombre, sba, rp, sexo, jinete: {id, nombre, apellido} | null}], habilitado, jinetes_inhabilitados: [nombres], bloqueado, bloqueado_por}]`: los equipos del animal del año en curso; `habilitado` = ningún jinete con deuda; `bloqueado` (sólo con prueba y categoría; si no, `null`) = un integrante ya está en OTRO equipo en esa prueba, y `bloqueado_por` su nombre.

### Perfil

Los datos básicos del usuario logueado para la pantalla de perfil de la app: identidad, contacto y número y categoría de socio. Plan:
`docs/plan-62-datos-socio.md`.

#### `GET /perfil`

Protegido (`Authorization: Bearer <access_token>`). Devuelve **sólo** los datos del usuario del token: no recibe id (un `?IdUsuario=`
o un header se ignoran). **Cache**: `Cache-Control: private, no-store` (datos personales).

```json
{
  "perfil": {
    "id": 1234,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "socio@ejemplo.com",
    "telefono": {"cod_pais": "54", "cod_area": "11", "numero": "45551234"},
    "celular":  {"cod_pais": "54", "cod_area": "11", "numero": "1555551234"},
    "socio": {"numero": "3072", "categoria": "Activo", "nombre_padron": "PÉREZ JUAN"}
  }
}
```

- `nombre`, `apellido`, `email` y cada parte de `telefono`/`celular`: tal como están en la cuenta; vacíos salen `null`. Si las tres
  partes de un teléfono están vacías, el objeto entero es `null`.
- `socio` es `null` si la cuenta no tiene número de socio. `numero` es string (no se castea).
- ⚠️ **`categoria` es la categoría del socio (Activo, Adherente, Vitalicio, Honorario, u otro valor cargado), NO una vigencia**:
  «Activo» no quiere decir «al día». La app tiene que rotularla como categoría («Categoría: Activo»). Es la de la cuenta
  (`tblUsuarios.TipoSocio`, la que usa el sistema para el precio); **si la cuenta no la tiene, la del padrón** (la misma fila única que
  da `nombre_padron`). Sin mapeo, con `trim`; si las dos están vacías, o el número está repetido en el padrón ⇒ `null`. Cuando las dos
  existen y difieren, gana la cuenta.
- **El perfil no informa si el socio está al día**, ni cuota, deuda o estado de cuenta: hoy no es un dato que se tenga (decisión del
  2026-10-27).
- `nombre_padron`: el nombre del socio en el padrón, por el mismo vínculo que la pertenencia de `/inscripciones` y además con el mismo
  texto (`"03072"` no toma el `3072`). `null` si el número no está en el padrón, no es un número (p. ej. `"3072 "`), o está repetido (la
  API no elige).
- No se exponen DNI, CUIT, fecha de nacimiento, domicilio ni los socios vinculados por propietarios. Los strings salen por la regla
  de encoding de la API (#174 §8): un nombre legacy en CP850 se ve mal y no se corrige acá.

| status | `code` | cuándo |
|---|---|---|
| `401` | — | sin token, o inválido |
| `403` | `usuario_no_habilitado` | el usuario del token no existe o no está habilitado (el mismo body que `/inscripciones`) |
| `503` | `base_no_disponible` | la base no responde |

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
| `/delegados` | `86400` (1 día) |
| `/perfil` | `private, no-store` (datos personales) |
| resto | sin header (no cacheable por default) |

## Ejemplos rápidos (cURL)

```bash
# Listing de animales por nombre
curl "https://api.caballoscriollos.com/animales?nombre=cardal&limit=10"

# Pedigree (el ":" puede ir literal o URL-encoded)
curl "https://api.caballoscriollos.com/animales/pdre:1000/pedigree"

# Noticias destacadas del último mes
curl "https://api.caballoscriollos.com/noticias?destacado=1&fecha_desde=2026-05-01"

# Catálogo + resultados de un evento
curl "https://api.caballoscriollos.com/eventos/2057/catalogo"
curl "https://api.caballoscriollos.com/eventos/2057/resultados"

# Próximos eventos ordenados por fecha ascendente
curl "https://api.caballoscriollos.com/eventos?fecha_desde=2026-06-02&sort=fecha_asc"

# ¿Qué hay en vivo ahora?
curl "https://api.caballoscriollos.com/vivos?estado=en_vivo"

# Vivos de un evento puntual
curl "https://api.caballoscriollos.com/eventos/2057/vivos"

# Registrar push token de la app
curl -X POST -H 'Content-Type: application/json' \
     -d '{"token":"abc123","plataforma":"ios","device_id":"iphone-juan"}' \
     "https://api.caballoscriollos.com/push/register"

# Notificaciones nuevas desde el último check (para el badge de la campanita)
curl "https://api.caballoscriollos.com/notificaciones?since=2026-06-08%2010:00:00"

# Imagen optimizada de una noticia (máx 800px, WebP si el cliente lo acepta)
curl -H 'Accept: image/webp' \
     "https://api.caballoscriollos.com/img/noticias/2026062403064981243.png?w=800"

# Reglamentos: pruebas disponibles + reglamentos de una prueba
curl "https://api.caballoscriollos.com/reglamentos/pruebas"
curl "https://api.caballoscriollos.com/reglamentos?prueba=5"
```

## Cambios respecto de `/api`

**La conducta de los endpoints es la misma que en `/api`**: las mismas firmas, parámetros, respuestas y
errores. Cambia la URL, y se corrige la documentación donde decía algo distinto de lo que la API hace
(y hacía) de verdad. En las filas 1 a 6 no cambió la conducta: cambia lo que dice el README. La fila 7
es la **única diferencia de conducta**, y es de borde.

| | qué | antes (README de `/api`) | ahora (lo que la API hace) |
|---|---|---|---|
| 1 | **URL base** | `https://caballoscriollos.com/api` | `https://api.caballoscriollos.com`, mismos paths sin el prefijo `/api`. Las URLs de imagen que arman los endpoints (`imagen.optimizada`, `imagen_optimizada`) apuntan a `https://api.caballoscriollos.com/img/...` |
| 2 | `GET /animales/{id}` y `/pedigree` con **id mal formado** | `404` | `400` con `"ID inválido (esperado formato 'pdre:N' / 'exis:N' / 'extr:N'): <id>"`. `404` queda sólo para un id bien formado que no existe |
| 3 | `GET /eventos`: **`fecha_desde` / `fecha_hasta`** | `Fecha >= fecha_desde`, `Fecha <= fecha_hasta` | Miran **las dos fechas** del evento (`fecha` y `fecha_hasta`): `fecha_desde` deja pasar el evento si **cualquiera** de las dos es `>=` el valor, y `fecha_hasta` si **cualquiera** es `<=`. Un evento que empezó antes de `fecha_desde` y termina después entra |
| 4 | `GET /eventos/{id}/resultados/{prueba}/{target}`: **cache** | `Cache-Control: public` | No envía `Cache-Control` |
| 5 | `GET /rankings/solanet/detalle`: **`animalId`** | viene `null`; hay que resolverlo por SBA | Se completa **server-side por SBA + RP** (`"pdre:N"`, ...). `/api` resolvía por **SBA sola** con prioridad machos > hembras > extranjeros, y como la SBA no identifica un animal devolvía otro caballo en 525 de los 1133 méritos de premio 2 (medido 2026-10-30); acá el RP del mérito desempata, y la SBA que el RP no desempata deja `idAnimal`/`tabla`/`animalId` en `null` en vez de adivinar. Ver la nota "Pedigree en el detalle Solanet". **`/api` sigue con el comportamiento viejo**: es la única divergencia de VALOR de este endpoint, declarada en `tests/paridad/casos/rankings.php` |
| 6 | `GET /rankings/paleteada` | siempre `modo: "not_available"` | Con el filtro de año en **2026** responde `modo: "pdf"` por un override de `config/rankings_pdf.json`. Para los otros valores, se comporta como dice la sección de rankings |
| 7 | `GET /notificaciones?since=…`: **parser de fechas** | `since` lo interpretaba PHP 5.6 | Lo interpreta PHP 8, y su parser no acepta exactamente lo mismo. Medido: `2026-07-24 ART` (abreviatura de zona vieja) en `/api` filtraba, y acá **se ignora** (devuelve todas). Con fechas `YYYY-MM-DD`, `YYYY-MM-DD HH:MM:SS`, ISO 8601 y los relativos comunes (`yesterday`, `-1 week`…) el resultado es el mismo |
| 8 | `GET /rankings/{slug}`: **claves `origen` y `premio`, y query `calculado=1`** (E3, `docs/plan-php84-e3-web.md`) | no existían | Aditivas: `origen` (siempre; `null` fuera de `modo: ranking`) y `premio` (sólo `solanet`) se suman a la respuesta para la web; con `calculado=1` se saltean los overrides. Sin el parámetro, la respuesta de la app es la de antes más esas claves. En la paridad son divergencia declarada (`tests/paridad/casos/rankings.php`) |

Las secciones de cada endpoint de arriba se revisan contra el código a medida que se porta cada módulo. Hasta
entonces, si una sección contradice esta tabla, vale esta tabla.
