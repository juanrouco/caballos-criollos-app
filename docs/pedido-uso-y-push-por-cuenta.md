# Pedido a la API: push por cuenta y registro de uso

Dos piezas que la app necesita del backend y una tercera que es nuestra. Ninguna
es urgente para 2.0.0 (ya está compilada y subida); las tres apuntan a lo que
viene después.

El contexto que las habilita: **la etapa 2 metió login**. Desde 2.0.0 la app
tiene sesión, el socio se identifica, y hay inscripciones con dueño. Varias cosas
que antes no tenían sentido ahora sí.

Lo que sigue está escrito como propuesta, no como diseño cerrado: las tablas y
los nombres son sugerencias para que la discusión arranque de algo concreto.

---

## Pieza A — Poder mandarle un push a un socio

### El problema

Hoy **ningún punto de la cadena sabe quién es el que recibe**. Medido sobre el
código, no supuesto:

| pieza | estado |
|---|---|
| `POST /push/register` | la app manda `{token, plataforma, device_id}` con `apiPost`, **sin Bearer** (`src/api/push.js`) |
| `tblPushTokens` | `Token` (UNIQUE), `Plataforma`, `DeviceId`, activo, timestamps — **ninguna columna de usuario** |
| `PushTokenRepository` | su única lectura es «todos los tokens activos (para broadcast)» |
| `GET /notificaciones` | se llama sin Bearer y filtra `IdUsuario IS NULL` |

Resultado: se puede avisar «empezó la transmisión» a todo el mundo, y nada más.
«Se confirmó tu inscripción», «se cerró el plazo de tu evento», «tu carnet se
renovó desde otro teléfono» no tienen por dónde salir.

**La mitad ya está hecha.** `tblNotificaciones` **ya tiene `IdUsuario`**, el
`SELECT` del repo ya lo trae, y el filtro lo excluye a propósito con este
comentario en `NotificacionRepository::buildWhere`:

```php
// Día 1: solo broadcast (IdUsuario IS NULL) y activas. Cuando se
// sume login, esto se ajusta para incluir las del usuario actual.
```

El login ya se sumó. Lo que falta es el otro lado: el token.

### A.1 — `tblPushTokens` necesita a quién pertenece

Una columna nullable, con índice para la consulta de envío:

```sql
ALTER TABLE tblPushTokens
  ADD COLUMN IdUsuario INT NULL DEFAULT NULL AFTER DeviceId,
  ADD INDEX ix_idusuario (IdUsuario);
```

**Nullable no es un detalle:** la app registra el token al arrancar, que en un
arranque en frío es *antes* de que haya sesión. El token anónimo tiene que seguir
existiendo y seguir recibiendo los broadcast, igual que hoy.

### A.2 — `/push/register` con Bearer opcional

Que lea el `Authorization: Bearer` **si viene**, y guarde ese `IdUsuario`. Sin
Bearer, `NULL`.

Un detalle que importa y es fácil de pasar por alto: el `INSERT ... ON DUPLICATE
KEY UPDATE` de `PushTokenRepository::register` tiene que asignar `IdUsuario`
**también cuando es NULL**:

```sql
ON DUPLICATE KEY UPDATE
  ...,
  IdUsuario = VALUES(IdUsuario)
```

Si el `UPDATE` sólo escribe el valor cuando no es nulo, el `IdUsuario` queda
pegado al token para siempre y **el socio siguiente que use ese teléfono recibe
las notificaciones del anterior**. En una asociación, con teléfonos que se pasan
de mano, eso es una filtración de datos, no una molestia. La app va a
re-registrar sin Bearer justo para limpiarlo al cerrar sesión (ver A.4).

### A.3 — `/notificaciones` con Bearer opcional

El ajuste que anticipa el comentario de `buildWhere`:

- **Sin Bearer** → exactamente lo de hoy (`IdUsuario IS NULL`). No se rompe nada
  para una app vieja que no manda el header.
