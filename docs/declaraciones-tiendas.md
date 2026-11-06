# Qué declarar en App Store Connect y Play Console

La etapa 2 cambió lo que la app recolecta: antes no había login y ahora sí. Las
respuestas de **App Privacy** (Apple) y **Data safety** (Google) quedaron
describiendo la app de antes, y 2.0.0 ya está subida.

Este documento dice **qué hace la app**, medido sobre el código, y cómo se mapea
a cada pregunta de los dos formularios. La declaración la firma la ACCC: lo que
sigue es el insumo técnico para contestarla, no un dictamen legal.

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
| ids de animales, jinete, equipo, evento | `POST /inscripciones`, `POST /equipos` | al inscribir |
| **nombre, apellido y documento de un jinete o domador** | `POST /jinetes` · `POST /domadores` (en 2.0.0 y anteriores, `GET` con los datos en la URL) | al buscar en el alta |
| texto de búsqueda de pedigree | `GET /animales?...` | al buscar |

### Entra al dispositivo (esto **no** es recolección de la app)

`GET /perfil` devuelve nombre, apellido, **email, teléfono y celular**, número y
categoría de socio. La app los muestra en Mi cuenta y en el carnet, pero son
datos que la ACCC **ya tenía**: la app los lee, no los junta. Para los
formularios eso no es "Data Collection" — pero ojo con el punto 4, porque la
sesión sí se guarda en el dispositivo.

---

## 2. Apple — App Privacy

Lo que hay que agregar a lo que ya está declarado (hoy sólo figura *Device ID*):

| categoría | ¿recolectado? | finalidad | ¿vinculado a la identidad? | ¿tracking? |
|---|---|---|---|---|
| **Identifiers → User ID** | **Sí** (nuevo) | App Functionality | **Sí** | No |
| **Identifiers → Device ID** | Sí (ya estaba) | App Functionality | hoy No; **pasa a Sí** si se hace A.1 del pedido | No |
| **Contact Info → Name / Email / Phone** | ver abajo | App Functionality | Sí | No |
| **Usage Data → Product Interaction** | **No** hoy | — | — | — |

Tres cosas a decidir, no a copiar:

1. **Contact Info.** Estrictamente, la app no la recolecta: la recibe de `/perfil`.
   Pero sí manda **nombre, apellido y documento de un jinete** al buscarlo en el
   alta — y eso es dato personal **de un tercero**, no del que usa la app. Por eso
   la respuesta conservadora es declarar Contact Info como recolectada y
   vinculada. Sub-declarar es lo que hace que Apple baje una app; declarar de más
   sólo agrega una etiqueta.
2. **Device ID vinculado a la identidad.** Hoy el `device_id` no se ata a nadie y
   está bien declarado como no vinculado. Si se hace la pieza A del pedido
   (`IdUsuario` en `tblPushTokens`), **pasa a estar vinculado** y hay que cambiar
   la respuesta en el mismo release.
3. **Tracking = No**, en todos los casos. "Tracking" para Apple es cruzar el dato
   con datos de terceros o compartirlo con data brokers. No hacemos ninguna de
   las dos, y por eso la app no necesita el prompt de ATT. Esto se mantiene
   mientras la analítica sea propia — un SDK de terceros lo cambiaría.

### Lo otro que Apple mira cuando aparece un login

- **Borrado de cuenta.** Apple exige que una app que **permite crear** cuentas
  permita también borrarlas desde la app. La nuestra **no crea** cuentas: se
  crean en la web y la app sólo inicia sesión, así que el requisito no debería
  aplicar. Dicho eso, es un punto donde los revisores preguntan seguido; conviene
  tener la respuesta lista ("el alta y la baja de socio se gestionan en la ACCC").
- **La URL de la política** tiene que contestar lo mismo que el formulario. Hoy no
  lo hace (punto 4).

---

## 3. Google — Data safety

Play pregunta lo mismo con otro recorte, y además tres cosas que Apple no:

| sección | respuesta |
|---|---|
| Personal info → **Name** | recolectado (el del jinete que se busca), compartido: no |
| Personal info → **Email address** | ver la discusión de Contact Info arriba |
| Personal info → **User IDs** | recolectado, finalidad: App functionality / Account management |
| Personal info → **Other info** (documento del jinete) | recolectado, finalidad: App functionality |
| Device or other IDs → **Device ID** | recolectado (push), compartido con Expo / APNs / FCM |
| App activity → Product interaction | **No** hoy |

Las tres preguntas extra de Play:

1. **¿Los datos van encriptados en tránsito?** **Sí** — todo va por HTTPS/TLS
   contra `api.caballoscriollos.com`. Es lo mismo que ya declara `app.json` con
   `ITSAppUsesNonExemptEncryption: false` (encriptación estándar exenta).
