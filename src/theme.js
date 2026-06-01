// Design tokens — palettes (tabaco / pampa / cuero) × light/dark.
// Mirrors the prototype's ds.jsx, adapted for React Native (no oklch — RN
// doesn't parse oklch, so these are pre-converted hex approximations).

export const PALETTES = {
  tabaco: {
    name: 'Tabaco · Dorado',
    dark: {
      bg: '#1f1a14', bgGrad: '#272016', surface: '#2b241b', surface2: '#352c20',
      border: '#4a4031', text: '#f4efe6', textMute: '#a99c87', textDim: '#7d7160',
      accent: '#d8b27a', accentDeep: '#b07c45', live: '#e0533c', success: '#7fae6f',
    },
    light: {
      bg: '#f7f3ec', bgGrad: '#f1ebe0', surface: '#fffdf8', surface2: '#ece4d6',
      border: '#ddd3c2', text: '#2e261c', textMute: '#6b5f4e', textDim: '#94886f',
      accent: '#8a6529', accentDeep: '#6b4d1c', live: '#c0392b', success: '#4a7c3a',
    },
  },
  pampa: {
    name: 'Pampa · Oliva',
    dark: {
      bg: '#1c1f16', bgGrad: '#23271a', surface: '#272b1d', surface2: '#323723',
      border: '#454c33', text: '#f1f0e6', textMute: '#a7a888', textDim: '#79795f',
      accent: '#cdbb6c', accentDeep: '#8c8741', live: '#e0533c', success: '#86b46f',
    },
    light: {
      bg: '#f4f2e8', bgGrad: '#eeecdf', surface: '#fdfdf6', surface2: '#e6e6d4',
      border: '#d4d4bf', text: '#262a1c', textMute: '#5f6147', textDim: '#8a8a6f',
      accent: '#6e6a2a', accentDeep: '#54521d', live: '#c0392b', success: '#4a7c3a',
    },
  },
  cuero: {
    name: 'Cuero · Cobre',
    dark: {
      bg: '#201510', bgGrad: '#291b13', surface: '#2e2018', surface2: '#3a2a1f',
      border: '#503c2e', text: '#f5ede2', textMute: '#ad9a85', textDim: '#80705e',
      accent: '#cd8a52', accentDeep: '#a05f33', live: '#e0533c', success: '#7fae6f',
    },
    light: {
      bg: '#f5f1e9', bgGrad: '#efe9df', surface: '#fffcf7', surface2: '#ece2d3',
      border: '#ddcfbd', text: '#2c2118', textMute: '#6a5a48', textDim: '#94836d',
      accent: '#9a5a28', accentDeep: '#75421b', live: '#c0392b', success: '#4a7c3a',
    },
  },
};

export function getTheme(palette = 'tabaco', mode = 'light') {
  const pal = PALETTES[palette] || PALETTES.tabaco;
  return mode === 'dark' ? pal.dark : pal.light;
}

// Add alpha to a #hex color → #rrggbbaa
export function withAlpha(hex, alpha) {
  if (!hex || hex[0] !== '#') return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return '#' + h + a;
}

// Disciplines official colors (same as web)
export const DISCIPLINE_COLORS = {
  aparte: '#aebf1b', corral: '#00a7f7', rienda: '#f6402c', freno: '#0d121f',
  morfologia: '#9d1db2', marcha: '#049787', rodeos: '#fe9903', paleteada: '#03507e',
  incentivo: '#7271fb', tipo: '#ffcd00',
};

// PNG assets (white-on-transparent, tinted via Image tintColor)
export const DISCIPLINE_ICONS = {
  aparte: require('../assets/disc-aparte.png'),
  corral: require('../assets/disc-corral.png'),
  rienda: require('../assets/disc-rienda.png'),
  freno: require('../assets/disc-freno.png'),
  morfologia: require('../assets/disc-morfologia.png'),
  marcha: require('../assets/disc-marcha.png'),
  rodeos: require('../assets/disc-rodeos.png'),
  paleteada: require('../assets/disc-paleteada.png'),
  incentivo: require('../assets/disc-incentivo.png'),
  tipo: require('../assets/disc-tipo.png'),
};

export const HORSE_HEAD = require('../assets/horse-head.png');

export const fonts = {
  // Inter Tight for display, Roboto for body. Loaded via expo-font / @expo-google-fonts.
  display: 'InterTight_700Bold',
  displayMed: 'InterTight_600SemiBold',
  body: 'Roboto_400Regular',
  bodyMed: 'Roboto_500Medium',
  bodyBold: 'Roboto_700Bold',
  mono: 'monospace',
};