- **Con Bearer** → `(IdUsuario IS NULL OR IdUsuario = <el de la sesión>)`.

Así la campanita del socio mezcla lo general con lo suyo, y el `since` / `total`
siguen funcionando igual. Sin esto, una notificación personal se guarda pero el
socio no la ve nunca en la lista: sólo le llega el push.

### A.4 — Lo que hace la app (nuestro lado)

Para que quede claro qué no les estamos pidiendo:

1. Registrar con `apiPostAuth` cuando hay sesión, y con `apiPost` cuando no.
2. **Re-registrar al loguearse y al cerrar sesión.** Hoy el hook corre una sola
   vez al montar (`usePushNotifications`, `useEffect` con `[]`), así que no se
   enteraría del login. Hay que atarlo al estado de `AuthContext`.
3. Mandar el Bearer en `/notificaciones` cuando hay sesión.

---

## Pieza B — Registrar cómo se usa la app

### Qué queremos saber

A qué secciones entra la gente, qué eventos y qué caballos abre, qué búsquedas de
pedigree no encuentran nada (eso último es un dato del stud book, no de la app:
es pedigree que alguien busca y no está cargado), y qué errores ve.

Hoy no hay **nada**: ni una dependencia de analítica en `package.json`.

### B.0 — ¿Y medirlo desde la API, mirando a qué endpoint entra?

Es la primera pregunta que hay que hacerse, porque sale casi gratis: el log de
accesos de `api.caballoscriollos.com` ya tiene cada request. Y ese vhost es casi
puro tráfico de la app, así que no hay que separarlo del sitio.

**Lo que se contesta así, sin tocar una línea de la app:** qué eventos y qué
animales se abren (`/eventos/{id}`, `/animales/{sba}`), qué rankings se piden,
cuánto se usan las funciones de socio (`/perfil`, `/inscripciones`,
`/perfil/carnet`), y qué búsquedas de pedigree vuelven vacías.

**Lo que no, y conviene saberlo antes de apoyarse en esos números:**

1. **Mide fetches, no visitas.** `HorseDetailScreen` tiene un cache por id **sin
   TTL**: el socio puede volver cinco veces al mismo caballo y pega una sola.
   `EventDetailScreen` cachea con TTL corto. Volver a una tab ya cargada no pega
   nada. Los números van a estar sistemáticamente por debajo del uso real, y no
   por un factor parejo: lo más usado es lo más cacheado.
2. **El polling ahoga la señal.** `LiveContext` pide `/vivos` cada 60 s y
   `NotificationsContext` cada 30 s, en cualquier pantalla. Un teléfono abierto
   diez minutos son ~30 requests sin ninguna intención atrás. En un ranking por
   endpoint, esos dos ganan siempre.
3. **No hay con qué agrupar.** La app no manda hoy **ningún** header propio (ver
   `src/api/client.js`): ni versión ni identificador. Agrupar por IP no sirve —
   en el predio muchos teléfonos salen por la misma IP de la operadora, que es el
   mismo CGNAT que ustedes ya consideraron en el rate limit de #64 (R-7). Y
   correlacionar por IP es justo la clase de correlación que B.3 quiere evitar.
4. **Las secciones sin HTTP son invisibles.** Mapa ACCC no pide nada. Y lo que
   preguntó el usuario era «a qué secciones entra», que es navegación, no fetches.

**El middle ground, que recomendamos hacer primero:** que la app mande dos
headers en cada request y que el log los guarde.

```
X-App-Version: 2.0.0
X-App-Install: <el mismo device_id que ya usa /push/register>
```

Son ~5 líneas en `src/api/client.js` (nuestro lado) y una columna en el log del
lado de ustedes. Con eso el log pasa de «cuántos hits tuvo /eventos/2276» a
«cuántas instalaciones distintas lo abrieron, desde qué versión» — que es la
pregunta que de verdad importa. Sigue sin ver las secciones ni arreglar el
cacheo, pero cuesta una tarde y no necesita endpoint nuevo.

