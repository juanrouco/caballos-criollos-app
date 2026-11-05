# App Caballos Criollos — React Native (Expo)

Proyecto Expo / React Native con la traducción del prototipo de la app ACCC.
Incluye: Inicio, Eventos, Detalle de evento (catálogo + resultados de morfología
+ video en vivo embebido), Búsqueda de pedigree multi-campo, Detalle de caballo
con árbol de 4 generaciones, y Rankings (Premio Solanet + por disciplina).

## Requisitos

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/) (no hace falta instalar global; se usa `npx`)
- App **Expo Go** en tu teléfono (iOS / Android) para probar al instante, o un
  emulador Android / simulador iOS.

## Cómo correrlo

```bash
cd react-native
npm install
npx expo start
```

Luego:
- Escaneá el QR con **Expo Go** (Android) o la cámara (iOS), **o**
- Apretá `a` para abrir en emulador Android, `i` para simulador iOS, `w` para web.

## Estructura

```
react-native/
├── App.js                  # Navegación (tabs + stack), carga de fuentes, tema
├── app.json                # Config Expo
├── package.json
├── babel.config.js
├── assets/                 # PNGs: cabeza de caballo + íconos de disciplinas
└── src/
    ├── theme.js            # Paletas (tabaco/pampa/cuero × claro/oscuro), tokens
    ├── data.js             # Datos mock (caballos, eventos, resultados, rankings…)
    ├── components.js       # Icon (svg), Crest, Card, Badge, Medal, Divider…
    └── screens/
        ├── HomeScreen.js
        ├── EventsScreen.js
        ├── EventDetailScreen.js
        ├── PedigreeScreen.js
        ├── HorseDetailScreen.js
        ├── RankingsScreen.js
        └── RankingCatScreen.js
```

## Cambiar tema (paleta / modo)

En `App.js`, arriba de todo:

```js
const PALETTE = 'tabaco';  // 'tabaco' | 'pampa' | 'cuero'
const MODE = 'light';      // 'light' | 'dark'
```

(En el prototipo web esto era el panel de "Tweaks". Para una app real conviene
moverlo a un contexto con persistencia / toggle de usuario.)

## Notas de la traducción (web → native)

- **Estilos**: CSS inline → objetos de estilo de React Native. No hay `oklch`,
  así que las paletas están pre-convertidas a hex en `theme.js`.
- **Íconos**: SVG inline → `react-native-svg`.
- **Logo / disciplinas**: las máscaras CSS no existen en RN; se usan los PNG
  blancos tintados con `Image { tintColor }`.
- **Navegación**: el stack hecho a mano → `react-navigation` (tabs + native-stack),
  con back nativo correcto.
- **Video en vivo**: iframe de YouTube → `react-native-webview`.
- **Fuentes**: Inter Tight + Roboto vía `@expo-google-fonts`.

## Build y publicación iOS (EAS + TestFlight)

El build de release no se hace localmente: lo hace **EAS Build** (Expo Application
Services) en la nube, que además **administra los certificados y provisioning
profiles automáticamente** — no hace falta crearlos a mano en el portal de Apple.

### Pre-requisitos (una sola vez, en el portal de Apple)

- Membresía del **Apple Developer Program** ($99/año).
- **App ID** registrado en *Certificates, Identifiers & Profiles* → Identifiers,
  tipo **App IDs → App**, Bundle ID **Explicit** = `com.caballoscriollos.app`
  (debe coincidir carácter por carácter con `app.json`). Capability **Push
  Notifications** sólo si se usan push reales; **Broadcast** queda sin marcar.
- App creada en **App Store Connect** (el **SKU** es un identificador interno y
  privado; se usa `com.caballoscriollos.app` por consistencia).
- En la pregunta *"uses standard/exempt encryption?"* la respuesta es **Yes**: la
  app sólo usa HTTPS/TLS (encriptación estándar exenta). Declarado en `app.json`
  vía `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` para no volver a
  preguntarlo en cada submit.

### Comandos

```bash
# 1. Instalar eas-cli (una vez)
npm install -g eas-cli

# 2. Login con la cuenta de Expo
eas login

# 3. Generar eas.json con los perfiles de build (una vez)
eas build:configure

# 4. Build de iOS en la nube — la primera vez pide login de Apple y
#    crea el Distribution Certificate + Provisioning Profile solo
#    (respondé "Yes" cuando ofrece manejar los credentials)
eas build --platform ios --profile production

# 5. Subir el build a App Store Connect (≠ enviar a revisión de App Store)
eas submit --platform ios
```

