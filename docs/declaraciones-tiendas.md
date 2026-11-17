# Qué declarar en App Store Connect y Play Console

La etapa 2 cambió lo que la app recolecta: antes no había login y ahora sí. Las
respuestas de **App Privacy** (Apple) y **Data safety** (Google) quedaron
describiendo la app de antes.

Este documento dice **qué hace la app**, medido sobre el código, y cómo se mapea
a cada pregunta de los dos formularios. La declaración la firma la ACCC: lo que
sigue es el insumo técnico para contestarla, no un dictamen legal.

**Puesto al día el 17/11/2026, con la 2.0.2 en TestFlight y en el track
interno.** Lo que cambió desde la primera versión de este documento (06/11), que
se escribió cuando la 2.0.1 todavía no existía:

- `POST /uso` **ya salió** (2.0.1), así que los datos de uso dejaron de ser un
  "cuando se haga" y son un hecho: dos respuestas que acá figuraban como "no"
  ahora son "sí".
- El **push por cuenta** también salió, así que el `device_id` **vinculado a la
  identidad** dejó de ser condicional.
- La búsqueda de jinete ya va por `POST`, así que el documento no viaja más en la
  URL desde las versiones publicadas de la app.
- La 2.0.2 (los cuatro arreglos del alta) **no mueve ninguna respuesta**: no
  cambia nada de lo que sale del dispositivo.

---

## 0. Lo que puede frenar la revisión

Esto no es privacidad, es revisión, y es el motivo más común de rechazo cuando
una app estrena login. Las dos preguntas son la misma con distinto nombre:

| tienda | dónde | qué va |
|---|---|---|
| Apple | App Review Information | usuario y clave de un socio de prueba, y una nota corta |
| Google | App content → App access | lo mismo: marcar que hay login y dar las credenciales |

Si el revisor no puede iniciar sesión, las inscripciones y el carnet le quedan
inaccesibles y Apple rechaza por la guideline 2.1. Dos detalles que valen la pena:

- Que el socio de prueba **tenga inscripciones cargadas**, para que la pantalla no
  le aparezca vacía y la dé por rota.
- Que la nota diga que **el alta de socios la hace la ACCC y no la app**. Es la
  misma respuesta que sirve para la pregunta del borrado de cuenta (§2).

La cuenta queda guardada en las dos consolas, así que conviene que sea una de
prueba y no la de una persona real.

---

## 1. Lo que la app manda y lo que recibe

La distinción importa, porque los dos formularios preguntan por lo que **sale del
dispositivo**, no por lo que la app muestra en pantalla.

### Sale del dispositivo (esto es lo que se declara)

| qué | a dónde | cuándo |
|---|---|---|
| usuario + clave | `POST /auth/login` | al iniciar sesión |
| clave actual + clave nueva | `POST /auth/clave` | al cambiarla |
| refresh token | `POST /auth/logout`, `/auth/refresh` | al salir y cada 60 min |
| Expo push token, `device_id`, plataforma | `POST /push/register` | en cada arranque, si aceptó notificaciones |
| `device_id` | `POST /push/baja` | al arrancar y en cada foreground, mientras el permiso no esté concedido |
| ids de animales, jinete, equipo, evento | `POST /inscripciones`, `POST /equipos` | al inscribir |
| **nombre, apellido y documento de un jinete o domador** | `POST /jinetes` · `POST /domadores` | al buscar en el alta |
| texto de búsqueda de pedigree | `GET /animales?...` | al buscar |
| **eventos de uso** (`seccion`, `tab`, `pantalla`, `busqueda_vacia`, `error`) + plataforma + versión | `POST /uso` | en lotes, al pasar la app a background |

El `POST /push/register` va **con Bearer cuando hay sesión**, y ahí el backend ata
el token y el `device_id` al socio. Esa es la pieza que cambia una respuesta de
Apple y una de Google (§2 y §3).

El `POST /uso` es al revés, y es el único del contrato así: **no manda nada que
identifique** —ni Bearer, ni `device_id`— y el lote es estricto, de modo que una
clave de más lo hace rechazar entero. Lo buscado en pedigree tampoco viaja: el
`cual` de `busqueda_vacia` es la sección, no el término.

### Entra al dispositivo (esto **no** es recolección de la app)

`GET /perfil` devuelve nombre, apellido, **email, teléfono y celular**, número y
categoría de socio. La app los muestra en Mi cuenta y en el carnet, pero son
datos que la ACCC **ya tenía**: la app los lee, no los junta. Para los
formularios eso no es "Data Collection" — pero ojo con el §4, porque la sesión sí
se guarda en el dispositivo.

---

## 2. Apple — App Privacy

Lo que hay que agregar a lo que ya está declarado (hoy sólo figura *Device ID*):

