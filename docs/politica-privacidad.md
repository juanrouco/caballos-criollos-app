# Política de Privacidad — App Caballos Criollos

**Última actualización:** 06/11/2026

Esta Política de Privacidad describe cómo la aplicación móvil **Caballos Criollos**
(en adelante, "la App"), de la **Asociación Argentina de Criadores de Caballos
Criollos** (en adelante, "ACCC", "nosotros"), trata la información de sus usuarios.

Al usar la App aceptás las prácticas descriptas en este documento.

---

## 1. Responsable del tratamiento

- **Responsable:** Asociación Argentina de Criadores de Caballos Criollos (ACCC)
- **Domicilio:** Av. Las Heras 1983 1º, CABA, Argentina
- **Contacto:** info@caballoscriollos.com
- **Teléfono:** +54 (11) 5263-2567
- **Sitio web:** https://caballoscriollos.com

---

## 2. Qué información recolectamos

**Buena parte de la App se usa sin iniciar sesión y sin dar ningún dato:** los
eventos, las noticias, los catálogos, los resultados, los rankings y la búsqueda
de pedigree están disponibles sin cuenta.

Iniciar sesión es necesario sólo para tus inscripciones, tus datos de socio y tu
carnet. Lo que se procesa en cada caso:

### 2.1. Para el envío de notificaciones push (opcional)

Si aceptás el permiso de notificaciones, la App genera y envía a nuestro servidor:

- **Token de notificaciones push:** identificador que permite enviarte avisos
  (transmisiones en vivo, novedades). No identifica tu persona.
- **Identificador del dispositivo (`device_id`):**
  - En iOS: el *Identifier for Vendor* (IDFV), un id propio del dispositivo para
    nuestras apps, que se reinicia si desinstalás la App.
  - En Android: el *Android ID* (SSAID), un id asociado al dispositivo y a la App.
  - Se usa únicamente para asociar el token con tu dispositivo y evitar duplicados.
- **Plataforma:** "ios" o "android".

Si **no** otorgás el permiso de notificaciones, **nada de lo anterior se recolecta**.

### 2.2. Para iniciar sesión (opcional)

Si decidís usar las funciones de socio, la App envía a nuestro servidor:

- **Tu usuario (o email) y tu clave**, para autenticarte. Son los mismos del sitio
  web de la ACCC: la App **no crea cuentas**; se dan de alta en la Asociación.
- **Tu clave actual y la nueva**, si la cambiás desde la App.

Mientras tenés la sesión abierta, la App envía un código de sesión en cada pedido
a nuestra API. En el servidor queda un registro de cada sesión: tu número de
usuario y las fechas de inicio, vencimiento y cierre. No incluye tu clave ni el
código en claro.

Cada intento de inicio de sesión y de cambio de clave queda registrado para
prevenir abuso: el resultado, la fecha y hora, el usuario tipeado y la IP (estos
dos, cifrados con una clave del servidor), y tu número de usuario cuando la clave
fue correcta.

Con la sesión abierta, la App **lee y te muestra** datos que la ACCC ya tiene
registrados sobre vos: nombre y apellido, email, teléfono y celular, y tu número
y categoría de socio. Esos datos no se recolectan a través de la App — ya existen
en los registros de la Asociación y la App sólo te los muestra.

### 2.3. Para inscribir un animal (opcional)

Al usar el alta de inscripciones, la App envía las referencias de lo que elegís:
el animal, el evento, la prueba, la categoría, el equipo y el jinete. Van como
identificadores de nuestros propios registros, no como datos personales.

La excepción: para **buscar un jinete o un domador** la App envía el **nombre, el
apellido y/o el número de documento** que tipeás, porque es la forma de
encontrarlo en el padrón. Ese dato es de la persona que buscás, y se usa sólo para
esa búsqueda y para dejar asentada la inscripción. Como la búsqueda viaja en la
dirección del pedido, también queda en los logs técnicos del servidor (2.4).

### 2.4. Información técnica

- Al pedir contenido a nuestra API (`api.caballoscriollos.com`), el servidor puede
  registrar datos técnicos de cada pedido: dirección IP, fecha y hora, la
  dirección pedida (que puede incluir lo que buscaste) y el tipo de dispositivo o
  navegador, en sus logs, con fines de operación y seguridad.

