# Especificación de API — Notificaciones Push

Spec para el equipo de backend (`caballoscriollos.com/api`) sobre qué tiene que
implementar para soportar las notificaciones push de la app móvil (Expo / React
Native).

La app **ya tiene el cliente implementado**; este documento describe el contrato
que el backend debe cumplir. Referencias en el código del cliente:

- `src/usePushNotifications.js` — registro de token, permisos, tap handler.
- `src/api/push.js` — `POST /push/register`.
- `src/api/notificaciones.js` — `GET /notificaciones`, shape de la notif.
- `src/NotificationsContext.js` — badge de la campanita (poll + `since`).
- `src/navigation.js` — `navigateOnNotificationTap`, define los `kind` del deep-link.

---

## 1. Arquitectura

La app usa **Expo Push Tokens** (`ExponentPushToken[...]`). El envío va por el
**servicio de push de Expo**, que reenvía a APNs (iOS) y FCM (Android). El backend
**no** habla con Apple/Google directamente.

```
┌─────────┐   POST /push/register    ┌──────────────┐   POST exp.host/.../push/send   ┌──────────┐   ┌────────┐
│   App   │ ───────────────────────► │   Backend    │ ─────────────────────────────► │ Expo Push│ ─►│ APNs / │ ─► device
│ (móvil) │   {token, plataforma,    │ (este API)   │   {to, title, body, data}      │ Service  │   │  FCM   │
└─────────┘    device_id}            └──────────────┘                                 └──────────┘   └────────┘
```

> Alternativa (APNs/FCM directo, sin Expo): documentada en el README, sección
> "Push notifications: Expo vs APNs/FCM directo". **No** es lo que la app espera hoy.

### Responsabilidades

La **generación y el envío de las notificaciones push son 100% del backend**. La
app **nunca** genera ni envía push: solo registra su token y, al recibir/tocar una
notificación, la muestra y rutea (deep-link). La lógica de "cuándo se dispara una
notif" (ej. un evento pasa a `en_vivo`, se publica una noticia, sale un ranking)
vive enteramente en el backend.

| Lado        | Responsabilidad                                                        |
|-------------|------------------------------------------------------------------------|
| **App**     | Registrar el push token · pedir permiso · mostrar y rutear al tocar.   |
| **Backend** | Decidir cuándo enviar · armar el payload (`title`/`body`/`data`) · enviar a Expo · persistir la notif para la campanita. |

Concretamente, el backend tiene **dos responsabilidades técnicas**:

1. **Guardar los push tokens** que registra la app (`POST /push/register`).
2. **Generar y enviar los push** vía el API de Expo, y **persistir cada
   notificación** para que también aparezca en la campanita (`GET /notificaciones`).

---

## 2. Endpoints que consume la app

### 2.1 `POST /push/register`

Registra/actualiza el Expo Push Token de una instalación. La app lo llama en cada
arranque (es idempotente).

