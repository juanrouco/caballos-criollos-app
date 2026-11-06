# Política de Privacidad — App Caballos Criollos

> **Borrador / plantilla.** Reemplazá los campos entre `[corchetes]` con los
> datos reales antes de publicarla. Debe quedar accesible en una **URL pública**
> (ej. `https://caballoscriollos.com/privacidad`) — Apple App Store y Google Play
> exigen ese link para aprobar la app.
>
> **Revisada para la versión 2.0.0**, que agregó inicio de sesión, inscripciones
> y carnet de socio. Las respuestas de App Privacy y Data safety que corresponden
> a esta versión están en `docs/declaraciones-tiendas.md`.

**Última actualización:** [DD/MM/AAAA]

Esta Política de Privacidad describe cómo la aplicación móvil **Caballos Criollos**
(en adelante, "la App"), de la **Asociación Argentina de Criadores de Caballos
Criollos** (en adelante, "ACCC", "nosotros"), trata la información de sus usuarios.

Al usar la App aceptás las prácticas descriptas en este documento.

---

## 1. Responsable del tratamiento

- **Responsable:** [Razón social completa de la ACCC]
- **Domicilio:** [Domicilio legal]
- **Contacto:** [email de contacto, ej. privacidad@caballoscriollos.com]
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

Con la sesión abierta, la App **lee y te muestra** datos que la ACCC ya tiene
registrados sobre vos: nombre y apellido, email, teléfono y celular, y tu número
y categoría de socio. Esos datos no se recolectan a través de la App — ya existen
en los registros de la Asociación y la App sólo te los muestra.

### 2.3. Para inscribir un animal (opcional)

Al usar el alta de inscripciones, la App envía las referencias de lo que elegís:
el animal, el evento, la prueba, la categoría, el equipo y el jinete. Van como
identificadores de nuestros propios registros, no como datos personales.

La excepción: para **buscar un jinete** la App envía el **nombre, el apellido y/o
el número de documento** que tipeás, porque es la forma de encontrarlo en el
padrón. Ese dato es de la persona que buscás, y se usa sólo para esa búsqueda y
para dejar asentada la inscripción.

### 2.4. Información técnica

- Al pedir contenido a nuestra API (`api.caballoscriollos.com`), el servidor puede
  registrar datos técnicos estándar de la conexión (por ejemplo, dirección IP y
  fecha/hora) en sus logs, con fines de operación y seguridad.

### 2.5. Datos almacenados sólo en tu dispositivo

Esta información **no se envía** a ningún servidor y se borra al desinstalar la App:

- **Tu sesión**, mientras esté abierta. Se guarda en el almacenamiento seguro del
  sistema operativo (Keychain en iOS, Keystore en Android), no en un archivo
  común. **Al cerrar sesión se borra de inmediato.**
- La **fecha de la última vez que abriste las notificaciones**, para el contador
  de la campanita.

---

## 3. Qué NO recolectamos

Para mayor claridad, la App **no** recolecta ni accede a:

- Ubicación / GPS.
- Cámara, micrófono, fotos ni contactos.
- Datos de pago.
- Herramientas de analítica de terceros, publicidad ni rastreo entre apps.
- Estadísticas de uso: la App **no registra** qué pantallas visitás ni qué
  contenidos consultás.

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
- Cada verificación inválida se registra sólo para prevenir abuso. **No se guarda
  registro de quién verificó tu carnet, ni cuándo.**

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

- Tu **clave** no se guarda en el dispositivo: se envía para autenticarte y se
  descarta.
- Tu **sesión** vive en el dispositivo mientras no cierres sesión. Se renueva sola
  mientras usás la App y **caduca a los 90 días** sin usarla, con lo que tenés que
  volver a iniciar sesión.
- El **código de tu carnet** se conserva mientras no lo renueves. Al renovarlo, el
  anterior se descarta.
- El **token de notificaciones** y el `device_id` se conservan mientras la App
  esté instalada y las notificaciones habilitadas. Se eliminan/invalidan cuando el
  token deja de ser válido (por ejemplo, al desinstalar la App).
- Tus **datos de socio y tus inscripciones** son registros de la Asociación y se
  conservan según sus plazos institucionales, con independencia de la App.
- Los **logs técnicos** del servidor se conservan por el plazo necesario para la
  operación y seguridad del servicio.

---

## 8. Seguridad

Toda la comunicación entre la App y nuestros servidores se realiza sobre
**HTTPS/TLS**. Tu sesión se guarda en el almacenamiento seguro que provee el
sistema operativo. Aplicamos medidas razonables para proteger la información,
aunque ningún sistema es 100 % infalible.

---

## 9. Tus derechos y cómo ejercerlos

- **Cerrar sesión:** desde el menú de la App. Borra tu sesión del dispositivo en
  el momento.
- **Renovar el código de tu carnet:** desde la pantalla "Mi carnet", si creés que
  alguien tiene una copia.
- **Desactivar notificaciones:** podés revocar el permiso en cualquier momento
  desde los **Ajustes del sistema operativo** de tu teléfono. Al hacerlo, dejamos
  de enviarte avisos.
- **Acceso, rectificación y supresión:** conforme a la **Ley 25.326 de Protección
  de los Datos Personales** (Argentina), podés solicitar información sobre tus
  datos o su eliminación escribiendo a **[email de contacto]**. El alta y la baja
  de tu cuenta de socio se gestionan en la Asociación, no desde la App.
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

Ante cualquier consulta sobre privacidad, escribinos a **[email de contacto]**.

---
---

## Apéndice (interno — no publicar): cómo declarar esto en las tiendas

Las respuestas completas, con el detalle de qué sale del dispositivo y qué no,
están en **`docs/declaraciones-tiendas.md`**. El resumen:

### Apple — "App Privacy" (App Store Connect)

- **Identifiers → User ID:** *Sí se recolecta.* Uso: **App Functionality**.
  **Vinculado** a la identidad. No usado para tracking.
- **Identifiers → Device ID:** *Sí se recolecta.* Uso: **App Functionality**
  (asociar el token de push). Hoy **no** vinculado a la identidad.
- **Contact Info → Name / Email / Phone:** ver la discusión en
  `declaraciones-tiendas.md` §2. La App no recolecta los datos del socio (los
  recibe), pero **sí envía nombre, apellido y documento de un jinete** al buscarlo,
  que son datos de un tercero. La respuesta conservadora es declararlo.
- **Location / Financial / Health / Browsing / Contacts / Photos:** *No se recolectan.*
- **Usage Data:** *No se recolecta* (no hay analítica).
- **Tracking:** **No.** (No se pide `App Tracking Transparency`.)

### Google Play — "Data safety"

- **¿Recolecta o comparte datos?** Sí.
- **Personal info → User IDs:** *Recolectado.* Finalidad: App functionality /
  Account management.
- **Personal info → Name / Email / Other info:** ver el apartado de Contact Info
  de arriba (el caso del documento del jinete).
- **Device or other IDs → Device ID:** *Recolectado.* Finalidad: **App
  functionality** (notificaciones). *Compartido con* proveedores de push (Expo /
  Apple / Google) para la entrega. No para publicidad.
- **Encriptado en tránsito:** **Sí** (HTTPS/TLS).
- **¿Se puede pedir la eliminación de datos?** Sí, vía el email de contacto.
  Requiere que el `[email de contacto]` esté definido.
- **¿La recolección es opcional?** Las notificaciones sí. El login es necesario
  sólo para las funciones de socio; el resto de la App funciona sin cuenta.
- **No** declarar: ubicación, contactos, fotos, datos financieros, actividad de la
  app para analítica, ni publicidad.