2. **¿El usuario puede pedir que se borren sus datos?** Hay que dar un mecanismo
   y nombrarlo: hoy sería escribir a la ACCC. Necesita un email de contacto real,
   que es uno de los `[corchetes]` sin completar de la política.
3. **¿La recolección es opcional?** Las notificaciones **sí** (si no da el
   permiso, no se manda token ni `device_id`). El login **no** es opcional para
   usar inscripciones y carnet, pero **la app entera se puede usar sin iniciar
   sesión** — eventos, pedigree, rankings y noticias no lo piden. Eso es un punto
   a favor y conviene que quede dicho así.

---

## 4. La política de privacidad hay que reescribirla, no parchearla

`docs/politica-privacidad.md` se escribió antes del login y hoy afirma lo
contrario de lo que pasa:

| dice | realidad desde 2.0.0 |
|---|---|
| §2: «La App **no requiere registro ni inicio de sesión** y **no te pide datos personales**» | hay login con usuario y clave |
| §3: «no recolecta… Cuentas, contraseñas ni datos de perfil (**no hay login**)» | la sesión se guarda en SecureStore; se piden y muestran nombre, email, teléfono, número y categoría de socio |
| §2.3: lo único local es la fecha de la campanita | la **sesión del socio** se guarda en el dispositivo (SecureStore) |
| App Privacy al final: sólo *Device ID*, «no vinculado a la identidad» | ahora hay User ID y datos de terceros |

Lo que hay que agregar, además de corregir eso: que existe login, qué se guarda
en el dispositivo y cómo se borra (cerrar sesión borra la sesión de SecureStore),
el dato del jinete que se busca en el alta, y el carnet (el QR lleva un token que
**cualquiera que lo escanee** puede resolver a nombre, número y categoría — eso es
una divulgación deliberada y conviene que esté explicada, junto con que el socio
puede renovar el código cuando quiera).

Y sigue siendo un borrador con `[corchetes]`: razón social, domicilio, email de
contacto y fecha. Sin el email no se puede contestar la pregunta 2 de Play.

**No puedo ver qué hay publicado hoy** en la URL que figura en las dos tiendas.
Eso hay que chequearlo antes que nada: si es este texto, está diciendo que la app
no tiene login justo cuando 2.0.0 lo estrena.

---

## 5. Un hallazgo que cruza con el pedido de analítica

`GET /jinetes` manda el **documento** de una persona en el query string
(`src/api/alta.js:151`). Funciona, pero los query strings quedan enteros en los
logs de acceso del servidor.

**No es un problema a futuro: ya está pasando.** El equipo de la API avisó que el
**log de accesos de cPanel guarda hoy la URL completa**, con el documento adentro.
La primera versión de esta sección decía «hay que resolverlo antes de empezar a
guardar el log»; el log ya se está guardando, así que la exposición existe ahora y
no depende de que se haga la pieza B.0 del
[pedido](pedido-uso-y-push-por-cuenta.md).

Y en un hosting compartido lo más probable es que **no se pueda cambiar el formato
del log**, así que la salida de recortar o hashear el query string seguramente no
está disponible. Queda la otra: **que la búsqueda de jinete pase a `POST`**, con el
documento en el body.

⚠️ **Sacar el `GET` rompe la app instalada.** La 2.0.0 que está en las tiendas
busca por `GET /jinetes?...`; si el endpoint deja de aceptarlo, el alta de
inscripciones se rompe en todos los teléfonos que no actualicen.

**Estado:** las dos primeras etapas están hechas.

- La API acepta `POST /jinetes` y `POST /domadores` y **sigue aceptando el `GET`**,
  ya en producción.
- La app pasa a `POST` en el código (`src/api/alta.js`), para la próxima versión.
  La 2.0.0 que está publicada sigue usando el `GET`.
- El `GET` se apaga con un `410 actualizar_app` cuando los `GET` viejos bajen del
  5 % durante dos semanas, o a los 60 días de que salga la versión de la app con
  el `POST`, lo que llegue primero, y nunca antes de 30 días.

Hasta ese apagado, los teléfonos con versiones viejas siguen dejando el documento
en el log. No hay forma más rápida que no sea romper el alta en campo.

---

## Resumen

| | qué hacer | de quién depende |
|---|---|---|
| 1 | chequear qué política está publicada hoy en las dos tiendas | usuario |
| 2 | completar los `[corchetes]` (razón social, domicilio, email, fecha) | ACCC |
| 3 | reescribir las secciones §2, §3 y §2.3 de la política | nuestro |
| 4 | actualizar App Privacy: agregar User ID, resolver Contact Info | usuario |
| 5 | actualizar Data safety: lo mismo + las tres preguntas extra | usuario |
| 6 | que el log no se coma el documento del jinete | equipo de la API |
| 7 | si se hace la pieza A, cambiar Device ID a «vinculado» | usuario |
