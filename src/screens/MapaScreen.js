import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { Icon, Divider, F } from '../components';
import { withAlpha } from '../theme';
import { fetchDelegaciones, mapDelegacion } from '../api';

// Contorno simplificado de Argentina (placeholder) en el viewBox de MAP_VB. Se
// puede reemplazar por el SVG oficial de la ACCC sin tocar el resto: sólo hay
// que reubicar los marcadores (MARKERS) sobre el nuevo contorno.
const MAP_VB = { w: 240, h: 470 };
const AR_OUTLINE =
  'M70 34 L92 24 L150 30 L176 44 L196 74 L178 92 L188 112 L182 150 L190 200 ' +
  'L196 236 L182 256 L170 250 L166 300 L152 322 L150 360 L132 386 L124 420 ' +
  'L110 444 L96 466 L84 436 L74 384 L62 320 L56 258 L52 198 L56 150 L62 92 L66 52 Z';

// Posición de cada marcador (número romano) sobre el contorno, en coords del
// viewBox. Es geometría de UI (estable); los datos (delegado, zona) vienen del
// endpoint y se cruzan por `romano`.
const MARKERS = [
  { romano: 'I',    x: 92,  y: 80 },
  { romano: 'II',   x: 146, y: 72 },
  { romano: 'III',  x: 172, y: 112 },
  { romano: 'IV',   x: 74,  y: 182 },
  { romano: 'V',    x: 106, y: 152 },
  { romano: 'VI',   x: 138, y: 128 },
  { romano: 'VII',  x: 118, y: 192 },
  { romano: 'VIII', x: 158, y: 168 },
  { romano: 'IX',   x: 166, y: 198 },
  { romano: 'X',    x: 138, y: 228 },
  { romano: 'XI',   x: 92,  y: 254 },
  { romano: 'XII',  x: 98,  y: 208 },
  { romano: 'XIII', x: 96,  y: 382 },
];

// Sección Mapa ACCC: mapa de Argentina con las delegaciones como marcadores
// numerados. Al tocar un marcador (o una fila de la lista) se resalta y se
// muestra la delegación + su delegado. Los datos vienen de GET /delegaciones.
// Se monta como overlay del menú lateral → recibe t / topInset / onBack.
export default function MapaScreen({ t, topInset, onBack }) {
  const { width } = useWindowDimensions();
  const [dels, setDels] = React.useState(null); // null=cargando, []=vacío/error
  const [error, setError] = React.useState(false);
  const [selected, setSelected] = React.useState(null); // romano seleccionado

  React.useEffect(() => {
    let cancelled = false;
    setDels(null); setError(false);
    fetchDelegaciones()
      .then((r) => { if (!cancelled) setDels((r.data || []).map(mapDelegacion)); })
      .catch(() => { if (!cancelled) { setError(true); setDels([]); } });
    return () => { cancelled = true; };
  }, []);

  const byRomano = React.useMemo(() => {
    const m = {};
    (dels || []).forEach((d) => { (m[d.romano] = m[d.romano] || []).push(d); });
    return m;
  }, [dels]);

  const selectedDels = selected ? (byRomano[selected] || []) : [];

  const mapW = Math.min(width - 40, 300);
  const mapH = (mapW * MAP_VB.h) / MAP_VB.w;
  const R = 12; // radio del marcador en coords del viewBox

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: topInset }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <TouchableOpacity onPress={onBack} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: t.text, flex: 1 }}>Mapa ACCC</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Mapa con marcadores */}
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Svg width={mapW} height={mapH} viewBox={`0 0 ${MAP_VB.w} ${MAP_VB.h}`}>
            <Path d={AR_OUTLINE} fill={t.surface2} stroke={withAlpha(t.accent, 0.5)} strokeWidth={1.4} strokeLinejoin="round" />
            {MARKERS.map((mk) => {
              const on = selected === mk.romano;
              return (
                <G key={mk.romano} onPress={() => setSelected(mk.romano)} accessibilityLabel={`Delegación ${mk.romano}`}>
                  <Circle cx={mk.x} cy={mk.y} r={on ? R + 2 : R} fill={on ? t.accent : t.bg} stroke={on ? t.accent : t.text} strokeWidth={1.6} />
                  <SvgText x={mk.x} y={mk.y + 3.5} fontSize={9.5} fontWeight="bold" fill={on ? t.bg : t.text} textAnchor="middle">{mk.romano}</SvgText>
                </G>
              );
            })}
          </Svg>
          <Text style={{ fontSize: 11.5, color: t.textMute, marginTop: 4 }}>Tocá una delegación en el mapa</Text>
        </View>

        {/* Detalle de la delegación seleccionada */}
        {selectedDels.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 6, marginBottom: 4 }}>
            <View style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: withAlpha(t.accent, 0.5), padding: 16 }}>
              {selectedDels.map((d, i) => (
                <View key={i} style={{ marginTop: i === 0 ? 0 : 14 }}>
                  <Text style={{ fontSize: 11, color: t.accent, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: F.bodyBold }}>{d.titulo || `Delegación ${d.romano}`}</Text>
                  {!!d.delegado && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <Icon name="user" size={15} color={t.textMute} />
                      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 16, color: t.text }}>{d.delegado}</Text>
                    </View>
                  )}
                  {!!d.email && (
                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${d.email}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <Icon name="mail" size={14} color={t.accent} />
                      <Text style={{ flex: 1, fontSize: 13, color: t.accent }}>{d.email}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Estado de carga / listado completo */}
        {dels === null ? (
          <View style={{ paddingTop: 24, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>
        ) : dels.length === 0 ? (
          <View style={{ paddingHorizontal: 40, paddingTop: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>
              {error ? 'No se pudieron cargar las delegaciones.' : 'No hay delegaciones para mostrar.'}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 18 }}>
            <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F.bodyBold, paddingHorizontal: 20, marginBottom: 4 }}>Delegaciones</Text>
            {dels.map((d, i) => {
              const on = selected === d.romano;
              return (
                <View key={`${d.romano}-${i}`}>
                  <TouchableOpacity onPress={() => setSelected(d.romano)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 20, backgroundColor: on ? withAlpha(t.accent, 0.08) : 'transparent' }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.4, borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: on ? t.bg : t.textMute }}>{d.romano}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={1}>{d.titulo || `Delegación ${d.romano}`}</Text>
                      {!!d.delegado && <Text style={{ fontSize: 12, color: t.textMute, marginTop: 2 }} numberOfLines={1}>{d.delegado}</Text>}
                    </View>
                  </TouchableOpacity>
                  {i < dels.length - 1 && <Divider t={t} style={{ marginLeft: 20 }} />}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
