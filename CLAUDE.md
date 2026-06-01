# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Expo / React Native prototype for the **Asociación de Criadores de Caballos Criollos (ACCC)**. Spanish-language UI. All data is mocked in `src/data.js` — there is no backend. The app is a faithful translation of an earlier web prototype, so several patterns (theme tokens, "Tweaks" toggle, tinted PNG icons) make more sense in that context.

## Commands

```bash
npm install
npx expo start         # then press a (Android), i (iOS sim), w (web), or scan QR with Expo Go
npm run android        # expo start --android
npm run ios            # expo start --ios
npm run web            # expo start --web
```

No test runner, linter, formatter, or typecheck is configured. The project is plain JavaScript (no TypeScript).

## Architecture

### Navigation
`App.js` wires a single `NavigationContainer` with a `Stack.Navigator` whose root screen is `Tabs` (a `BottomTabNavigator`). Stack screens (`EventDetail`, `HorseDetail`, `RankingCat`) push on top of the tabs.

The tab bar is fully custom (`CustomTabBar` in `App.js`) — a floating pill with a raised circular "EN VIVO" button in the middle slot that navigates to `EventosTab`. The center button is *not* a real route; the tab array has a `{ center: true }` sentinel that's rendered specially.

### Theme propagation
There is a single source of truth at the top of `App.js`:

```js
const PALETTE = 'tabaco';  // 'tabaco' | 'pampa' | 'cuero'
const MODE = 'light';      // 'light' | 'dark'
```

These feed `getTheme()` from `src/theme.js` which returns a flat object of color tokens (`bg`, `surface`, `accent`, `text`, `textMute`, `live`, etc.). The theme object is exposed via `ThemeCtx` *and* injected as a `t` prop into every screen by the `withT()` HOC in `App.js`. Screens always read colors from `props.t`, never from `theme.js` directly.

When adding a new screen, register it in `App.js` wrapped in `withT(...)` so it receives the `t` prop.

### Tokens & fonts
- `src/theme.js` — palettes are pre-converted hex (no `oklch` — RN can't parse it). Also exports `DISCIPLINE_COLORS`, `DISCIPLINE_ICONS` (PNG `require()`s), `HORSE_HEAD`, and a `fonts` map.
- Fonts are loaded in `App.js` via `@expo-google-fonts/{roboto,inter-tight}`. Use `F.display`, `F.body`, `F.bodyBold`, `F.mono` from `src/components.js` rather than hardcoded family names. `App.js` renders an empty bg-colored `View` until fonts load.

### Components & icons
`src/components.js` exports the shared primitives: `Icon`, `Crest`, `Card`, `Medal`, `Divider`, `SectionLabel`, plus the `F` alias for `fonts`. Icons are inline `react-native-svg` paths in a single `switch` in `Icon` — to add an icon, add a new `case` there. Discipline icons are different: white-on-transparent PNGs in `assets/disc-*.png`, tinted via `<Image tintColor={...} />` (CSS masks don't exist in RN).

### Data
`src/data.js` contains all mock data: `HORSES` (with nested `sire`/`dam` trees up to 3–4 generations), `EVENTS`, `DISCIPLINES`, `NEWS`, `RESULTS`, `LOTES`, `CATALOG_CATEGORIES`, `MORFOLOGIA_RESULTS`, `PREMIO_SOLANET`, `DISCIPLINE_RANKINGS`. The `P(...)` helper near `MORFOLOGIA_RESULTS` builds placement records concisely. Lote numbers are assigned sequentially across categories at module load via a side-effecting `forEach`.

Ranking categories have `kind: 'view'` (rendered as an in-app table from `top: [...]`) or `kind: 'pdf'` (intended to link to an external document — not yet implemented).

### Live video
`EventDetailScreen.js` embeds a YouTube live stream via `react-native-webview` when the event's `status === 'live'`. The embed URL is hardcoded.

### Remote images
Several screens use remote `https://caballoscriollos.com/...` image URLs as placeholders (see `EVENT_PHOTO`, `NEWS_PHOTO`). These are intentionally remote per the original prototype and are flagged for replacement with bundled assets.

## Conventions to preserve

- **Spanish UI strings** — keep all user-facing text in Spanish (Argentine usage: "Eventos", "Pedigree", "Próximos eventos").
- **Theme prop, not context** — read colors from the `t` prop passed to screens, not from `useContext(ThemeCtx)` directly. New screens must be wrapped in `withT(...)` when registered in `App.js`.
- **Inline styles** — the codebase uses inline style objects, not `StyleSheet.create`. Match the existing style.

## Known TODOs (from README)

Auth, real ACCC API integration, PDF links for ranking categories, persisted theme preference (AsyncStorage) + UI toggle, replacing remote placeholder photos with bundled assets.
