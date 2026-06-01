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

## Pendientes / próximos pasos

- Login y funciones autenticadas.
- Conectar datos reales (API ACCC) en lugar de `src/data.js`.
- Linkear los PDFs de rankings por categoría.
- Persistir preferencia de tema (AsyncStorage) + toggle en UI.
- Reemplazar las fotos placeholder (URLs remotas) por assets propios.