| categoría | ¿recolectado? | finalidad | ¿vinculado a la identidad? | ¿tracking? |
|---|---|---|---|---|
| **Identifiers → User ID** | **Sí** (nuevo) | App Functionality | **Sí** | No |
| **Identifiers → Device ID** | Sí (ya estaba) | App Functionality | **pasa a Sí** | No |
| **Contact Info → Name / Email / Phone** | ver abajo | App Functionality | Sí | No |
| **Other Data** (documento del jinete) | Sí (nuevo) | App Functionality | Sí | No |
| **Usage Data → Product Interaction** | **Sí** (nuevo) | Analytics | **No** | No |

Cuatro cosas a decidir, no a copiar:

1. **Contact Info.** Estrictamente, la app no la recolecta: la recibe de `/perfil`.
   Pero sí manda **nombre, apellido y documento de un jinete** al buscarlo en el
   alta — y eso es dato personal **de un tercero**, no del que usa la app. Por eso
   la respuesta conservadora es declarar Contact Info como recolectada y
   vinculada. Sub-declarar es lo que hace que Apple baje una app; declarar de más
   sólo agrega una etiqueta.
2. **Device ID vinculado a la identidad.** Esto era condicional en la primera
   versión del documento y **ya no lo es**: con el push por cuenta, el backend ata
   el token y el `device_id` al socio a partir del Bearer. La respuesta vieja
   ("no vinculado") quedó falsa.
3. **Product Interaction recolectado, pero NO vinculado.** Es la diferencia entre
   "recolectamos uso" y "recolectamos uso atado a tu persona", y se sostiene en
   algo concreto: `POST /uso` no manda identificador de ninguna clase. La etiqueta
   que ve el socio en la ficha de la App Store es distinta según cómo se contesta,
   así que vale contestarla con cuidado.
4. **Tracking = No**, en todos los casos. "Tracking" para Apple es cruzar el dato
   con datos de terceros o compartirlo con data brokers. No hacemos ninguna de
   las dos, y por eso la app no necesita el prompt de ATT. Esto se mantiene
   mientras la analítica sea propia — un SDK de terceros lo cambiaría.

### Lo otro que Apple mira cuando aparece un login

- **Borrado de cuenta.** Apple exige que una app que **permite crear** cuentas
  permita también borrarlas desde la app. La nuestra **no crea** cuentas: se
  crean en la web y la app sólo inicia sesión, así que el requisito no debería
  aplicar. Dicho eso, es un punto donde los revisores preguntan seguido; conviene
  tener la respuesta lista ("el alta y la baja de socio se gestionan en la ACCC"),
  que es la misma nota del §0.
- **La URL de la política** tiene que contestar lo mismo que el formulario. Ver §4.
- **El *export compliance*** ya está declarado en `app.json`
  (`ITSAppUsesNonExemptEncryption: false`) y no hay nada que tocar.
- **Las capturas y el "What's New"** siguen siendo de una app sin login. La v2
  estrena inicio de sesión, inscripciones y carnet de socio: si las capturas no
  los muestran, no es un rechazo, pero es la ficha describiendo otra app.

---

## 3. Google — Data safety

Play pregunta lo mismo con otro recorte:

| sección | respuesta |
|---|---|
| Personal info → **Name** | recolectado (el del jinete que se busca), compartido: no |
| Personal info → **Email address** | ver la discusión de Contact Info arriba |
| Personal info → **User IDs** | recolectado, finalidad: App functionality / Account management |
| Personal info → **Other info** (documento del jinete) | recolectado, finalidad: App functionality |
| Device or other IDs → **Device ID** | recolectado (push), procesado por Expo / APNs / FCM |
| App activity → **Product interaction** | **recolectado** (nuevo), finalidad: Analytics |

Sobre el Device ID y los terceros: Expo, APNs y FCM reciben el token **para
prestarnos el servicio de envío**, que para Play es procesamiento por cuenta
nuestra y no "shared". La respuesta conservadora es declararlo compartido; la
exacta es "collected, not shared". Lo que no se puede es contestar una cosa acá y
otra en la política.

Las tres preguntas extra de Play:

1. **¿Los datos van encriptados en tránsito?** **Sí** — todo va por HTTPS/TLS
   contra `api.caballoscriollos.com`. Es lo mismo que ya declara `app.json` con
   `ITSAppUsesNonExemptEncryption: false` (encriptación estándar exenta).
2. **¿El usuario puede pedir que se borren sus datos?** Sí, escribiendo a
   `info@caballoscriollos.com`, que es el contacto que ya figura en la política.
   Como la app **no crea cuentas**, en la sección *Data deletion* va ese camino y
   no un botón en la app.