Después de eso, `POST /uso` es para lo que el log no puede dar: navegación,
secciones, orden, y los errores que el socio vio sin que ninguna request fallara.
No son alternativas, son dos resoluciones distintas del mismo dato — el log
cuenta requests, `/uso` cuenta intenciones.

### Por qué un endpoint propio y no un tercero

Descartamos PostHog / Amplitude / Firebase, que serían más rápidos, por dos
razones concretas:

1. Mandarían el uso de socios identificables a un servidor ajeno. La política de
   privacidad de la app hoy promete lo contrario, con esas palabras: «no
   recolecta… herramientas de analítica de terceros ni publicidad ni rastreo
   entre apps».
2. Obliga a declarar *tracking* en App Privacy de Apple, que es una categoría con
   consecuencias (el prompt de ATT, entre otras).

Un `POST` a la API de la ACCC no tiene ninguno de los dos problemas: el dato
queda en la base de la asociación y no sale a ningún lado.

### B.1 — `POST /uso`

Sin autenticación y **anónimo a propósito** (ver B.3). La app acumula eventos y
los manda en lotes; es fire-and-forget, nunca bloquea una pantalla ni muestra un
error si falla.

**Request:**

```json
{
  "device_id": "uuid-o-null",
  "plataforma": "ios",
  "version": "2.0.0",
  "eventos": [
    { "que": "seccion",  "cual": "carnet",          "cuando": "2026-11-06 11:29:04" },
    { "que": "tab",      "cual": "RankingsTab",     "cuando": "2026-11-06 11:29:40" },
    { "que": "pantalla", "cual": "EventDetail",     "cuando": "2026-11-06 11:30:02", "id": 2276 },
    { "que": "busqueda_vacia", "cual": "pedigree",  "cuando": "2026-11-06 11:31:10" },
    { "que": "error",    "cual": "rankings_500",    "cuando": "2026-11-06 11:32:00" }
  ]
}
```

- `que` es un enum corto y cerrado: `seccion`, `tab`, `pantalla`,
  `busqueda_vacia`, `error`. Cerrado para que no se vuelva un basurero de strings
  libres que después nadie puede consultar.
- `cual` es la clave de la app (`openSection(key)`, el nombre de la ruta, etc.).
- `id` opcional, cuando el evento es sobre algo concreto (un evento, un animal).
- `cuando` en hora Argentina sin TZ, igual que el resto de la API.

**Respuesta:** `200` o `204`, body indistinto — la app lo ignora.

**Límites que les pedimos poner ustedes**, porque es un endpoint sin sesión que
escribe:

- Un tope de eventos por request (¿200?) y un `413` o un descarte silencioso
  arriba de eso.