**Request body** (JSON):

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "plataforma": "ios",          // "ios" | "android"
  "device_id": "uuid-o-null"    // iOS: identifierForVendor · Android: ANDROID_ID · puede venir null
}
```

**Comportamiento esperado:**

- **Deduplicar por `token`** (es globalmente único por instalación). Si ya existe,
  actualizar `plataforma`, `device_id` y `updated_at`; no crear duplicados.
- Guardar `device_id` para poder **invalidar tokens viejos del mismo aparato** en el
  futuro (ej. el usuario reinstala → nuevo token, mismo `device_id`).
- `device_id` puede ser `null`; no debe romper el registro.
- Respuesta: `200 OK`. El body es indistinto (la app ignora el contenido).

**Tabla sugerida** `push_tokens`:

| columna      | tipo        | notas                                    |
|--------------|-------------|------------------------------------------|
| `id`         | PK          |                                          |
| `token`      | varchar UQ  | único; índice                            |
| `plataforma` | varchar     | `ios` / `android`                        |
| `device_id`  | varchar NULL| nullable                                 |
| `activo`     | bool        | se apaga al recibir `DeviceNotRegistered`|
| `created_at` | datetime    |                                          |
| `updated_at` | datetime    |                                          |

### 2.2 `GET /notificaciones`

Listado paginado del historial de notificaciones (alimenta la campanita y la
pantalla de notificaciones). Ordenado por el **instante de envío real**
(`FechaEnvio DESC, IdNotificacion DESC`).

> **Solo se devuelven notificaciones efectivamente enviadas** (`EstadoEnvio =
> enviado`). Las programadas a futuro o pendientes de envío **no aparecen** hasta
> que el push sale; las anuladas y las fallidas tampoco. En consecuencia, el campo
> `fecha` de cada notif es el **instante del envío real** (no el de creación ni el
> de programación), y tanto el orden como el filtro `since` se basan en ese instante.
> Para el cliente esto es transparente: una notif programada simplemente aparece en
> la campanita en el momento en que efectivamente se envía.

**Query params:**

| param   | tipo   | descripción                                                             |
|---------|--------|-------------------------------------------------------------------------|
| `since` | string | opcional. `"YYYY-MM-DD HH:MM:SS"` en **hora Argentina (UTC-3) sin TZ**. Devuelve solo las notifs **enviadas después** de ese instante (compara contra el momento de envío). |
| `limit` | int    | opcional. Cantidad máxima. La app usa `limit=1` solo para leer `meta.total`. |

**Response:**

```json
{
  "data": [
    {
      "id": 123,
      "titulo": "Comienza la transmisión",
      "cuerpo": "Feriagro Luján de Cuyo ya está EN VIVO",
      "tipo": "vivo",
      "target": { "tipo": "vivo", "id": 2276, "url": null },
      "imagen_url": "https://caballoscriollos.com/...jpg",
      "fecha": "2026-06-26 13:11:58"
    }
  ],
  "meta": { "total": 1 }
}
```

**Reglas clave:**

- **`target`** describe el deeplink del ítem. Puede ser `null` (notif sin acción) o
  un objeto con uno de dos modos:
  - `{ "tipo", "id", "url": null }` — deeplink **interno** a un recurso de la app.
    `tipo` ∈ `vivo` | `evento` | `noticia`. Para `tipo: "vivo"`, `id` se devuelve
    **resuelto al `IdEvento` del evento padre** (no al IdEventoVivo).
  - `{ "tipo": null, "id": null, "url" }` — link **externo** (se abre en el browser).

- `meta.total` = **cantidad total** de notifs **enviadas** que matchean el filtro
  `since` (NO la cantidad devuelta en `data`). El badge de la campanita usa
  exactamente `GET /notificaciones?since=<lastSeen>&limit=1` y lee `meta.total`.
  Como solo cuentan las enviadas, el badge refleja avisos reales: una notif
  programada recién suma al badge cuando el push sale.
- `fecha`: formato `"YYYY-MM-DD HH:MM:SS"`, **hora Argentina sin timezone**, igual
  al **instante de envío real**. La app parsea el string a mano (no usa
  `Date.parse`), así que el formato debe ser exacto.
- Campos del registro (mapeados en `mapNotificacion`): `id`, `titulo`, `cuerpo`,
  `tipo`, `target`, `imagen_url`, `fecha`. Los ausentes se toleran (`titulo`/`cuerpo`
  caen a `""`, `tipo` a `"generico"`, `target`/`imagen_url` a `null`).
- **`Cache-Control`** del endpoint alineado a **30s** (la app pollea cada 30s).

### 2.3 ⚠️ Dos shapes distintos: `target` (lista) vs `data` (push)

Hay **dos canales** con **shapes deliberadamente distintos**, y el backend tiene que
producir los dos. No son intercambiables:

| | Dónde | Shape | Quién lo consume en la app |
|---|---|---|---|
| **`target`** | Campo de cada notif en `GET /notificaciones` | `{ tipo, id, url }` | `NotificationsScreen` (tap en la campanita) |
| **`data`** | Payload del push (mensaje a Expo, ver §3/§4) | `{ kind, evento_id \| id, tag? }` | `navigateOnNotificationTap` (tap en el push) |

La app **ya hace el puente** entre ambos: al tocar un ítem de la lista,
`NotificationsScreen.onItemPress` mapea `target.tipo → kind` y `target.id → id`
(duplicándolo en `evento_id` para vivo/evento) antes de llamar al mismo router que
usa el push. Por eso el router interno (`navigateOnNotificationTap`) habla `kind`,
pero el `target` persistido habla `tipo`.

**Mapeo `target` → `data` que debe hacer el backend al enviar el push:**

| `target` (lista) | `data` (push) |
|---|---|
| `{ tipo: "vivo",    id: N }` | `{ kind: "vivo",    evento_id: N }` |
| `{ tipo: "evento",  id: N }` | `{ kind: "evento",  evento_id: N }` |
| `{ tipo: "noticia", id: N }` | `{ kind: "noticia", id: N, tag? }` |
| `{ url: "https://…" }`       | (el tap del push no abre links externos; sólo la lista. Mandar el push sin deeplink o con un `kind` interno) |

> Regla práctica: para cada notif, el backend **persiste `target` con `{tipo,id,url}`**
> (lo consume la lista) y, si además manda push, **deriva `data` con `{kind,…}`**
> según la tabla de arriba. Misma fuente lógica, dos serializaciones.

---

## 3. Envío de push vía Expo Push Service

### 3.1 Endpoint

```
POST https://exp.host/--/api/v2/push/send
Content-Type: application/json
Accept: application/json
Accept-Encoding: gzip, deflate
```

### 3.2 Shape del mensaje

```json
{
  "to": "ExponentPushToken[xxxx]",   // o array de hasta 100 tokens
  "title": "Comienza la transmisión",
  "body": "Feriagro Luján de Cuyo ya está EN VIVO",
  "sound": "default",
  "badge": 1,
  "data": { "kind": "vivo", "evento_id": 2276 }
}
```

> El `data` es lo que determina **a dónde navega la app al tocar la notificación**.
> Ver sección 4 — es la parte más importante de este contrato.

### 3.3 Reglas de envío

- **Batching:** hasta **100 tokens por request** (campo `to` como array). Para más,
  paginar en lotes de 100.
- **Tickets y receipts:** la respuesta trae un *ticket* por mensaje. Para tokens
  inválidos Expo devuelve `status: "error"` con `details.error`:
  - **`DeviceNotRegistered`** → marcar ese token como `activo = false` (o borrarlo).
    No volver a enviarle.
  - `MessageTooBig`, `MessageRateExceeded`, `InvalidCredentials` → loguear y
    reintentar/ajustar según corresponda.
- **Receipts diferidos:** además del ticket inmediato, conviene consultar los
  *push receipts* (`POST .../push/getReceipts`) ~15 min después para detectar
  `DeviceNotRegistered` que aparecen post-entrega, y limpiar tokens muertos.
- **Persistir SIEMPRE la notificación** en la tabla que alimenta
  `GET /notificaciones`, y al despachar el push marcarla como enviada
  (`EstadoEnvio = enviado`, `FechaEnvio = now`). Ese estado + instante son lo que
  la hace **visible y ordenable** en el endpoint (§2.2): una notif creada/programada
  existe en la tabla pero recién aparece en la campanita cuando se envía. Así el ítem
  figura aunque el usuario no haya tocado (o no haya recibido) el push.

### 3.4 Credenciales

El servicio de push de Expo entrega a APNs/FCM usando las credenciales del proyecto
Expo (la **APNs Key .p8** la administra EAS automáticamente; ver README). El backend
**no** maneja certificados de Apple/Google. No requiere auth para postear a
`exp.host` salvo que se configure un *Access Token* de Expo (recomendado en prod:
header `Authorization: Bearer <EXPO_ACCESS_TOKEN>`).

---

## 4. Payload `data` — deep-link al tocar la notificación

Esto es **contrato estricto**: la app rutea según `data.kind`. Definido en
`src/navigation.js → navigateOnNotificationTap`. Ojo: este `data` (del push) usa
`kind`, distinto del `target` (`{tipo,id,url}`) que devuelve `GET /notificaciones`
para la lista — ver [§2.3](#23--dos-shapes-distintos-target-lista-vs-data-push)
para el mapeo `target → data`.

| `kind`      | campos adicionales en `data`      | a dónde navega la app                          |
|-------------|-----------------------------------|------------------------------------------------|
| `"vivo"`    | `evento_id` (o `id`)              | Detalle del evento (`EventDetail`) en tab Eventos |
| `"evento"`  | `evento_id` (o `id`)              | Detalle del evento (`EventDetail`) en tab Eventos |
| `"noticia"` | `id`, `tag` (opcional)            | Detalle de noticia (`NewsDetail`) en tab Inicio |
| `"ranking"` | —                                 | Tab Rankings                                   |
| otro/ausente| —                                 | Fallback: tab Inicio (Home)                    |

**Ejemplos de `data` por tipo:**

```jsonc
// Evento en vivo o recordatorio de evento
{ "kind": "vivo",    "evento_id": 2276 }
{ "kind": "evento",  "evento_id": 2276 }