### 2.5. Datos almacenados sólo en tu dispositivo

Esta información **no se envía** a ningún servidor y se borra al desinstalar la App:

- La **fecha de la última vez que abriste las notificaciones**, para el contador
  de la campanita.

### 2.6. Estadísticas de uso (sin datos de tu cuenta)

La App le envía a nuestro servidor, cada tanto, un resumen de cómo se usa: qué
secciones y pantallas se abren, qué eventos, noticias y caballos se consultan,
qué búsquedas de pedigree no encontraron resultados y qué errores aparecieron,
junto con la plataforma (iOS o Android) y la versión de la App.

- Ese resumen **no lleva** quién sos: ni tu usuario, ni tu sesión, ni el
  identificador de tu dispositivo.
- La hora llega, pero **no se guarda**: de cada cosa se guarda sólo el día.
- Lo que se guarda son **totales por día** ("ese día se abrió N veces tal
  pantalla"), sin registrar qué consultó cada persona ni qué cosas vinieron
  juntas.
- **Lo que buscás en pedigree no se envía**, sólo el hecho de que una búsqueda no
  encontró nada.
- Tu dirección IP no se guarda junto con estas estadísticas. Como con cualquier
  otro pedido, queda en los logs técnicos del servidor (2.4), que registran la
  dirección pedida pero no el contenido del resumen.

---

## 3. Qué NO recolectamos

Para mayor claridad, la App **no** recolecta ni accede a:

- Ubicación / GPS.
- Cámara, micrófono, fotos ni contactos.
- Datos de pago.
- Herramientas de analítica de terceros, publicidad ni rastreo entre apps.
- Estadísticas de uso **atribuidas a una persona**: los totales de 2.6 no
  registran a quién pertenecen. Fuera de los logs técnicos del servidor (2.4),
  no se registra qué contenidos consulta cada persona.

---

## 4. Para qué usamos la información

- **Autenticarte** y mantener tu sesión abierta.
- **Gestionar tus inscripciones** a eventos y mostrarte las que ya tenés.
- **Emitir tu carnet de socio** y permitir que se verifique (ver punto 5).
- **Enviar notificaciones push** sobre eventos, transmisiones en vivo y novedades.
- **Mostrar el contenido** de la App (eventos, noticias, catálogos, resultados,
  rankings, pedigrees) que se obtiene de nuestra API.
- **Mejorar la App** con las estadísticas de uso (2.6).
- **Operar y proteger** el servicio (seguridad, prevención de abuso).

No usamos la información para publicidad ni la vendemos a terceros.

---

## 5. El carnet de socio y su código QR

El carnet que muestra la App lleva un **código QR**. Es importante que sepas qué
hace, porque implica mostrar datos tuyos a otra persona a propósito:

- El QR contiene un enlace con un **código único**. Quien lo escanee —con la
  cámara de cualquier teléfono, sin necesitar la App ni una cuenta— ve
  **tu nombre, tu número de socio y tu categoría**. Nada más: ni tu email, ni tu
  teléfono, ni tu documento.
- **No informa el estado de tu cuota.** "Activo" es tu categoría de socio, no una
  vigencia de pago.
- El código **no contiene** tus datos: sólo apunta a ellos. Si tu cuenta deja de
  corresponder a un socio, el código deja de validar automáticamente.
- Podés **renovar el código** desde la App cuando quieras. Al hacerlo, el anterior
  deja de funcionar en el acto, incluidas las copias impresas o guardadas. Es el
  mecanismo para usar si creés que alguien se quedó con una copia de tu carnet.
- La App no lleva registro de las verificaciones válidas. Las inválidas se
  registran sólo para prevenir abuso. Como en cualquier sitio web, el servidor
  guarda en sus logs técnicos (ver 2.4) cada dirección visitada con su IP y
  fecha/hora; eso incluye el código de tu carnet cuando alguien lo verifica.

---

## 6. Con quién se comparte

Para que las notificaciones funcionen, el token puede procesarse a través de los
siguientes proveedores, exclusivamente para entregar los avisos:

- **Expo (Expo Application Services):** servicio de envío de notificaciones push.
- **Apple Push Notification service (APNs):** entrega en dispositivos iOS.
- **Firebase Cloud Messaging (FCM), de Google:** entrega en dispositivos Android.

Ni tu sesión, ni tus datos de socio, ni tus inscripciones se comparten con esos
proveedores ni con ningún otro tercero.

No compartimos información con anunciantes ni con terceros para fines comerciales.

---

## 7. Conservación de los datos

- Tu **clave** no se guarda en el dispositivo. En nuestro servidor se guarda sólo
  cifrada, igual que para el sitio web.
- Tu **sesión** se guarda en tu dispositivo —en el almacenamiento seguro del
  sistema operativo— mientras no cierres sesión. Al cerrarla se borra del
  dispositivo y, si hay conexión, se marca como cerrada en el servidor, donde el
  registro se conserva; si en ese momento no había conexión, el registro del
  servidor queda abierto hasta que vence. Se renueva sola mientras usás la App y
  **caduca a los 90 días** sin usarla, con lo que tenés que volver a iniciar
  sesión.
- Los **registros de intentos** (inicio de sesión, cambio de clave,
  verificaciones inválidas del carnet y envíos de estadísticas) de más de 90 días
  se van borrando automáticamente.
- Las **estadísticas de uso** (2.6) son totales por día y se conservan sin
  plazo de borrado.
- El **código de tu carnet** se conserva mientras no lo renueves. Al renovarlo, el
  anterior se descarta.
- El **token de notificaciones** y el `device_id` se conservan mientras la App
  esté instalada. Cuando el servicio de notificaciones nos informa que ese token
  ya no sirve (por ejemplo, porque desinstalaste la App), dejamos de usarlo. El
  registro del token y de los avisos enviados queda guardado en el servidor.
- Tus **datos de socio y tus inscripciones** son registros de la Asociación y se
  conservan según sus plazos institucionales, con independencia de la App.
- Los **logs técnicos** del servidor se conservan por el plazo necesario para la
  operación y seguridad del servicio.

---

## 8. Seguridad

Toda la comunicación entre la App y nuestros servidores se realiza sobre
**HTTPS/TLS**. Tu sesión se guarda en el almacenamiento seguro que provee el
sistema operativo (Keychain en iOS, Keystore en Android), no en un archivo común.
Aplicamos medidas razonables para proteger la información, aunque ningún sistema
es 100 % infalible.

---

## 9. Tus derechos y cómo ejercerlos

- **Cerrar sesión:** desde el menú de la App. Borra tu sesión del dispositivo en
  el momento y, si hay conexión, la marca como cerrada en el servidor.
- **Renovar el código de tu carnet:** desde la pantalla "Mi carnet", si creés que
  alguien tiene una copia.
- **Desactivar notificaciones:** podés revocar el permiso en cualquier momento
  desde los **Ajustes del sistema operativo** de tu teléfono, y tu teléfono deja
  de mostrarlas. Tené en cuenta que nuestro servidor no se entera de que las
  desactivaste: puede seguir enviando avisos a ese dispositivo hasta que el
  servicio de notificaciones nos informe que el token ya no sirve, por ejemplo
  porque desinstalaste la App.
- **Acceso, rectificación y supresión:** conforme a la **Ley 25.326 de Protección
  de los Datos Personales** (Argentina), podés solicitar información sobre tus
  datos o su eliminación escribiendo a **info@caballoscriollos.com**. El alta y la
  baja de tu cuenta de socio se gestionan en la Asociación, no desde la App.
- La **Agencia de Acceso a la Información Pública** es el organismo de control en
  Argentina.

---

## 10. Menores de edad

La App está destinada al público general interesado en la raza Criolla y no está
dirigida específicamente a menores de 13 años. No recolectamos deliberadamente
datos de menores.

---

## 11. Cambios en esta política

Podemos actualizar esta Política ocasionalmente. Publicaremos la versión vigente
en esta misma URL con su fecha de actualización. El uso continuado de la App
implica la aceptación de los cambios.

---

## 12. Contacto

Ante cualquier consulta sobre privacidad, escribinos a **info@caballoscriollos.com**.

---

## Apéndice (interno — no publicar)

Todo lo que sigue queda fuera de la publicación: el comparador del backend corta
en este título.

### Estado de este archivo

Texto para la versión 2.0.0, que agregó inicio de sesión, inscripciones y carnet
de socio. Reemplaza al publicado en julio de 2026, que decía que la App no tenía
inicio de sesión.

Hay tres copias del texto: ésta, `src/api/docs/politica-privacidad.md` del repo
del backend y el HTML embebido en `src/web/politica-privacidad.php`, que es la
única que se publica. Las dos del backend se generan como copia de este archivo,
así que **los cambios van acá primero** y después se avisa con el `shasum -a 1`.

Reglas de formato del comparador, para el texto publicable de arriba: sólo
títulos, listas con `- `, `**`, `*` y comillas invertidas. **Nada de links,
tablas, listas numeradas ni citas con `>`.** La fecha de "Última actualización"
tiene que ser la del deploy real.

### Revisión C-1 a C-9

Las nueve correcciones del equipo de la API, verificadas contra su código con
archivo:línea, están aplicadas. Las cuatro afirmaciones que había que sacar porque
eran falsas, por si vuelven a aparecer en una futura edición:

- "Tu sesión" no va en la lista de §2.5: esa lista dice que no se envía, y el
  código de sesión viaja en cada pedido. El servidor guarda un registro de cada
  sesión que **no se borra** al cerrarla.
- "No se guarda registro de quién verificó tu carnet, ni cuándo" era falso. Que
  #64 registre sólo los intentos inválidos no alcanza: `GET /v/{token}` cae en el
  log de acceso del servidor como cualquier otra URL, así que el código del carnet
  queda ahí con IP y fecha.
- La clave sí se guarda en el servidor, cifrada. Decir sólo "no se guarda en el
  dispositivo" dejaba entender que no se guarda en ningún lado.
- El token de push no se elimina: es una baja lógica, y el historial de envíos
  conserva el token.

Dos más, de la segunda vuelta de review, del mismo tipo y heredadas del texto de
julio:

- "Al desactivar las notificaciones dejamos de enviarte avisos" era falso, y
  "mientras tengas las notificaciones habilitadas" en §7 también. **No existe
  ningún camino de baja**: la única ruta es `POST /push/register` y la App no
  llama a nada al revocarse el permiso. El token queda `Activo = 1` y el cron le
  sigue mandando avisos —y registrándolos— hasta que Expo contesta
  `DeviceNotRegistered`. Qué contesta exactamente cuando se revoca el permiso, sin
  desinstalar, no está verificado, así que el texto no lo afirma.
- "Se marca como cerrada en el servidor" necesitaba el "si hay conexión": el
  logout sí revoca del lado del servidor, pero `auth.js:33` se traga el error, así
  que sin conexión sólo se borra la sesión local y el registro del servidor queda
  abierto hasta que vence.

Sobre la retención de los logs del cPanel: §7 queda **sin cifra**, a propósito. El
listado de `logs/` muestra archivos del mes en curso y del anterior y ninguno de
septiembre, lo que sugiere uno o dos meses — pero es una configuración de cPanel
que se puede cambiar, y sale de un solo listado. Si alguna vez se quiere nombrar,
la forma honesta es "por un período limitado", sin número. Ese mismo listado
confirmó C-2: existe un log de acceso de la API (`...-ssl_log`), así que los
`GET /v/{token}` quedan ahí.

### Revisión C-10 (estadísticas de uso)

La corrección que trajo `POST /uso` (plan `docs/plan-b-uso.md` del backend, §B.5,
con las decisiones del usuario del 06/11/2026 encima). Toca 2.6 —nuevo—, §3, §4 y
§7. Tres cosas a no perder si alguien vuelve a editar:

- **El texto va adelantado al código.** Se publica antes de que exista la 2.0.1,
  que es la versión que empieza a enviar. Describir algo que todavía no pasa no
  hace daño; publicar la app antes que el texto, sí.
- **"Sin plazo de borrado" es una decisión del usuario**, no un olvido: eligió no
  fijar retención para la tabla de uso, en lugar de los 180 días que recomendaba
  el plan. No poner una cifra inventada.
- **Lo buscado en pedigree no viaja.** El contrato sólo acepta `cual` de 40
  caracteres `[A-Za-z0-9_]`, y para `busqueda_vacia` ese `cual` es la sección
  (`pedigree`), no el término. La regex no alcanza por sí sola —una palabra ASCII
  suelta pasaría—, así que es la app la que tiene que no mandarlo.

Dos más que salieron del review de la C-10, del mismo tipo que las de C-1 a C-9:

- "Tampoco lleva la hora" era falso. La App manda `cuando` con hora, minuto y
  segundo —el contrato lo exige así— y es el **backend** el que la valida y se
  queda sólo con el día. Lo que no se guarda no es lo mismo que lo que no se
  envía, y el texto decía lo segundo.
- "Sin forma de saber qué consultó cada persona" y "los totales de 2.6 son
  anónimos" prometían anonimato absoluto, que el diseño no da: en un día con un
  solo usuario —o con una `Version` que recién arranca— los totales de ese día
  son de quien mandó el POST, y el log técnico tiene su IP. Lo que el diseño sí
  garantiza es que no queda registrado qué consultó cada persona ni qué cosas
  vinieron juntas: no hay lote, ni orden, ni hora.

  Por el mismo motivo cayó la palabra "anónimas" de los tres lugares donde
  resumía 2.6 —su título, §4 y §7—: un rótulo que promete lo que las viñetas se
  cuidan de no prometer. La decisión del usuario sobre la retención fue "sin
  vencimiento"; "totales anónimos por día" era redacción, no decisión.

Dos apartamientos del texto que mandó el equipo de la API, los dos por el mismo
motivo de siempre —no afirmar de más—:

- Su versión decía que del resumen no se guarda "ni la dirección IP". El pedido a
  `/uso` cae en el log de accesos como cualquier otro, con su IP: lo que no se
  guarda es la IP **junto con las estadísticas**. El texto lo dice así y remite a
  2.4.
- Su versión era un párrafo con un paréntesis largo; acá va como lista, que es lo
  único que el comparador acepta además de párrafos y títulos.

### Cómo declarar esto en las tiendas

Las respuestas completas están en `docs/declaraciones-tiendas.md`, en el repo de
la app. El resumen:

**Apple — "App Privacy" (App Store Connect)**

- **Identifiers → User ID:** *Sí se recolecta.* Uso: **App Functionality**.
  **Vinculado** a la identidad. No usado para tracking.
- **Identifiers → Device ID:** *Sí se recolecta.* Uso: **App Functionality**
  (asociar el token de push). Hoy **no** vinculado a la identidad.
- **Contact Info → Name / Email / Phone:** la App no recolecta los datos del socio
  (los recibe), pero **sí envía nombre, apellido y documento de un jinete o
  domador** al buscarlo, que son datos de un tercero. La respuesta conservadora es
  declararlo.
- **Location / Financial / Health / Browsing / Contacts / Photos:** *No se recolectan.*
- **Usage Data:** *No se recolecta* (no hay analítica).
- **Tracking:** **No.** (No se pide `App Tracking Transparency`.)

**Google Play — "Data safety"**

- **¿Recolecta o comparte datos?** Sí.
- **Personal info → User IDs:** *Recolectado.* Finalidad: App functionality /
  Account management.
- **Personal info → Name / Email / Other info:** ver el apartado de Contact Info
  de arriba (el caso del documento del jinete o domador).
- **Device or other IDs → Device ID:** *Recolectado.* Finalidad: **App
  functionality** (notificaciones). *Compartido con* proveedores de push (Expo /
  Apple / Google) para la entrega. No para publicidad.
- **Encriptado en tránsito:** **Sí** (HTTPS/TLS).
- **¿Se puede pedir la eliminación de datos?** Sí, vía `info@caballoscriollos.com`.
- **¿La recolección es opcional?** Las notificaciones sí. El login es necesario
  sólo para las funciones de socio; el resto de la App funciona sin cuenta.
- **No** declarar: ubicación, contactos, fotos, datos financieros, actividad de la
  app para analítica, ni publicidad.