- Rate limit por IP. Ya existe el mecanismo: `RegistroIntentos::contar(ambito,
  ip, segundos)`, el mismo que usa la verificación del carnet (#64). Un ámbito
  `'uso'` y listo.
- Ignorar un `que` desconocido en vez de rechazar el lote entero: si una app
  vieja manda algo que ya no existe, no tiene sentido perder el resto.

### B.2 — Tabla sugerida

```sql
CREATE TABLE tblApiUso (
  IdUso      INT AUTO_INCREMENT PRIMARY KEY,
  DeviceId   VARCHAR(64) NULL,
  Plataforma VARCHAR(10) NOT NULL,
  Version    VARCHAR(20) NULL,
  Que        VARCHAR(20) NOT NULL,
  Cual       VARCHAR(60) NOT NULL,
  IdRef      INT NULL,
  Cuando     DATETIME NOT NULL,
  INDEX ix_que_cuando (Que, Cuando),
  INDEX ix_cual_cuando (Cual, Cuando)
);
```

El volumen es chico: unas decenas de filas por socio por sesión. Para lo que ese
servidor ya mueve, es ruido.

### B.3 — Lo que **no** lleva, y por qué

**Ni Bearer ni `IdUsuario`.** No es un olvido: atar el uso a la cuenta significa
dejar registrado **qué pedigree de quién estuvo mirando cada socio**. En una
asociación de criadores eso es información sensible — hay gente que preferiría
que no quedara asentado qué animales de la competencia estuvo revisando.

La decisión es del usuario y de la ACCC, no nuestra, así que el diseño la deja
abierta sin comprometerse: si más adelante se decide atribuir, la app empieza a
mandar el Bearer y el endpoint agrega la columna. Un cambio de una línea de cada
lado. Al revés —arrancar atribuido y después anonimizar— no se puede: los datos
ya quedaron.

Si lo que se quiere es soporte («este socio dice que no le anda X»), alcanza con
atribuir **sólo los eventos `error`**, que es un conjunto chico y con una razón
clara para existir.

---

## Pieza C — La política de privacidad quedó desactualizada (y esto es nuestro)

No es un pedido a la API, pero sale del mismo lugar y conviene que esté escrito.

`docs/politica-privacidad.md` se escribió **antes del login**, y hoy dice cosas
que ya no son ciertas:

| dice | realidad desde 2.0.0 |
|---|---|
| §2: «La App **no requiere registro ni inicio de sesión** y **no te pide datos personales**» | hay login con usuario y clave |
| §3: «no recolecta… Cuentas, contraseñas ni datos de perfil (**no hay login**)» | la sesión se guarda en SecureStore; la app pide y muestra nombre, número de socio y categoría |
| App Privacy (al final): sólo *Device ID*, «no vinculado a la identidad del usuario» | ahora hay datos de contacto y un identificador de usuario |

Además sigue siendo un **borrador con `[corchetes]` sin completar** (razón social,
domicilio, email de contacto, fecha) y no está linkeada desde ninguna pantalla de
la app.

Dos cosas que no puedo verificar desde acá y hay que chequear:

1. **Qué hay publicado hoy** en la URL que figura en App Store Connect y en Play
   Console. Apple exige ese link para aprobar, así que algo hay; si es este texto,
   está diciendo que la app no tiene login justo cuando 2.0.0 lo estrena.
2. **Las respuestas de App Privacy** en App Store Connect y el *Data safety* de
   Play, que ahora declaran menos de lo que la app recolecta.

Esto hay que arreglarlo **independientemente** de las piezas A y B: 2.0.0 ya está
subida. Y si se hace B, la política necesita además una sección de datos de uso.

---

## Resumen de lo que pedimos

| | qué | dónde |
|---|---|---|
| A.1 | `IdUsuario INT NULL` + índice en `tblPushTokens` | migración |
| A.2 | `/push/register` lee el Bearer si viene; el `ON DUPLICATE` asigna `IdUsuario` también en NULL | `PushHandler` / `PushTokenRepository` |
| A.3 | `/notificaciones` con Bearer opcional: `IdUsuario IS NULL OR IdUsuario = <sesión>` | `NotificacionRepository::buildWhere` |
| B.0 | guardar `X-App-Version` y `X-App-Install` en el log de accesos | config del log |
| B.1 | `POST /uso`, anónimo, en lotes, con tope y rate limit por IP | módulo nuevo |
| B.2 | `tblApiUso` | migración |

B.0 primero: cuesta una tarde, no necesita endpoint nuevo y puede alcanzar. B.1 y
B.2 recién si lo que falta son las secciones y la navegación.

De nuestro lado: re-registrar el token al loguearse y al salir, mandar el Bearer
en `/notificaciones`, instrumentar los dos cuellos de botella que ya existen
(`MenuContext.openSection` y el `onStateChange` del `NavigationContainer` — con
esos dos puntos se cubre toda la app sin tocar una sola pantalla), y poner al día
la política de privacidad.
