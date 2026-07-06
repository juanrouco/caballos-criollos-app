# Política de Privacidad — App Caballos Criollos

> **Borrador / plantilla.** Reemplazá los campos entre `[corchetes]` con los
> datos reales antes de publicarla. Debe quedar accesible en una **URL pública**
> (ej. `https://caballoscriollos.com/privacidad`) — Apple App Store y Google Play
> exigen ese link para aprobar la app.

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

La App **no requiere registro ni inicio de sesión** y **no te pide datos
personales** (nombre, email, teléfono, etc.). La información que se procesa es:

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

### 2.2. Información técnica

- Al pedir contenido a nuestra API (`caballoscriollos.com`), el servidor puede
  registrar datos técnicos estándar de la conexión (por ejemplo, dirección IP y
  fecha/hora) en sus logs, con fines de operación y seguridad.

### 2.3. Datos almacenados sólo en tu dispositivo

- La App guarda localmente la **fecha de la última vez que abriste las
  notificaciones** (para el contador de la campanita). Esta información **no se
  envía** a ningún servidor y se borra al desinstalar la App.

---

## 3. Qué NO recolectamos

Para mayor claridad, la App **no** recolecta ni accede a:

- Cuentas, contraseñas ni datos de perfil (no hay login).
- Ubicación / GPS.
- Cámara, micrófono, fotos ni contactos.
- Datos de pago.
- Herramientas de analítica de terceros ni publicidad ni rastreo entre apps.

---

## 4. Para qué usamos la información

- **Enviar notificaciones push** sobre eventos, transmisiones en vivo y novedades.
- **Mostrar el contenido** de la App (eventos, noticias, catálogos, resultados,
  rankings, pedigrees) que se obtiene de nuestra API.
- **Operar y proteger** el servicio (seguridad, prevención de abuso).

No usamos la información para publicidad ni la vendemos a terceros.

---

## 5. Con quién se comparte

Para que las notificaciones funcionen, el token puede procesarse a través de los
siguientes proveedores, exclusivamente para entregar los avisos:

- **Expo (Expo Application Services):** servicio de envío de notificaciones push.
- **Apple Push Notification service (APNs):** entrega en dispositivos iOS.
- **Firebase Cloud Messaging (FCM), de Google:** entrega en dispositivos Android.

No compartimos información con anunciantes ni con terceros para fines comerciales.

---

## 6. Conservación de los datos

- El **token de notificaciones** y el `device_id` se conservan mientras la App
  esté instalada y las notificaciones habilitadas. Se eliminan/invalidan cuando el
  token deja de ser válido (por ejemplo, al desinstalar la App).
- Los **logs técnicos** del servidor se conservan por el plazo necesario para la
  operación y seguridad del servicio.

---

## 7. Seguridad

Toda la comunicación entre la App y nuestros servidores se realiza sobre
**HTTPS/TLS**. Aplicamos medidas razonables para proteger la información, aunque
ningún sistema es 100 % infalible.

---

## 8. Tus derechos y cómo ejercerlos

- **Desactivar notificaciones:** podés revocar el permiso en cualquier momento
  desde los **Ajustes del sistema operativo** de tu teléfono. Al hacerlo, dejamos
  de enviarte avisos.
- **Acceso, rectificación y supresión:** conforme a la **Ley 25.326 de Protección
  de los Datos Personales** (Argentina), podés solicitar información sobre tus
  datos o su eliminación escribiendo a **[email de contacto]**.
- La **Agencia de Acceso a la Información Pública** es el organismo de control en
  Argentina.

---

## 9. Menores de edad

La App está destinada al público general interesado en la raza Criolla y no está
dirigida específicamente a menores de 13 años. No recolectamos deliberadamente
datos de menores.

---

## 10. Cambios en esta política

Podemos actualizar esta Política ocasionalmente. Publicaremos la versión vigente
en esta misma URL con su fecha de actualización. El uso continuado de la App
implica la aceptación de los cambios.

---

## 11. Contacto

Ante cualquier consulta sobre privacidad, escribinos a **[email de contacto]**.

---
---

## Apéndice (interno — no publicar): cómo declarar esto en las tiendas

Guía rápida para completar los formularios de datos de cada tienda, en base a lo
que realmente hace la App.

### Apple — "App Privacy" (App Store Connect)

- **Identifiers → Device ID:** *Sí se recolecta.* Uso: **App Functionality**
  (asociar el token de push). **No** vinculado a la identidad del usuario. **No**
  usado para tracking.
- **Contact Info / Location / Financial / Health / Browsing / Contacts / Photos:**
  *No se recolectan.*
- **Tracking:** **No.** (No se pide `App Tracking Transparency`.)
- El token de push de Expo suele encuadrar como *Device ID* / *App Functionality*.

### Google Play — "Data safety"

- **¿Recolecta o comparte datos?** Sí (mínimo).
- **Device or other IDs → Device ID:** *Recolectado.* Finalidad: **App
  functionality** (notificaciones). *Compartido con* proveedores de push (Expo /
  Apple / Google) para la entrega. No para publicidad.
- **Encriptado en tránsito:** **Sí** (HTTPS/TLS).
- **¿Se puede pedir la eliminación de datos?** Sí, vía el email de contacto /
  desinstalando la App.
- **No** declarar: ubicación, contactos, fotos, datos financieros, actividad de la
  app para analítica, ni publicidad.
