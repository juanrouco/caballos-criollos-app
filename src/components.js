import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { withAlpha, HORSE_HEAD, fonts } from './theme';

// ── Icon: stroked line icons via react-native-svg ───────────────
export function Icon({ name, size = 20, color = '#000', stroke = 1.8 }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'search': return <Svg {...p}><Circle cx="11" cy="11" r="7" /><Path d="m20 20-3.5-3.5" /></Svg>;
    case 'bell': return <Svg {...p}><Path d="M6 8a6 6 0 0 1 12 0c0 6 2 8 2 8H4s2-2 2-8z" /><Path d="M10 21a2 2 0 0 0 4 0" /></Svg>;
    case 'arrow': return <Svg {...p}><Path d="M9 6l6 6-6 6" /></Svg>;
    case 'arrowL': return <Svg {...p}><Path d="M15 6l-6 6 6 6" /></Svg>;
    case 'arrowUR': return <Svg {...p}><Path d="M7 17 17 7M9 7h8v8" /></Svg>;
    case 'pdf': return <Svg {...p}><Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><Path d="M14 3v6h6" /><Path d="M9 13h6M9 17h4" /></Svg>;
    case 'calendar': return <Svg {...p}><Rect x="3" y="5" width="18" height="16" rx="2" /><Path d="M3 10h18M8 3v4M16 3v4" /></Svg>;
    case 'pin': return <Svg {...p}><Path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><Circle cx="12" cy="9" r="2.5" /></Svg>;
    case 'trophy': return <Svg {...p}><Path d="M8 4h8v6a4 4 0 0 1-8 0z" /><Path d="M16 6h3v2a3 3 0 0 1-3 3M8 6H5v2a3 3 0 0 0 3 3" /><Path d="M10 14h4v3h2v3H8v-3h2z" /></Svg>;
    case 'home': return <Svg {...p}><Path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" /></Svg>;
    case 'tree': return <Svg {...p}><Circle cx="6" cy="6" r="2" /><Circle cx="6" cy="18" r="2" /><Circle cx="18" cy="12" r="2" /><Path d="M8 6h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8" /><Path d="M16 12h-4" /></Svg>;
    case 'rank': return <Svg {...p}><Path d="M4 20h16M7 20V10M12 20V4M17 20v-6" /></Svg>;
    case 'play': return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M8 5v14l11-7z" /></Svg>;
    case 'x': return <Svg {...p}><Path d="M6 6l12 12M18 6L6 18" /></Svg>;
    case 'check': return <Svg {...p}><Path d="M5 12l5 5L20 7" /></Svg>;
    case 'tv': return <Svg {...p}><Rect x="3" y="5" width="18" height="13" rx="2" /><Path d="M8 21h8M12 18v3" /></Svg>;
    case 'wifiOff': return <Svg {...p}><Path d="M2 2l20 20" /><Path d="M16.7 11.1A11 11 0 0 1 19 12.6M5 12.6a11 11 0 0 1 5.2-2.4M10.7 5.1A16 16 0 0 1 22.6 9M1.4 9a16 16 0 0 1 4.7-2.9M8.5 16.1a6 6 0 0 1 7 0" /><Path d="M12 20h.01" /></Svg>;
    case 'filter': return <Svg {...p}><Path d="M3 5h18M6 12h12M10 19h4" /></Svg>;
    case 'refresh': return <Svg {...p}><Path d="M20 12a8 8 0 1 1-2.3-5.6" /><Path d="M20 4v3.4h-3.4" /></Svg>;
    case 'menu': return <Svg {...p}><Path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
    case 'building': return <Svg {...p}><Path d="M3 21h18M5 21V6l7-3 7 3v15" /><Path d="M9 21v-5h6v5M9 9h.01M15 9h.01M9 13h.01M15 13h.01" /></Svg>;
    case 'user': return <Svg {...p}><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></Svg>;
    case 'mail': return <Svg {...p}><Rect x="3" y="5" width="18" height="14" rx="2" /><Path d="m3 7 9 6 9-6" /></Svg>;
    default: return null;
  }
}

// ── Crest: circular badge with tinted horse-head PNG, or initials ──
export function Crest({ size = 36, color, bg, ring, horse = false, label = 'Cc' }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg, borderWidth: 1, borderColor: ring,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {horse ? (
        <Image source={HORSE_HEAD} style={{ width: size * 0.72, height: size * 0.72, tintColor: color }} resizeMode="contain" />
      ) : (
        <Text style={{ color, fontFamily: fonts.displayMed, fontSize: size * 0.42 }}>{label}</Text>
      )}
    </View>
  );
}

// ── Card ─────────────────────────────────────────────────────────
export function Card({ children, t, style }) {
  return (
    <View style={[{
      backgroundColor: t.surface, borderRadius: 14,
      borderWidth: 1, borderColor: t.border, overflow: 'hidden',
    }, style]}>
      {children}
    </View>
  );
}

// ── Medal: gold seal with check ──────────────────────────────────
export function Medal({ size = 22, t }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="check" size={size * 0.55} color={t.bg} stroke={3} />
    </View>
  );
}

// ── Divider ──────────────────────────────────────────────────────
export function Divider({ t, style }) {
  return <View style={[{ height: 1, backgroundColor: t.border }, style]} />;
}

// ── SectionLabel ─────────────────────────────────────────────────
export function SectionLabel({ children, t, style }) {
  return (
    <Text style={[{
      fontFamily: fonts.bodyBold, fontSize: 11, color: t.textMute,
      letterSpacing: 1.6, textTransform: 'uppercase',
      paddingHorizontal: 20, marginBottom: 12,
    }, style]}>
      {children}
    </Text>
  );
}

export const F = fonts;
