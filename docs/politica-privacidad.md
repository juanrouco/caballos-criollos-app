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

---

## 3. Qué NO recolectamos

Para mayor claridad, la App **no** recolecta ni accede a:

- Ubicación / GPS.
- Cámara, micrófono, fotos ni contactos.
- Datos de pago.
- Herramientas de analítica de terceros, publicidad ni rastreo entre apps.
- Estadísticas de uso: la App **no registra** qué pantallas visitás. Fuera de los
  logs técnicos del servidor (2.4), no se registra qué contenidos consultás.

---

## 4. Para qué usamos la información

- **Autenticarte** y mantener tu sesión abierta.
- **Gestionar tus inscripciones** a eventos y mostrarte las que ya tenés.
- **Emitir tu carnet de socio** y permitir que se verifique (ver punto 5).
- **Enviar notificaciones push** sobre eventos, transmisiones en vivo y novedades.
- **Mostrar el contenido** de la App (eventos, noticias, catálogos, resultados,
  rankings, pedigrees) que se obtiene de nuestra API.
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
  dispositivo y se marca como cerrada en el servidor, donde el registro se
  conserva. Se renueva sola mientras usás la App y **caduca a los 90 días** sin
  usarla, con lo que tenés que volver a iniciar sesión.
- Los **registros de intentos** de inicio de sesión y cambio de clave de más de 90
  días se van borrando automáticamente.
- El **código de tu carnet** se conserva mientras no lo renueves. Al renovarlo, el
  anterior se descarta.
- El **token de notificaciones** y el `device_id` se conservan mientras la App
  esté instalada y las notificaciones habilitadas. Cuando el token deja de ser
  válido (por ejemplo, al desinstalar la App), dejamos de usarlo. El registro del
  token y de los avisos enviados queda guardado en el servidor.
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
  el momento y la marca como cerrada en el servidor.
- **Renovar el código de tu carnet:** desde la pantalla "Mi carnet", si creés que
  alguien tiene una copia.
- **Desactivar notificaciones:** podés revocar el permiso en cualquier momento
  desde los **Ajustes del sistema operativo** de tu teléfono. Al hacerlo, dejamos
  de enviarte avisos.
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

Sobre la retención de los logs del cPanel: §7 queda **sin cifra**, a propósito. El
listado de `logs/` muestra archivos del mes en curso y del anterior y ninguno de
septiembre, lo que sugiere uno o dos meses — pero es una configuración de cPanel
que se puede cambiar, y sale de un solo listado. Si alguna vez se quiere nombrar,
la forma honesta es "por un período limitado", sin número. Ese mismo listado
confirmó C-2: existe un log de acceso de la API (`...-ssl_log`), así que los
`GET /v/{token}` quedan ahí.

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