### TestFlight

`eas submit` **sube** el build a App Store Connect; **no** lo publica en la App
Store ni requiere la revisión completa. Después del submit:

1. El build queda **Processing** en la pestaña *TestFlight* (~10–30 min).
2. **Internal Testing** (hasta 100 del equipo): disponible **al instante**, sin
   revisión — ideal para probar uno mismo y con la ACCC.
3. **External Testing** (hasta 10.000): requiere un **Beta App Review** de Apple
   (más liviano que el de App Store, ~1 día).
4. Los testers instalan la app **TestFlight** y aceptan la invitación.

Flujo resumido: **`eas build` → `eas submit` → aparece en TestFlight → testers → prueban.**

### Push notifications: Expo vs APNs/FCM directo

El push **solo se puede probar en una build standalone** (TestFlight / dev build)
sobre un **device físico** — Expo Go (SDK 53+) y el simulador iOS no entregan push
remoto. La implementación vive en `src/usePushNotifications.js`.

Hoy la app usa **Expo push tokens** (`getExpoPushTokenAsync` → `ExponentPushToken[...]`),
así que el envío va por el **servicio de push de Expo**. Hay dos caminos posibles:

- **Opción A — Expo Push Service (actual).** El backend POSTea a
  `https://exp.host/--/api/v2/push/send` con el ExpoPushToken y Expo lo reenvía a
  APNs (iOS) y FCM (Android). Gratis, una sola API para ambas plataformas, funciona
  en builds de producción. Contra: Expo queda como intermediario.
- **Opción B — APNs/FCM directo (sin Expo).** Cambiar a `getDevicePushTokenAsync`
  (token nativo) y que el backend hable directo con APNs y FCM. Control total, sin
  terceros. Contra: hay que manejar dos servicios, sus credenciales y formatos de
  token por plataforma; más trabajo de backend.

**Recomendación:** quedarse con la Opción A salvo que haya una razón concreta para
no usar intermediario. Migrar a B es un cambio acotado: tocar
`src/usePushNotifications.js` (token nativo) y el backend (enviar a APNs/FCM en vez
de a Expo).

## Pendientes / próximos pasos

- **El carnet de socio con QR y la verificación** (#63 / #64). Es lo único que
  falta de la etapa 2; la app no tiene nada todavía. El backend ya los
  implementó —`POST /perfil/carnet`, `POST /perfil/carnet/rotar`,
  `GET /perfil/carnet.pdf`, y `GET /socios/verificacion/{token}` para la app—,
  pero **el contrato no está en `docs/README.md`**, así que no se arranca hasta
  que esté: el carnet maneja un token que valida la identidad de una persona y
  tiene una rotación que mata el QR anterior, y eso no se deduce de la firma de
  una ruta. Pedido al equipo de la API.
- Reemplazar las fotos placeholder (URLs remotas a `caballoscriollos.com`) por
  assets propios. Son el fallback de las noticias y los eventos sin imagen.

Los adjuntos de inscripción quedaron fuera de alcance; la API tampoco tiene
ningún endpoint de subida.

La paleta y el modo (`PALETTE` / `MODE` en `App.js`) quedan fijos a propósito:
son constantes, no una preferencia del usuario.

Sin probar todavía, y por qué: login desde cero, logout y cambio de clave
(hace falta la clave de un socio de prueba); push notifications y el deeplink
de arranque en frío (sólo llegan en build standalone sobre device físico);
Android.

### Qué no se puede ver funcionando en cdev

El ambiente local sirve para el alta, las inscripciones, el perfil y el stud
book, pero no para todo. Antes de salir a buscar un bug en la app, chequear si
no es esto:

- **Eventos, Noticias, Reglamentos y vivos están vacíos**: `/eventos`,
  `/noticias`, `/reglamentos` y `/vivos` devuelven `count: 0`. Esas pantallas
  sólo pueden mostrar su estado vacío, y sin vivos el botón EN VIVO del footer
  no aparece (es correcto: sólo existe con una transmisión activa).
- **Los rankings dan 500 siempre**: el handler sale a `caballoscriollos.com` y
  el contenedor no tiene salida a internet
  (`Could not resolve host`). Es cómodo para probar el estado de error, inútil
  para el camino feliz.
- **No se puede escribir en los inputs** desde las tools del simulador: ni
  tipeando, ni por portapapeles, ni con el menú de pegar. Lo que necesita
  teclado (Pedigree, la búsqueda de animal del alta, el cambio de clave) hay
  que tipearlo a mano.