3. **¿La recolección es opcional?** Las notificaciones **sí** (si no da el
   permiso, no se manda token ni `device_id`, y además se manda la baja). El login
   **no** es opcional para usar inscripciones y carnet, pero **la app entera se
   puede usar sin iniciar sesión** — eventos, pedigree, rankings y noticias no lo
   piden. Eso es un punto a favor y conviene que quede dicho así.

### Las otras pantallas de Play

- **Advertising ID: no se usa.** Si después de subir el `.aab` Play tira un
  warning por el permiso `AD_ID`, no viene de nuestro código —ningún módulo del
  proyecto lo declara— sino de una dependencia de Android, y se saca del manifest.
- **Content rating:** el cuestionario no debería cambiar. La app no tiene
  contenido de usuarios ni mensajería; el login no mueve la clasificación.
- **App access:** §0.

---

## 4. La política de privacidad: escrita, y lo que falta es publicarla

`docs/politica-privacidad.md` **ya está al día**: tiene el login, el carnet, el
dato del jinete y los datos de uso, pasó las nueve correcciones del equipo de la
API más la revisión C-10, y los `[corchetes]` (razón social, domicilio, email,
fecha) están completos. Eso que en la primera versión de este documento eran tres
puntos pendientes, ya no lo son.

Lo que falta es el deploy, y no es nuestro: la copia que se publica es el HTML de
`src/web/politica-privacidad.php` del repo del backend, y son tres copias del
texto que tienen que cambiar juntas.

⚠️ **Mientras eso no pase, la URL que leen las dos tiendas sigue siendo la de
julio de 2026**, que afirma dos veces que la App no tiene login — justo cuando la
v2 lo estrena, y cuando la 2.0.1 ya está mandando datos de uso. Es lo más urgente
de todo este documento, más que cualquier casilla de los formularios.

**No se puede verificar desde el repo** qué hay publicado hoy en
`https://caballoscriollos.com/web/politica-privacidad.php`: hay que abrirlo.

---

## 5. El documento del jinete en el log (cerrado del lado de la app)

`GET /jinetes` mandaba el **documento** de una persona en el query string, y los
query strings quedan enteros en el log de accesos de cPanel. En un hosting
compartido lo más probable es que no se pueda cambiar el formato del log, así que
la salida fue mover la búsqueda a `POST`, con el documento en el body.

**Estado: hecho y publicado.** La API acepta `POST /jinetes` y `POST /domadores`
en producción, y la app los usa desde la 2.0.1 (`src/api/alta.js`). Lo que queda
es del equipo de la API: apagar el `GET` con un `410 actualizar_app` cuando los
`GET` viejos bajen del 5 % durante dos semanas, o a los 60 días de la 2.0.1, lo
que llegue primero, y nunca antes de 30 días.

⚠️ Hasta ese apagado, **los teléfonos que sigan en 2.0.0 dejan el documento en el
log** en cada búsqueda. No hay forma más rápida que no sea romper el alta en campo.

---

## 6. Qué versión movió cada respuesta

El orden es fácil de equivocar, porque **lo que dispara la recolección no es el
deploy del endpoint sino la versión de la app instalada**.

| versión | qué trajo | qué respuesta mueve |
|---|---|---|
| 2.0.0 (06/11) | login, inscripciones, carnet | User ID, Contact Info, el documento del jinete |
| 2.0.1 (16/11) | `POST /uso`, push por cuenta, jinete por `POST` | Product Interaction a "sí"; Device ID a "vinculado" |
| 2.0.2 (16/11) | cuatro arreglos del alta | ninguna |

Dos reglas que de acá salen:

- Las respuestas de las tiendas se actualizan **en el mismo envío** de la versión
  que las cambia, no después: son parte del formulario de esa versión.
- Publicar la política corregida **antes o el mismo día** que la app está bien
  (declara algo que todavía no pasa, lo cual no hace daño). Publicar la app
  **antes** que la política es el error, y es donde estamos hoy.

Hoy la 2.0.2 está en TestFlight y en el track interno, que no son públicos. Eso da
margen para completar los formularios antes de promover a producción — pero el App
Privacy de Apple tiene que estar bien igual, porque se evalúa en el envío.

---

## Resumen

| | qué hacer | de quién depende |
|---|---|---|
| 1 | publicar la política corregida en las tres copias | equipo de la API |
| 2 | chequear qué política está publicada hoy en la URL de las tiendas | usuario |
| 3 | cargar la cuenta de demo en App Review Information y en App access | usuario |
| 4 | App Privacy: agregar User ID, Other Data y Product Interaction (no vinculado), y pasar Device ID a "vinculado" | usuario |
| 5 | Data safety: lo mismo + las tres preguntas extra + advertising ID | usuario |
| 6 | capturas y "What's New" que muestren login, inscripciones y carnet | usuario |
| 7 | apagar el `GET /jinetes` cuando se cumpla la ventana | equipo de la API |