// Noticia
{ "kind": "noticia", "id": 88, "tag": "Institucional" }

// Ranking (sin campos extra)
{ "kind": "ranking" }
```

**Notas:**

- Para `vivo`/`evento` la app acepta `evento_id` **o** `id`. Preferir **`evento_id`**
  por claridad.
- `kind` desconocido NO rompe la app: cae al Home. Esto permite que el backend
  agregue tipos nuevos sin romper versiones viejas de la app.
- El `data` viaja como objeto JSON en el mensaje de Expo; la app ya maneja tanto el
  caso "objeto parseado" (push real de Expo) como "string JSON" (payload crudo APNS
  de `xcrun simctl push`).

---

## 5. Convenciones de fecha / timezone

- Todas las fechas que devuelve el backend van en **hora Argentina (UTC-3), sin
  sufijo de timezone**, formato `"YYYY-MM-DD HH:MM:SS"`.
- La app parsea estos strings **manualmente** (no con `Date.parse`) para evitar que
  el timezone del dispositivo desplace el resultado. Respetar el formato al carácter.
- El `since` que manda la app viene en ese mismo formato (hora Argentina sin TZ).

---

## 6. Checklist de implementación backend

- [ ] `POST /push/register` con dedup por `token` y guardado de `plataforma`/`device_id`.
- [ ] `GET /notificaciones` con `since`, `limit`, orden fecha DESC, y `meta.total` correcto.
- [ ] `Cache-Control` de `/notificaciones` ~30s.
- [ ] Tabla `push_tokens` con flag `activo`.
- [ ] Tabla de notificaciones persistidas (la que sirve `GET /notificaciones`).
- [ ] Envío a `exp.host/--/api/v2/push/send` en lotes de ≤100.
- [ ] Manejo de tickets + receipts → desactivar tokens con `DeviceNotRegistered`.
- [ ] Persistir cada notif con `target` = `{tipo, id, url}` (lo consume la lista).
- [ ] Al enviar el push, derivar `data` = `{kind, evento_id|id, tag?}` desde `target` (ver §2.3).
- [ ] (Opcional, recomendado) `EXPO_ACCESS_TOKEN` para autenticar el envío.

---

## 7. Referencias

- Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/
- Receipts: https://docs.expo.dev/push-notifications/sending-notifications/#push-receipt-response-format
- Herramienta para probar manualmente (pegar token + payload): https://expo.dev/notifications
